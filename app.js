(function () {
  const model = window.CPGModel;

  if (!model) {
    return;
  }

  const baseForm = document.getElementById("base-form");
  const scenarioEditor = document.getElementById("scenario-editor");
  const addScenarioBtn = document.getElementById("add-scenario-btn");
  const runBtn = document.getElementById("run-btn");
  const warningsContainer = document.getElementById("warnings-container");
  const errorEl = document.getElementById("error");
  const resultsBody = document.getElementById("results-body");
  const summaryCards = document.getElementById("summary-cards");

  const fields = [
    { key: "orders", label: "Orders", step: "1" },
    { key: "price", label: "Price ($)", step: "0.01" },
    { key: "cogs", label: "COGS ($)", step: "0.01" },
    { key: "cac", label: "CAC ($)", step: "0.01" },
    { key: "repeatRate", label: "Repeat Rate", step: "0.01", min: "0", max: "0.99" }
  ];

  function formatMoney(value) {
    return `$${Number(value).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    })}`;
  }

  function formatRatio(value) {
    return `${Number(value).toFixed(2)}x`;
  }

  function parseMaybeNumber(value) {
    if (value === "") return undefined;
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : undefined;
  }

  function extractScenarioRows() {
    const rows = Array.from(scenarioEditor.querySelectorAll(".scenario-row"));

    return rows.map((row, index) => {
      const nameValue = row.querySelector('[data-key="name"]').value.trim();
      const changes = {};

      fields.forEach((field) => {
        const fieldInput = row.querySelector(`[data-key="${field.key}"]`);
        const parsed = parseMaybeNumber(fieldInput.value.trim());
        if (parsed !== undefined) {
          changes[field.key] = parsed;
        }
      });

      return {
        name: nameValue || `Scenario ${index + 1}`,
        changes
      };
    });
  }

  function getTagClass(recommendation) {
    if (recommendation === "Scale ads") return "ok";
    if (recommendation === "Losing money") return "bad";
    return "warn";
  }

  function getBaseInput() {
    const values = {};
    fields.forEach((field) => {
      const input = document.getElementById(`field-${field.key}`);
      values[field.key] = Number(input.value);
    });
    return values;
  }

  function validateAssumptions(baseInput, scenarios) {
    const warnings = [];

    // Validate base inputs
    if (baseInput.price <= 0) {
      warnings.push("Price must be greater than 0 for revenue calculation");
    }
    if (baseInput.cogs < 0) {
      warnings.push("COGS cannot be negative");
    }
    if (baseInput.price > 0 && baseInput.cogs >= baseInput.price) {
      warnings.push(`COGS ($${baseInput.cogs.toFixed(2)}) exceeds Price ($${baseInput.price.toFixed(2)}) — negative margin`);
    }
    if (baseInput.cac < 0) {
      warnings.push("CAC cannot be negative");
    }
    if (baseInput.repeatRate < 0 || baseInput.repeatRate >= 1) {
      warnings.push(`Repeat Rate (${(baseInput.repeatRate * 100).toFixed(0)}%) should be between 0 and 99%`);
    }

    // Validate scenario overrides
    scenarios.forEach((scenario, index) => {
      const scenarioLabel = scenario.name || `Scenario ${index + 1}`;
      const mergedInput = { ...baseInput, ...scenario.changes };

      if (mergedInput.price > 0 && mergedInput.cogs >= mergedInput.price) {
        warnings.push(`[${scenarioLabel}] COGS exceeds Price — negative margin`);
      }
      if (mergedInput.cac < 0) {
        warnings.push(`[${scenarioLabel}] CAC cannot be negative`);
      }
      if (mergedInput.repeatRate < 0 || mergedInput.repeatRate >= 1) {
        warnings.push(`[${scenarioLabel}] Repeat Rate should be between 0 and 99%`);
      }
    });

    return warnings;
  }

  function renderValidationWarnings(warnings) {
    if (!warnings.length) {
      warningsContainer.style.display = "none";
      warningsContainer.innerHTML = "";
      return;
    }

    warningsContainer.innerHTML = "";
    warnings.forEach((warning) => {
      const item = document.createElement("div");
      item.className = "warning-item";
      item.textContent = warning;
      warningsContainer.appendChild(item);
    });
    warningsContainer.style.display = "grid";
  }

  function updateValidationWarnings() {
    const base = getBaseInput();
    const scenarios = extractScenarioRows();
    renderValidationWarnings(validateAssumptions(base, scenarios));
  }

  function renderSummary(entries) {
    if (!entries.length) {
      summaryCards.innerHTML = "";
      return;
    }

    const sortedByProfit = [...entries].sort((a, b) => b.result.totalProfit - a.result.totalProfit);
    const winner = sortedByProfit[0];
    const averageProfit = entries.reduce((sum, item) => sum + item.result.totalProfit, 0) / entries.length;
    const scaleCount = entries.filter((item) => item.recommendation === "Scale ads").length;

    summaryCards.innerHTML = `
      <article class="card">
        <h3>Top Profit Scenario</h3>
        <p>${winner.name}</p>
      </article>
      <article class="card">
        <h3>Average Profit</h3>
        <p>${formatMoney(averageProfit)}</p>
      </article>
      <article class="card">
        <h3>Scale Signals</h3>
        <p>${scaleCount}/${entries.length}</p>
      </article>
    `;
  }

  function renderTable(entries) {
    if (!entries.length) {
      resultsBody.innerHTML = "";
      return;
    }

    resultsBody.innerHTML = entries
      .map((entry) => {
        const ratio = entry.input.cac === 0 ? Infinity : entry.result.ltv / entry.input.cac;
        const ratioText = Number.isFinite(ratio) ? formatRatio(ratio) : "N/A";

        return `
          <tr>
            <td>${entry.name}</td>
            <td>${formatMoney(entry.result.totalRevenue)}</td>
            <td>${formatMoney(entry.result.totalProfit)}</td>
            <td>${formatMoney(entry.result.ltv)}</td>
            <td>${formatMoney(entry.input.cac)}</td>
            <td>${ratioText}</td>
            <td><span class="tag ${getTagClass(entry.recommendation)}">${entry.recommendation}</span></td>
          </tr>
        `;
      })
      .join("");
  }

  function run() {
    errorEl.textContent = "";
    warningsContainer.innerHTML = "";
    warningsContainer.style.display = "none";

    try {
      const base = getBaseInput();
      const scenarios = extractScenarioRows();
      if (!scenarios.length) {
        throw new Error("Add at least one scenario before running analysis.");
      }

      const warnings = validateAssumptions(base, scenarios);
      renderValidationWarnings(warnings);

      const entries = model.runScenarios(base, scenarios, { log: false });
      renderSummary(entries);
      renderTable(entries);
    } catch (error) {
      errorEl.textContent = error.message;
      summaryCards.innerHTML = "";
      resultsBody.innerHTML = "";
      warningsContainer.style.display = "none";
    }
  }

  function renderBaseForm() {
    baseForm.innerHTML = fields
      .map(
        (field) => `
        <label for="field-${field.key}">
          ${field.label}
          <input
            id="field-${field.key}"
            type="number"
            step="${field.step}"
            value="${model.BASELINE[field.key]}"
            ${field.min ? `min="${field.min}"` : ""}
            ${field.max ? `max="${field.max}"` : ""}
          />
        </label>
      `
      )
      .join("");
  }

  function createFieldInput(field, value) {
    const minAttr = field.min ? `min="${field.min}"` : "";
    const maxAttr = field.max ? `max="${field.max}"` : "";
    const safeValue = value === undefined ? "" : String(value);

    return `
      <label>
        <span class="field-label">${field.label}</span>
        <input
          type="number"
          step="${field.step}"
          ${minAttr}
          ${maxAttr}
          data-key="${field.key}"
          value="${safeValue}"
          placeholder="inherit"
        />
      </label>
    `;
  }

  function createScenarioRow(scenario = {}) {
    const row = document.createElement("article");
    row.className = "scenario-row";
    const scenarioName = scenario.name || "";
    const changes = scenario.changes || {};

    row.innerHTML = `
      <div class="scenario-grid">
        <label>
          <span class="field-label">Scenario Name</span>
          <input type="text" data-key="name" value="${scenarioName}" placeholder="Scenario label" />
        </label>
        ${fields.map((field) => createFieldInput(field, changes[field.key])).join("")}
        <button type="button" class="secondary" data-action="remove">Remove</button>
      </div>
    `;

    const removeButton = row.querySelector('[data-action="remove"]');
    removeButton.addEventListener("click", () => {
      row.remove();
      updateValidationWarnings();
    });

    return row;
  }

  function initializeScenarios() {
    scenarioEditor.innerHTML = "";
    model.DEFAULT_SCENARIOS.forEach((scenario) => {
      scenarioEditor.appendChild(createScenarioRow(scenario));
    });
  }

  addScenarioBtn.addEventListener("click", () => {
    scenarioEditor.appendChild(createScenarioRow());
    updateValidationWarnings();
  });
  runBtn.addEventListener("click", run);
  baseForm.addEventListener("input", updateValidationWarnings);
  scenarioEditor.addEventListener("input", updateValidationWarnings);
  renderBaseForm();
  initializeScenarios();
  run();
})();
