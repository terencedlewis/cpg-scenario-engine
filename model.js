// CPG Scenario Engine — Baseline Model

// Minimum LTV:CAC ratio required to recommend scaling ad spend
const MIN_LTV_CAC_RATIO = 1.8;

const BASELINE = {
  orders: 500,       // new customers per month
  price: 12,         // selling price per unit ($)
  cogs: 4,           // cost of goods per unit ($)
  cac: 8,            // customer acquisition cost per new customer ($)
  repeatRate: 0.3    // repeat purchase rate (30%)
};

const DEFAULT_SCENARIOS = [
  {
    name: "Baseline",
    changes: {}
  },
  {
    name: "High CAC (ads inefficient)",
    changes: { cac: 12 }
  },
  {
    name: "Lower COGS (better supplier)",
    changes: { cogs: 3 }
  },
  {
    name: "Higher Price",
    changes: { price: 14 }
  },
  {
    name: "Better Retention",
    changes: { repeatRate: 0.5 }
  },
  {
    name: "Viral Growth",
    changes: { orders: 2000, cac: 6 }
  }
];

function toFiniteNumber(value, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function sanitizeInput(input = {}) {
  const merged = { ...BASELINE, ...(input || {}) };
  const orders = Math.max(0, toFiniteNumber(merged.orders, BASELINE.orders));
  const price = Math.max(0, toFiniteNumber(merged.price, BASELINE.price));
  const cogs = Math.max(0, toFiniteNumber(merged.cogs, BASELINE.cogs));
  const cac = Math.max(0, toFiniteNumber(merged.cac, BASELINE.cac));
  const repeatRate = Math.min(
    0.99,
    Math.max(0, toFiniteNumber(merged.repeatRate, BASELINE.repeatRate))
  );

  return { orders, price, cogs, cac, repeatRate };
}

function runModel(input) {
  const normalized = sanitizeInput(input);
  const { orders, price, cogs, cac, repeatRate } = normalized;

  const totalOrders = orders * (1 + repeatRate);
  const totalRevenue = totalOrders * price;
  const totalCogs = totalOrders * cogs;
  const marketingCost = orders * cac;
  const totalProfit = totalRevenue - totalCogs - marketingCost;
  const ltv = (price - cogs) / (1 - repeatRate);

  return {
    ...normalized,
    totalOrders,
    totalRevenue,
    totalCogs,
    marketingCost,
    totalProfit,
    ltv
  };
}

function getRecommendation({ totalProfit, ltv, cac }) {
  if (totalProfit <= 0) return "Losing money";
  if (ltv >= MIN_LTV_CAC_RATIO * cac) return "Scale ads";
  return "Weak retention";
}

function evaluateScenario(base, changes = {}, name = "Scenario") {
  const input = sanitizeInput({ ...base, ...changes });
  const result = runModel(input);
  const recommendation = getRecommendation({
    totalProfit: result.totalProfit,
    ltv: result.ltv,
    cac: input.cac
  });

  return {
    name,
    input,
    recommendation,
    result
  };
}

// Scenario Runner
function runScenarios(base, scenarios = DEFAULT_SCENARIOS, options = {}) {
  const { log = false } = options;
  const results = scenarios.map((scenario, index) => {
    const name = scenario && scenario.name ? scenario.name : `Scenario ${index + 1}`;
    const changes = scenario && scenario.changes ? scenario.changes : {};
    return evaluateScenario(base, changes, name);
  });

  if (log) {
    results.forEach((entry) => {
      console.log(`\n=== ${entry.name} ===`);
      console.log(`Revenue: $${entry.result.totalRevenue.toFixed(0)}`);
      console.log(`Profit: $${entry.result.totalProfit.toFixed(0)}`);
      console.log(`LTV: $${entry.result.ltv.toFixed(2)}`);
      console.log(`→ ${entry.recommendation}`);
    });
  }

  return results;
}

// CAC Sensitivity Test
function testCACRange(base, options = {}) {
  const { min = 5, max = 15, step = 1, log = false } = options;
  const series = [];

  for (let cac = min; cac <= max; cac += step) {
    const result = runModel({ ...base, cac });
    series.push({ cac, totalProfit: result.totalProfit });
  }

  if (log) {
    console.log("\n=== CAC Sensitivity ===");
    series.forEach((point) => {
      console.log(`CAC: ${point.cac} → Profit: $${point.totalProfit.toFixed(0)}`);
    });
  }

  return series;
}

const API = {
  MIN_LTV_CAC_RATIO,
  BASELINE,
  DEFAULT_SCENARIOS,
  sanitizeInput,
  runModel,
  getRecommendation,
  evaluateScenario,
  runScenarios,
  testCACRange
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = API;
}

if (typeof window !== "undefined") {
  window.CPGModel = API;
}

if (typeof require !== "undefined" && require.main === module) {
  runScenarios(BASELINE, DEFAULT_SCENARIOS, { log: true });
  testCACRange(BASELINE, { log: true });
}
