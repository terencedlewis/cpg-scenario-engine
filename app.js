(function () {
  const model = window.CPGModel;

  if (!model) {
    return;
  }

  const baseForm = document.getElementById("base-form");
  const scenarioEditor = document.getElementById("scenario-editor");
  const addScenarioBtn = document.getElementById("add-scenario-btn");
  const runBtn = document.getElementById("run-btn");
  const exportBtn = document.getElementById("export-btn");
  const errorEl = document.getElementById("error");
  const resultsBody = document.getElementById("results-body");
  const summaryCards = document.getElementById("summary-cards");
  
  let lastEntries = [];

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

  function generateCSV(entries) {
    const headers = ["Scenario", "Revenue", "Profit", "LTV", "CAC", "LTV:CAC", "Recommendation"];
    const rows = entries.map((entry) => {
      const ratio = entry.input.cac === 0 ? "Infinity" : (entry.result.ltv / entry.input.cac).toFixed(2);
      return [
        escapeCSV(entry.name),
        entry.result.totalRevenue.toFixed(2),
        entry.result.totalProfit.toFixed(2),
        entry.result.ltv.toFixed(2),
        entry.input.cac.toFixed(2),
        ratio,
        entry.recommendation
      ];
    });
    
    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(","))
    ].join("\n");
    
    return csvContent;
  }

  function escapeCSV(value) {
    const stringValue = String(value);
    if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  }

  function triggerDownload(csvString, filename) {
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
      exportBtn.disabled = true;
      return;
    }

    lastEntries = entries;
    exportBtn.disabled = false;

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

    try {
      const base = getBaseInput();
      const scenarios = extractScenarioRows();
      if (!scenarios.length) {
        throw new Error("Add at least one scenario before running analysis.");
      }
      const entries = model.runScenarios(base, scenarios, { log: false });
      renderSummary(entries);
      renderTable(entries);
    } catch (error) {
      errorEl.textContent = error.message;
      summaryCards.innerHTML = "";
      resultsBody.innerHTML = "";
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
  });
  runBtn.addEventListener("click", run);
  exportBtn.addEventListener("click", () => {
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];
    const filename = `cpg-scenarios-${dateStr}.csv`;
    const csvContent = generateCSV(lastEntries);
    triggerDownload(csvContent, filename);
  });
  renderBaseForm();
  initializeScenarios();
  run();
})();
