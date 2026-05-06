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

function runModel(input) {
  const { orders, price, cogs, cac, repeatRate } = input;

  const totalOrders = orders * (1 + repeatRate);
  const totalRevenue = totalOrders * price;
  const totalCogs = totalOrders * cogs;
  const marketingCost = orders * cac;
  const totalProfit = totalRevenue - totalCogs - marketingCost;
  const ltv = (price - cogs) / (1 - repeatRate);

  return { totalRevenue, totalProfit, ltv };
}

function getRecommendation({ totalProfit, ltv, cac }) {
  if (totalProfit <= 0) return "❌ Losing money";
  if (ltv > MIN_LTV_CAC_RATIO * cac) return "✅ Scale ads";
  return "⚠️ Weak retention";
}

// Scenario Runner

function runScenarios(base) {
  const scenarios = [
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

  scenarios.forEach((scenario) => {
    const input = { ...base, ...scenario.changes };
    const result = runModel(input);

    const recommendation = getRecommendation({
      ...result,
      cac: input.cac
    });

    console.log(`\n=== ${scenario.name} ===`);
    console.log(`Revenue: $${result.totalRevenue.toFixed(0)}`);
    console.log(`Profit: $${result.totalProfit.toFixed(0)}`);
    console.log(`LTV: $${result.ltv.toFixed(2)}`);
    console.log(`→ ${recommendation}`);
  });
}

// CAC Sensitivity Test

function testCACRange(base) {
  console.log("\n=== CAC Sensitivity ===");

  for (let cac = 5; cac <= 15; cac += 1) {
    const result = runModel({ ...base, cac });

    console.log(
      `CAC: ${cac} → Profit: $${result.totalProfit.toFixed(0)}`
    );
  }
}

if (require.main === module) {
  runScenarios(BASELINE);
  testCACRange(BASELINE);
}
