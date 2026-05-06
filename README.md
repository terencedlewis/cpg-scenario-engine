# cpg-scenario-engine

CPG Scenario Engine is a lightweight decision-support tool for consumer packaged goods teams to test pricing, CAC, retention, and unit economics scenarios before committing spend.

## Product Description

This product helps founders, operators, and growth managers answer one core question quickly: should we scale, optimize, or pause based on current unit economics?

The engine computes key metrics from baseline assumptions and scenario overrides:

- Revenue
- Profit
- LTV
- LTV:CAC strength signal
- Recommendation (`Scale ads`, `Weak retention`, `Losing money`)

It ships with:

- A Node.js CLI workflow for terminal-first analysis
- A browser UI for editable scenario rows and side-by-side comparison

## Epic

Epic: Build a CPG Financial Scenario Engine that turns baseline assumptions into actionable go/no-go ad spend decisions across multiple what-if scenarios.

Epic Outcome:

- Decision makers can test multiple CAC/price/retention assumptions in minutes.
- Teams can compare upside, downside, and break behavior without spreadsheet complexity.
- Recommendations are standardized around profitability and LTV:CAC criteria.

## Feature Evolution

### Old Features (Initial Version)

- Baseline financial model in `model.js`
- Hardcoded scenario execution from CLI
- CAC sensitivity sweep in CLI output
- Recommendation logic based on profitability and LTV:CAC threshold

### New Features (Current Version)

- Shared model API usable in Node and browser (`module.exports` + `window.CPGModel`)
- Input sanitization for safer scenario execution
- Reusable scenario runner returning structured arrays (not only logs)
- Browser UI with:
	- Base input controls
	- Add/remove scenario rows
	- Per-field overrides with blank-as-inherit behavior
	- Highlights and tabular comparison rendering
- Updated documentation for CLI and UI workflows

## Full Feature List

- Baseline assumptions object (`BASELINE`)
- Default scenario pack (`DEFAULT_SCENARIOS`)
- Scenario evaluation primitives (`runModel`, `evaluateScenario`, `runScenarios`)
- CAC sensitivity utility (`testCACRange`)
- Recommendation engine (`getRecommendation`)
- CLI execution mode (direct script run)
- Browser rendering mode (static files)

## User Stories

- As a growth manager, I want to change CAC assumptions quickly so that I can estimate when paid acquisition becomes unprofitable.
- As a founder, I want to compare retention and pricing scenarios so that I can decide whether to scale ad spend.
- As a finance operator, I want repeatable CLI output so that I can run scenario checks in a terminal workflow.
- As a non-technical stakeholder, I want a visual UI so that I can test assumptions without editing code.
- As a product team member, I want shared model logic between CLI and UI so that results are consistent across channels.

## CLI Documentation

### Prerequisites

- Node.js 18+ recommended

### Run Default CLI Report

```bash
node model.js
```

This runs:

- Default scenario analysis (`runScenarios` with logging on)
- CAC sensitivity range report (`testCACRange` with logging on)

### Use CLI as a Module

Create a script (example: `examples/custom-cli.js`) and import the model API:

```js
const {
	BASELINE,
	runScenarios,
	testCACRange
} = require("./model");

const scenarios = [
	{ name: "Low CAC", changes: { cac: 6 } },
	{ name: "Mid CAC", changes: { cac: 8 } },
	{ name: "High CAC", changes: { cac: 12 } }
];

const results = runScenarios(BASELINE, scenarios, { log: false });
console.table(
	results.map((r) => ({
		scenario: r.name,
		revenue: r.result.totalRevenue,
		profit: r.result.totalProfit,
		ltv: r.result.ltv,
		recommendation: r.recommendation
	}))
);

const cacSeries = testCACRange(BASELINE, { min: 5, max: 15, step: 1, log: false });
console.table(cacSeries);
```

Then run:

```bash
node examples/custom-cli.js
```

### Key CLI API Methods

- `runModel(input)`
- `evaluateScenario(base, changes, name)`
- `runScenarios(base, scenarios, { log })`
- `testCACRange(base, { min, max, step, log })`
- `getRecommendation({ totalProfit, ltv, cac })`

## UI Documentation

Serve the repository with any static server, then open `index.html`.

Example:

```bash
python3 -m http.server 8080
```

Open:

`http://localhost:8080`

## Roadmap Ideas

- Export scenario results to CSV
- Scenario presets by channel (DTC vs marketplace)
- Time-series projections (monthly growth, retention curves)
- Validation diagnostics for invalid economic assumptions
