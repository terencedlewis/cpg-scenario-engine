const { BASELINE, runScenarios, testCACRange } = require("../model");

const scenarios = [
  { name: "Low CAC", changes: { cac: 6 } },
  { name: "Mid CAC", changes: { cac: 8 } },
  { name: "High CAC", changes: { cac: 12 } }
];

const results = runScenarios(BASELINE, scenarios, { log: false });

console.log("\n=== Scenario Comparison ===");
console.table(
  results.map((entry) => ({
    scenario: entry.name,
    revenue: Number(entry.result.totalRevenue.toFixed(2)),
    profit: Number(entry.result.totalProfit.toFixed(2)),
    ltv: Number(entry.result.ltv.toFixed(2)),
    recommendation: entry.recommendation
  }))
);

const cacSeries = testCACRange(BASELINE, { min: 5, max: 15, step: 1, log: false });

console.log("\n=== CAC Sensitivity ===");
console.table(
  cacSeries.map((point) => ({
    cac: point.cac,
    profit: Number(point.totalProfit.toFixed(2))
  }))
);
