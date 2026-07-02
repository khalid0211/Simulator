# Portfolio Simulator — Full Specification

**Version:** 5.0
**Date:** July 2026
**Supersedes:** v4.0 (June 2026)
**Purpose:** Training tool for portfolio managers to develop skills in project selection, funding decisions, and portfolio optimisation over a 60-month simulation horizon.

---

## 0. Change Log

### v5.0 — July 2026 (this version)

Public-sector theming, two new ongoing-cost/benefit systems tied to completed projects, and a broad UI/reporting overhaul. All changes are additive and backward-compatible with v4 runs that have neither system enabled.

| # | Area | Change |
|---|---|---|
| 1 | Project generation (Section 3.1) | Projects are no longer generic corporate titles. Each is generated from one of 3 real-world public-sector categories (Physical Infrastructure & Transport, Social Sectors, Agriculture/Irrigation/Resources) split into 12 subcategories, each with its own preset Annual Recurring Cost rate and Benefit Unit intensity. Titles are built from a modifier + subcategory noun phrase. |
| 2 | Annual Recurring Cost / "Integrated Budget Wallet" (Section 4.4, 5.9, 7) | Completed projects now generate an ongoing monthly operating cost (ARC), drawn from the same budget, starting one month after completion and stepping up with inflation once per elapsed year. Toggleable at setup; a funding-shortfall lever lets the user cut a project's ARC funding 30% (twice, permanently, at −2 pts each), after which the only remaining lever is to abandon the asset outright. |
| 3 | Social Benefits / Benefit Units (Section 4.5, 5.9, 9.1) | Completed projects generate Benefit Units (BU)/month, an abstract social-value measure, starting one month after completion. The BU/month rate is preset per project (category × BAC × risk) and visible before selection. Reducing ARC funding cuts benefits to 40% of normal; a fully abandoned (ARC-cut-off) project generates *negative* benefits at 1.5× its rate for the rest of the run. Adds a 4th, conditional scoring component. |
| 4 | Funding frequency (Section 2.1, 4.1) | Release cadence is now a selectable parameter — Monthly, Quarterly (default), Bi-annual, or Annual — independent of the difficulty preset. The release schedule generalises from a fixed 20 quarters to `60 / frequency` tranches. |
| 5 | Insolvency / early termination (Section 7.5, 9.4) | If a funding shortfall cannot be resolved by any lever (slow, suspend, abandon, ARC cuts), the user may end the run early from the Shortfall panel. This carries a flat −10 point penalty and is reported distinctly in the debrief. |
| 6 | Portfolio Status Report (Section 9.6) | No longer calls an external LLM API. Fully rule-based, deterministic, and generated client-side from the live simulation state — same 7-section PMO narrative structure as before, now with zero network dependency. |
| 7 | Performance Assessment (Section 9.5) | New rule-based, personalised end-of-run coaching panel (replaces/extends the narrative report for the debrief use case): strengths, areas to improve, and a single "key insight," driven by ~12 independent condition checks against the run's decisions and outcomes. |
| 8 | Leaderboard (Section 9.7) | Every completed run is saved to a local leaderboard (browser storage), filterable by difficulty preset, sorted by score, with medal styling for the top 3 and highlighting of the just-completed run. |
| 9 | Header & KPI redesign (Section 10.1, 10.3) | The header's thin progress bar is replaced by a 20-segment quarter timeline with hover detail and a highlighted "danger zone" (final 4 quarters). A persistent KPI strip (Funding Efficiency, Strategic Alignment, Completed, plus ARC Exposure and/or Social Benefits when enabled) sits beneath the header at all times. The Advance button previews next-month demand/available/net on hover, and its color reflects funding pressure. |
| 10 | Project Preview Modal (Section 10.4) | Before adding a project, the user can preview its cash-flow impact: a side-by-side chart of required-vs-available funds with and without the project, plus key stats (BAC, duration, alignment, ARC rate, benefit rate). |
| 11 | Funds tab (Section 10.3) | New bar-chart dashboard tab (Funds Available vs Funds Used vs ARC) alongside the existing Cash Flow line chart. |
| 12 | Top Picks strip (Section 10.2) | A compact "Top Picks" section surfaces the top 3 affordable, finishable, highest-alignment available projects for one-click add/preview, positioned between Active and Pending/Suspended. |
| 13 | Card field additions (Section 3.1, 10.2, 10.4) | Available/Active/Preview cards now show category/subcategory, ARC rate, and (when Social Benefits is on) BU/month rate. Completed project cards show live ARC and benefit status with a Restore-funding action. |

### v4.0 — June 2026

Eight configuration parameters added to the setup screen, each fully wired into the engine. Two new UI features added.

| # | Area | Change |
|---|---|---|
| 1 | Difficulty presets (Section 2.1) | Four preset tiles — Learning, Standard, Advanced, Custom — pre-fill all parameters with one click. Custom exposes all parameters individually. |
| 2 | Funding profile (Section 2.1, 4.1) | Five selectable release patterns replace the hardcoded flat schedule: Flat, S-Curve, Front-loaded, Back-loaded, Volatile. The engine pre-computes a release schedule at simulation start. |
| 3 | Budget tightness (Section 2.1, 3.2) | The hardcoded 1.5× scarcity divisor is now a user-selectable parameter (1.2×, 1.5×, 1.8×, 2.2×), controlling how many projects are completable. |
| 4 | Political projects (Section 2.1, 5.7) | The user selects 0–5 mandatory projects. At simulation start, the N lowest-alignment projects are forced into Active state and are locked against abandonment until Month 24. |
| 5 | Concurrent project cap (Section 2.1, 5.2) | An optional ceiling on simultaneously Active + Pending projects. When the cap is reached, the Add button is disabled and a warning is shown. |
| 6 | Approval lag / Pending state (Section 2.1, 5.2, 5.8) | An optional delay (0–6 months) between adding a project and it beginning to draw funds. Projects in this window enter a new **Pending** state: BAC is locked at the addition-time figure, no cash is drawn, and a countdown shows in the decision panel. |
| 7 | Risk environment (Section 2.1, 8.1) | A multiplier (0.5×, 1.0×, 1.5×) scales all generated project risk factors up or down uniformly at generation time, capped at 0.40 per factor. |
| 8 | Scoring visibility (Section 2.1, 9.2, 9.3) | Two optional information restrictions: **Blind alignment** hides alignment scores in the available pool; **Blind score** hides the live projected score in the header and KPI tab. |
| 9 | Portfolio Status Report | A **Report** button in the simulation header called the Anthropic API to generate a PMO-style narrative report from the live simulation state, covering seven structured sections. *(Superseded in v5.0 — now rule-based, no API call.)* |
| 10 | Rules / How to Play modal (Section 10.9) | A **How to Play** button on the setup screen opens a six-tab reference modal covering Objective, Projects, Actions, Funding, Risk, and Scoring. |

### v3.0 — June 2026

| # | Area | Change |
|---|---|---|
| 1 | Schedule acceleration (Speed Up) | New action compresses remaining duration with a crash premium on remaining cost. |
| 2 | Hint advisor | Context-aware coaching card with six priority branches; one-tap apply for Add and Speed Up. |
| 3 | Light / dark theme | Light default; sun/moon toggle in header. |

### v2.0 — June 2026

| # | Area | Change |
|---|---|---|
| 1 | Funding shortfall | Manual resolution panel; no automatic extension. |
| 2 | Slowdown | Rebaselines over longer duration; one-time, not persistent. |
| 3 | Alignment scale | Stored as 0.20–1.00; scoring multiplies directly. |
| 4 | BAC range | Uniform $2M–$15M with 1.5× calibration. |
| 5 | Max completions | Greedy cheapest-first packing. |
| 6 | Risk milestones | Spend-based (25/50/75% of current BAC). |
| 7 | Optimal benchmark | Greedy alignment-per-dollar knapsack. |

---

## 1. Overview

The Portfolio Simulator is an interactive, browser-based training tool that places the user in the role of a public-sector portfolio manager. Over a simulated 60-month period, they select, fund, monitor, accelerate, slow, suspend, or abandon projects from a pool of 30 candidates drawn from three real-world infrastructure/social/agricultural categories — with the objective of maximising the number of strategically aligned projects delivered, the social benefits those projects go on to produce, and disciplined use of a constrained, inflating budget.

The simulation is fully configurable before each run: inflation, funding pattern and cadence, scarcity, mandatory political projects, institutional capacity constraints, approval process delays, risk environment, information transparency, and two optional "post-completion" systems — Annual Recurring Cost and Social Benefits — can all be varied, producing a wide range of training scenarios from a gentle introduction to a pressure-tested advanced exercise.

At the end of the simulation (or if it ends early in insolvency), the user receives a composite performance score, a rule-based personalised assessment, and a detailed debrief comparing their decisions against an optimal benchmark. Every run is saved to a local leaderboard for cross-session comparison.

The application is a fully client-side single-page app: no backend, no external API calls, all state held in memory and persisted via browser storage.

---

## 2. Simulation Parameters

### 2.1 Setup Screen

The setup screen presents a **difficulty preset selector**, two always-visible **toggle switches** (Integrated Budget Wallet / Social Benefits), and an expandable **Custom** configuration panel. Selecting a preset auto-fills all parameters, including whether each toggle is on, off, or locked; selecting Custom exposes every parameter individually.

#### 2.1.1 Difficulty Presets

| Preset | Inflation | Funding | Tightness | Political | Cap | Lag | Risk | Visibility | Integrated Budget Wallet (ARC) | Social Benefits |
|---|---|---|---|---|---|---|---|---|---|---|
| **Learning** | 2% | Flat | 1.2× | 0 | None | None | Calm (0.5×) | Full | **Locked off** | Off (togglable) |
| **Standard** | 3% | S-Curve | 1.5× | 2 | None | None | Normal (1.0×) | Full | On (togglable) | Off (togglable) |
| **Advanced** | 5% | Volatile | 1.8× | 4 | 8 | 2 months | Turbulent (1.5×) | Blind score | **Locked on** | **Locked on** |
| **Custom** | User-set | User-set | User-set | User-set | User-set | User-set | User-set | User-set | Off (togglable) | Off (togglable) |

Funding frequency (Section 2.1.2) is **not** part of any preset — it defaults to Quarterly and is only changed via the Custom panel, independently of whichever preset is selected.

#### 2.1.2 Individual Parameters

| Parameter | Options | Effect |
|---|---|---|
| **Run name / Player name** | Free text | Labels for the session and the leaderboard entry |
| **Inflation rate** | 0%–20% p.a. (slider, 0.5% steps) | Monthly rate derived as `(1 + annual)^(1/12) − 1` |
| **Funding profile** | Flat / S-Curve / Front-loaded / Back-loaded / Volatile | Shape of the release schedule (Section 4.1) |
| **Funding frequency** | Monthly (60 tranches) / Quarterly (20, default) / Bi-annual (10) / Annual (5) | Release cadence; the schedule has `60 / frequency` elements |
| **Budget tightness** | 1.2× / 1.5× / 1.8× / 2.2× | Divisor applied to total raw BAC; controls number of completable projects |
| **Political projects** | 0–5 (slider) | Count of mandatory low-alignment projects forced in at start (Section 5.7) |
| **Concurrent cap** | Unconstrained / 5 / 8 / 12 | Maximum simultaneous Active + Pending projects |
| **Approval lag** | None / 2 / 4 / 6 months | Delay from adding a project to it drawing funds (Section 5.8) |
| **Risk environment** | Calm (0.5×) / Normal (1.0×) / Turbulent (1.5×) | Scales all generated project risk factors at generation; individual factors capped at 0.40 |
| **Scoring visibility** | Full / Blind alignment / Blind score / Full blind | Controls which information is shown during the run (Section 9.2, 9.3) |
| **Integrated Budget Wallet (ARC)** | On / Off (locked for Learning and Advanced) | Enables ongoing Annual Recurring Cost on completed projects (Section 4.4) |
| **Social Benefits** | On / Off (locked on for Advanced only) | Enables Benefit Unit generation and its scoring component (Section 4.5) |

#### 2.1.3 Setup Screen Summary Bar

A seven-cell bar below the panel reflects the active Inflation, Funding, Cadence, Political, Risk, Wallet, and Benefits settings at a glance, updating as the user adjusts parameters.

### 2.2 Time Horizon

- **Total duration:** 60 months
- **Decision frequency:** Once per month
- **Funding release frequency:** Configurable (Section 2.1.2); defaults to once per quarter at the start of Months 1, 4, 7 … 58 (20 releases total)

---

## 3. Project Pool

### 3.1 Categories, Subcategories, and Titles

The 30 projects are drawn from **3 public-sector categories**, split into **12 subcategories**, spread as evenly as possible across the pool. Each subcategory carries a preset **ARC rate** (Section 4.4) and **Benefit Unit intensity** (Section 4.5):

| Category | Subcategory | ARC rate (of BAC, annualised) | BU intensity (BU per $1M BAC/mo) |
|---|---|---|---|
| Physical Infrastructure & Transport | Paved Roads & Highways | 5.00% | 0.8 |
| Physical Infrastructure & Transport | Feeder & Rural Roads | 10.00% | 1.0 |
| Physical Infrastructure & Transport | Buildings (Administrative) | 2.00% | 0.3 |
| Physical Infrastructure & Transport | Large-Scale Dams & Reservoirs | 1.50% | 0.6 |
| Social Sectors (Education & Health) | Primary & Secondary Schools | 19.50% | 1.6 |
| Social Sectors (Education & Health) | Polytechnic & Technical Schools | 21.00% | 1.4 |
| Social Sectors (Education & Health) | General & Tertiary Hospitals | 27.00% | 2.0 |
| Social Sectors (Education & Health) | Rural Health Centers | 49.00% | 1.8 |
| Agriculture, Irrigation & Resources | Irrigation & Drainage Systems | 3.00% | 1.1 |
| Agriculture, Irrigation & Resources | Agricultural Research & Extension | 4.75% | 0.9 |
| Agriculture, Irrigation & Resources | Livestock & Veterinary Services | 10.50% | 0.9 |
| Agriculture, Irrigation & Resources | Forestry & Watershed Development | 2.50% | 0.7 |

Each project's title is generated by combining one of 12 generic modifiers (Digital, Integrated, Provincial, Regional, Smart, Unified, Rural, Urban, National, Coastal, Metro, Strategic) with a subcategory-specific noun phrase (e.g. "Rural Health Centers" → "Rural Health Centre Network" / "Basic Health Unit Programme" / "Community Clinic Scheme"), deduplicated within a run.

### 3.2 Project Attributes

Each of the 30 projects is randomly generated at simulation start with the following attributes:

| Attribute | Range | Notes |
|---|---|---|
| Project ID | P01–P30 | Fixed identifier |
| Title | Category-derived (Section 3.1) | e.g. "Coastal Rural Health Centre Network" |
| Category / Subcategory | 1 of 3 / 1 of 12 (Section 3.1) | Drives ARC rate and BU intensity |
| Budget at Completion (BAC) | $2M–$15M (uniform) | Scaled per Section 3.3; inflates monthly while unstarted |
| Strategic Alignment Score | 0.20–1.00 (fraction) | Displayed as 20%–100%. Fixed at generation; not affected by inflation |
| Duration | 12–36 months | Baseline planned duration |
| Duration Risk Factor | 0.05–0.20 base, scaled by risk multiplier | % variation in duration at milestones; capped at 0.40 |
| Cost Risk Factor | 0.05–0.20 base, scaled by risk multiplier | % variation in BAC at milestones; capped at 0.40 |
| ARC rate | Preset per subcategory (Section 3.1) | Annual Recurring Cost as a fraction of BAC, once completed (Section 4.4) |
| Benefit Unit rate (`buRate`) | Computed (Section 4.5) | BU/month once completed and fully funded; visible before adding |

### 3.3 Budget Calibration

Raw BACs are drawn uniformly in the $2M–$15M range. The total portfolio budget is set using the **budget tightness** divisor chosen at setup:

```
Total Portfolio Budget = (Σ BAC_initial of all 30 projects) / budgetTightness
```

| Tightness | Divisor | Approx. completable projects |
|---|---|---|
| Generous | 1.2× | ~25 |
| Standard | 1.5× | ~20 |
| Tight | 1.8× | ~17 |
| Severe | 2.2× | ~14 |

**Max Possible Completions** is computed deterministically by greedy cheapest-first packing: sort all 30 projects by initial BAC ascending and count how many fit cumulatively within the total budget. This figure anchors the Delivery Score denominator (Section 9.1).

### 3.4 Inflation on Unstarted Projects

Projects not yet added to the portfolio see their BAC increase each month due to inflation:

```
BAC_month(n) = BAC_initial × (1 + monthly_inflation_rate)^n
```

where `n` is the number of months elapsed since simulation start.

---

## 4. Funding Model

### 4.1 Funding Profiles and Release Schedule

At simulation start, the engine pre-computes a release schedule of `N = 60 / fundingFrequency` elements — one amount per release period — based on the selected funding profile. The schedule is fixed for the entire run. With the default Quarterly cadence, `N = 20` and releases occur at the start of Months 1, 4, 7 … 58 (period index `qi = floor((month − 1) / fundingFrequency)`).

| Profile | Release pattern | Formula |
|---|---|---|
| **Flat** | Equal every period | `release[qi] = totalBudget / N` |
| **S-Curve** | Slow early, peaks mid-run, tapers | `weights[qi] = betaCDF((qi+1)/N) − betaCDF(qi/N)` then normalised to `totalBudget` |
| **Front-loaded** | Large early, declining each period | `weights[qi] = N − qi` then normalised |
| **Back-loaded** | Small early, growing each period | `weights[qi] = qi + 1` then normalised |
| **Volatile** | Flat ±20% random variation | `weights[qi] = uniform(0.8, 1.2)` then normalised to ensure Σ = `totalBudget` |

The Volatile profile uses the same random seed as project generation, so the release pattern is deterministic for a given run but unpredictable to the user.

The Cash Flow and Funds dashboard tabs project all 60 months using the full schedule, so upcoming shortfalls caused by back-loading, volatile dips, or a non-quarterly cadence are visible in advance.

> **Known limitation:** the header's 20-segment quarter timeline (Section 10.1) is drawn on a fixed quarterly axis regardless of the chosen funding frequency; its "next release" marker is positioned using the real cadence but the surrounding 20-box visual assumes quarters. This is cosmetic only — all cash-flow math uses the actual frequency correctly.

### 4.2 Available Balance and Carry-Forward

Unused funds carry over each release period. There is no "use it or lose it" rule.

```
Available Balance (start of period qi) = release[qi] + Unspent Carry-Forward
```

### 4.3 Inflation Adjustment on Demand

The **funding demand** for active projects in each month is adjusted upward by the cumulative inflation inflator, indexed to the global simulation month:

```
Monthly Demand (inflated) = Σ [ Project S-curve spend(month) × (1 + monthly_rate)^n ]
```

where `n` is the current global simulation month. The real cost of active projects therefore rises over time, adding pressure to start high-priority projects early.

### 4.4 Annual Recurring Cost (ARC) / "Integrated Budget Wallet"

When enabled (Section 2.1), every **completed** project generates an ongoing monthly operating cost, drawn from the same available balance as capital spend, starting **one month after completion**:

```
elapsed        = month − completionMonth                       // 1, 2, 3…
yearIdx        = floor((elapsed − 1) / 12)
ARC_full(m)    = (arcBaseBac × arcRate / 12) × (1 + annualRate)^yearIdx
```

`arcBaseBac` is the project's `bacCurrent` frozen at the moment of completion (i.e. after any cost-risk shocks, but before ARC itself). ARC therefore steps up once per elapsed year at the same inflation rate as the rest of the simulation, rather than compounding monthly. Total monthly demand for the simulation is the sum of capital-project demand (Section 4.3) plus ARC across all completed projects — both draw from the same available balance and both can trigger a shortfall (Section 7).

#### 4.4.1 Reducing ARC Funding (shortfall relief)

From the Shortfall Resolution panel (Section 7.2), the user may cut a completed project's ARC funding by 30% to relieve a cash crunch:

```
ARC_funded(m) = arcReduced ? ARC_full(m) × 0.7 : ARC_full(m)
```

- Costs a permanent **−2 score points**.
- The withheld 30% each month accumulates into an `arcBacklog` — the lump sum required to restore full funding later.
- If Social Benefits is enabled, the project's benefit generation also drops to 40% of normal for as long as it remains reduced (Section 4.5).
- **Capped at 2 reductions per project, lifetime** (restoring does not reset the count). A project reduced twice cannot be reduced a third time — the reduce button is replaced with an **Abandon** action (Section 4.4.2).

#### 4.4.2 Restoring Full Funding

From the Completed section of the decision panel, the user may repay the accumulated `arcBacklog` as a lump sum (if the available balance covers it) to restore full ARC funding and, if Benefits is on, full benefit generation. Restoring does **not** reduce the lifetime reduction count.

#### 4.4.3 Full ARC Cutoff (Abandonment of a Completed Project)

Once a project has used both of its lifetime ARC reductions, the only shortfall-relief option left for that project is to **abandon it outright**:

- The project's state changes from `completed` to `abandoned` (this reuses the abandoned-project scoring path directly — see Section 9.1).
- It permanently stops costing ARC.
- If Social Benefits is enabled, it starts generating **negative** benefits at 1.5× its normal rate for the remainder of the run (Section 4.5).
- There is no separate score-penalty constant for this action — the cost is the cascade of losing Delivery credit, having its full BAC counted as wasted spend (Efficiency), and (if enabled) ongoing negative Benefits.
- This is irreversible; there is no restore path once cut off.

### 4.5 Social Benefits (Benefit Units)

When enabled (Section 2.1), every completed project generates **Benefit Units (BU)** — an arbitrary, non-monetary measure of the social good the asset produces — starting **one month after completion**, mirroring ARC's timing exactly. This creates a deliberate tension: finishing a project earlier lets its benefits start accruing sooner, but its ARC liability also starts sooner, and a later funding shortfall can then curtail or destroy those benefits.

#### 4.5.1 Benefit Rate

Each project's BU/month rate (`buRate`) is computed once, at simulation start, and is visible to the user before selecting the project (in the Available pool table and the Project Preview modal):

```
buRate = bacInitial × BU_intensity[subCategory] × (1 + costRisk + durRisk)
```

`BU_intensity` is the subcategory table in Section 3.1. `costRisk`/`durRisk` are the project's *final*, risk-multiplier-scaled risk factors (Section 8.1) — higher-risk projects generate proportionally more BU/month, reflecting a higher-risk/higher-reward framing.

#### 4.5.2 Monthly Accrual

For every month after completion, a project accrues BU into a running total (`buCumulative`, which can go negative):

| Project state | BU this month |
|---|---|
| Completed, fully funded | `+buRate` |
| Completed, ARC-reduced (Section 4.4.1) | `+buRate × 0.4` (a 30% funding cut costs 2× that in benefits — i.e. 60% of the benefit is lost) |
| Abandoned via full ARC cutoff (Section 4.4.3) | `−buRate × 1.5`, every month for the rest of the run |

A `$/BU` social-value figure (`BU_VALUE = $0.02M per BU`) is shown alongside raw BU throughout the UI for interpretability; it is display-only and never affects the cash budget.

#### 4.5.3 Scoring

Social Benefits adds a conditional, capped scoring component (Section 9.1) based on how much of a project's *potential* benefit (had it never been cut) was actually realised:

```
potential(p, month) = buRate × max(0, month − completionMonth)     // per project, summed across all completed + cutoff-abandoned projects
benefitScore         = potential > 0 ? clamp(buCumulative_total / potential_total, 0, 1) × 15 : 0
```

This isolates "did you protect the benefits your completed assets were capable of" from "how much did you deliver" (already the Delivery score's job).

---

## 5. Project Lifecycle

### 5.1 States

| State | Description |
|---|---|
| **Available** | In the pool; not yet started. BAC inflates monthly. |
| **Pending** | Added but awaiting approval lag expiry. BAC locked at addition-time figure; no funds drawn; countdown shown in decision panel. |
| **Active** | In the portfolio; consuming funds per its (possibly rebaselined) S-curve. |
| **Suspended** | Paused by the user. No new funds consumed. Remaining cost continues to inflate. |
| **Completed** | Delivered within the 60-month window. Counts toward score; if ARC and/or Social Benefits are enabled, begins accruing cost/benefit the following month. |
| **Abandoned** | Removed from portfolio permanently. Sunk costs are lost. −2 score penalty. A completed project can also reach this state via a full ARC cutoff (Section 4.4.3), in which case it additionally begins generating negative Benefits. |
| **Expired** | Still in portfolio at month 60 (or at early insolvency termination) but not completed, including projects still Pending. −1 score penalty. |

### 5.2 Adding a Project

- The user selects a project from the Available pool or the Top Picks strip (Section 10.2) and clicks **Add to Portfolio**, optionally previewing its cash-flow impact first (Section 10.4).
- Before addition, two guards are checked:
  - **Concurrent cap:** if the count of Active + Pending projects equals the cap, the Add button is disabled and a warning is shown. The project cannot be added until another is completed, suspended, or abandoned.
  - **Affordability:** the project is greyed out if its current inflation-adjusted BAC exceeds the available balance.
- Upon addition, the project's BAC is locked at the current inflation-adjusted figure.
- If **approval lag = 0**: the project moves directly to **Active** state; S-curve is generated; risk milestones are armed; spending begins the following month.
- If **approval lag > 0**: the project moves to **Pending** state (Section 5.8); it does not draw funds until the lag expires.

### 5.3 Suspension

- The user may suspend any Active project at the start of any monthly decision.
- While suspended:
  - No funds are drawn from the portfolio.
  - The project's remaining (uncompleted) cost inflates each month at the monthly inflation rate.
  - The project's elapsed progress (% complete on the S-curve) is **frozen**.

### 5.4 Resuming a Suspended Project

- The user may resume a Suspended project at any monthly decision point.
- Upon resumption:
  - A **fixed duration penalty of 10% of remaining duration** is added (rounded up to the nearest month).
  - The project is **rebaselined** (Section 6.3): the remaining budget is re-spread over the extended remaining duration, and the project resumes Active on the new S-curve.

### 5.5 Abandonment

- The user may permanently abandon any Active or Suspended project, subject to the political lock constraint (Section 5.7), via a two-step inline confirmation ("Abandon" → "Confirm −2 pts").
- Sunk costs are not recovered.
- The project is removed from all cash flow calculations.
- Abandoned projects incur a **−2 score penalty** (Section 9.1).
- A **completed** project can also become Abandoned via a full ARC cutoff (Section 4.4.3) — see that section for the distinct consequences (no restore path, negative benefits, no separate penalty constant beyond the cascade).

### 5.6 Speed Up (Schedule Crashing) and Voluntary Slow Down

The user may accelerate or decelerate any Active project via a dedicated modal, independent of any funding shortfall.

**Speed Up** models schedule crashing — buying time by increasing resource intensity:

- The user selects a **compression percentage a** (5%–60%) via the Speed Up modal.
- The simulation applies the following and rebaselines the project (Section 6.3):

```
crash_premium          = remaining_budget × CRASH_K × a       // CRASH_K = 0.5
BAC_current           += crash_premium
new_remaining_duration = max( 1, ceil( remaining_duration × (1 − a) ) )
rebaseline( BAC_current − cumulative_spend, new_remaining_duration )
```

**Trade-offs by design.** Speed-up involves three simultaneous effects:

| Effect | Direction | Reason |
|---|---|---|
| Monthly funding demand | Increases | Larger budget spread over fewer months |
| Total project cost (BAC) | Increases | Crash premium applied to remaining budget |
| Finish date | Earlier | Fewer remaining months |

The crash premium ensures finishing early is never strictly cheaper than proceeding normally. Speed-up is **not available as a shortfall resolution lever** — it raises demand and would worsen the gap.

**Voluntary Slow Down**, via a separate modal (slider 5%–80%), lets the user proactively lower a project's monthly burn before a shortfall occurs:

```
new_remaining_duration = ceil( remaining_duration / (1 − s) )
rebaseline( remaining_budget, new_remaining_duration )
```

This is the same rebaseline mechanic used by the fixed 30% Slow lever inside the Shortfall panel (Section 7.3) — the modal simply exposes it with an adjustable percentage and a live before/after preview outside of a forced shortfall.

### 5.7 Political Projects

If the user selected one or more political projects at setup, the simulation forces the **N projects with the lowest alignment scores** into Active state at the start of Month 1, before the user takes any action:

- Their BAC is locked at the initial (pre-inflation) figure, since they begin at Month 1.
- Their S-curves and risk milestones are armed immediately.
- They are marked `political: true` and carry a **lock until Month 24**.
- During the lock window, the Abandon button is disabled with a tooltip explaining the restriction.
- After Month 24, the lock is lifted and they may be abandoned normally (incurring the standard −2 penalty).
- Political projects are displayed with a distinctive badge in the Active list: "🔒 locked to M24" while locked, "political" thereafter.

The intent is to model the public-sector reality that a portion of the portfolio is pre-committed on political grounds, forcing the user to manage their strategic portfolio around a fixed, often low-alignment commitment.

### 5.8 Approval Lag (Pending State)

If approval lag > 0 months is selected at setup, every project added by the user during the run passes through the **Pending** state before becoming Active:

- Upon addition, the project's BAC is locked at the current inflation-adjusted figure. It does not inflate further while pending.
- `pendingUntil = month_of_addition + approvalLag`
- No cash is drawn while pending.
- The project counts against the concurrent cap (if set).
- At the start of the month when `current_month ≥ pendingUntil`, the project automatically activates: S-curve is generated from the locked BAC, risk milestones are armed, and it enters Active state.
- Pending projects are shown in a dedicated **Pending Approval** section in the decision panel with a countdown to activation.
- Projects still in Pending state at Month 60 are marked **Expired** (−1 penalty).

### 5.9 ARC and Benefits Lifecycle Summary

For a project with both ARC and Social Benefits enabled, the full post-completion lifecycle is:

```
Completion (M) ──► M+1: ARC and Benefits both begin accruing at full rate
                    │
                    ├─ Shortfall → Reduce ARC (1st time, −2 pts)
                    │    → ARC funded at 70%, Benefits at 40%, backlog accrues
                    │    → Restore (repay backlog) → back to full rate, reduction count stays at 1
                    │
                    ├─ Shortfall → Reduce ARC (2nd time, −2 pts) → same effect, count now 2
                    │    → Restore possible, but the reduce lever is now permanently exhausted
                    │
                    └─ Any further shortfall on this project → only remaining lever is Abandon:
                         state → abandoned, ARC stops, Benefits flip to −1.5× rate permanently
```

---

## 6. S-Curve Cash Flow Model

### 6.1 Beta Distribution S-Curve

Each project's monthly spend profile follows a **Beta distribution (α=2, β=2)**, producing a symmetric S-curve (slow start, mid-peak, taper).

The spend in month `t` of a project with duration `D` months and budget `B` is:

```
x(t)     = t / D
spend(t) = B × [ betaCDF(x(t)) − betaCDF(x(t−1)) ]
```

where `betaCDF(x) = 3x² − 2x³` is the regularised incomplete Beta function for α=β=2.

### 6.2 Recalculation Triggers

The S-curve is recalculated (a **rebaseline**, Section 6.3) when:

- A project is **slowed** — voluntarily or during shortfall resolution.
- A project is **sped up** (Section 5.6).
- A project is **resumed** after suspension — with the 10% duration penalty applied first.
- A **risk event** alters cost or duration (Section 8).

The Pending → Active transition also generates the initial S-curve from the locked BAC and planned duration.

### 6.3 Rebaseline Routine (single shared routine)

```
remaining_budget   = BAC_current − cumulative_nominal_spend
remaining_duration = (new remaining months, per the triggering rule)
new S-curve        = generateSCurve(remaining_budget, remaining_duration)
durationCurrent    = months_elapsed_since_start + remaining_duration
```

After a rebaseline the project runs normally on the new S-curve. No residual multiplier persists. This single routine serves slowdown, speed-up, resume, and risk-event reschedules.

---

## 7. Funding Shortfall Management (Manual Resolution)

### 7.1 Monthly Check

At the start of each month, after fund release, inflation, and risk evaluation:

```
Monthly Demand    = Σ inflation-adjusted spend(t) for all Active projects this month
                   + Σ ARC (Section 4.4) for all Completed projects this month, if enabled
Available Balance = Carried-forward balance + this period's scheduled release (if applicable)
```

### 7.2 Shortfall Resolution Panel

If `Monthly Demand > Available Balance`, the simulation **pauses**. The panel shows a live Demand / Available / Gap readout and lets the user resolve the gap using any combination of:

| Lever | Applies to | Effect |
|---|---|---|
| **Slow down** | Active projects | Re-spreads remaining budget over a longer schedule, lowering monthly burn (Section 7.3). |
| **Suspend** | Active projects | Removes the project's demand entirely until resumed (Section 5.3). |
| **Abandon** | Active projects | Permanently removes the project; sunk costs lost; −2 score penalty (subject to political lock). |
| **Reduce ARC 30%** | Completed projects (if ARC enabled, < 2 lifetime reductions) | Frees cash immediately at −2 pts; cuts Benefits to 40% if enabled (Section 4.4.1). |
| **Abandon (ARC-exhausted)** | Completed projects with 2 lifetime ARC reductions | The completed project moves to Abandoned; full cutoff (Section 4.4.3). |

Speed Up is not available as a shortfall lever (it increases demand).

If the gap cannot be closed by any combination of the above (no active projects left to slow/suspend/abandon, and no eligible completed projects left to reduce or cut), the panel explicitly states "No further levers are available" and offers a confirmable **End simulation — no funds available (−10 pts)** action (Section 7.5).

### 7.3 Slowdown Mechanics (shortfall lever)

```
new_remaining_duration = ceil( remaining_duration / (1 − s) )     // s fixed at 30% from the shortfall panel
rebaseline( remaining_budget, new_remaining_duration )
```

A 30% slowdown lowers monthly burn and extends remaining duration accordingly. A slowdown may push completion past Month 60, resulting in **Expired** state. Total real cost rises slightly due to additional inflation months. (The same mechanic is available with an adjustable 5–80% slider outside of a shortfall — Section 5.6.)

### 7.4 Advance Gate

The Advance to Next Month button remains **disabled** until `Monthly Demand ≤ Available Balance`. Hovering the button (when not blocked) previews next month's Demand, Available balance, and Net, plus a countdown to the next scheduled release if it falls within 3 months.

### 7.5 Insolvency (Early Termination)

If the user determines that no combination of available levers can close the gap, they may end the simulation immediately from the Shortfall panel, via a confirm step:

- All Active, Suspended, and Pending projects are marked **Expired**.
- The run's score is computed as normal, plus a flat **−10 point** insolvency penalty.
- `sim.insolvent = true` and `sim.endMonth` record the early end for the debrief and assessment.
- The debrief displays a distinct banner: *"Simulation ended early at Month N of 60 — no funds were available to continue (−10 pts)."*

---

## 8. Risk Events

### 8.1 Risk Factors and the Risk Environment Multiplier

Project cost and duration risk factors are generated in the range 0.05–0.20 and then scaled by the **risk environment multiplier** set at setup:

| Setting | Multiplier | Effective factor range |
|---|---|---|
| Calm | 0.5× | 0.025–0.10 |
| Normal | 1.0× | 0.05–0.20 |
| Turbulent | 1.5× | 0.075–0.30 (capped at 0.40) |

These final, scaled risk factors are also the ones used in the Social Benefit rate formula (Section 4.5.1) — a project generated under Turbulent risk earns a higher BU/month rate than the same project under Calm risk, all else equal.

### 8.2 Milestone Triggers

Risk events are evaluated when an Active project's **cumulative spend** first crosses each of three thresholds:

| Milestone | Threshold (% of current BAC) |
|---|---|
| Early | 25% |
| Mid | 50% |
| Late | 75% |

This basis is robust to all rebaselines. At each milestone, the system independently rolls:

- **Cost Risk:** with probability equal to the project's cost risk factor, BAC increases or decreases by that factor (equal chance of either sign).
- **Duration Risk:** with probability equal to the project's duration risk factor, remaining duration increases or decreases by that factor.

Each milestone fires **at most once** per project; events do **not** compound across milestones. Any change triggers a rebaseline (Section 6.3).

### 8.3 Risk Event Notification

A dismissible alert card appears in the monthly decision panel:

```
⚠  RISK EVENT — [Project Title]
    Milestone reached: 50% of budget spent
    Cost increased by 12% → New BAC: $X.XXM
    Duration extended by 2 months → New end: Month 34
    [Dismiss]
```

---

## 9. Scoring & Assessment

### 9.1 Composite Score

At the end of the run (Month 60, or earlier if insolvent), the user receives a **composite score out of 100**. The weighting depends on whether Social Benefits is enabled for the run:

| Component | Weight (Benefits off) | Weight (Benefits on) | Calculation |
|---|---|---|---|
| **Delivery** | 40 | 35 | `(Projects Completed / Max Possible Completions) × weight`, capped at weight |
| **Strategic Alignment** | 35 | 30 | `(Avg alignment fraction of completed projects) × weight` |
| **Budget Efficiency** | 25 | 20 | `(1 − Budget Wasted Ratio) × weight` |
| **Social Benefits** | — | 15 | `clamp(realised BU / potential BU, 0, 1) × 15` (Section 4.5.3) |

```
Budget Wasted Ratio = (Sunk costs on abandoned projects + unspent balance at run end) / Total Budget
```

A project abandoned via a full ARC cutoff (Section 4.4.3) counts in "abandoned" for this ratio — its full drawn cost becomes sunk, since it was fully spent to completion before being decommissioned.

Max Possible Completions is computed by greedy cheapest-first packing at simulation start and reflects the chosen budget tightness. With Standard (1.5×) it is ≈20; with Severe (2.2×) it is ≈14.

### 9.2 Penalties

| Event | Penalty |
|---|---|
| Project abandoned (including full ARC cutoff) | −2 points |
| Project expired (Active, Suspended, or Pending at run end) | −1 point |
| ARC funding reduced 30% (per reduction, up to 2 per project) | −2 points |
| Simulation ended early in insolvency (Section 7.5) | −10 points (flat, once) |

Penalties are subtracted from the raw composite score, floored at 0.

### 9.3 Performance Bands

| Score | Rating |
|---|---|
| 85–100 | **Excellent** |
| 70–84 | **Good** |
| 55–69 | **Satisfactory** |
| 40–54 | **Poor** |
| 0–39 | **Needs Development** |

### 9.4 End-of-Simulation Debrief

- Final score, band, and component breakdown with penalty detail (Delivery / Alignment / Efficiency / Social Benefits if enabled).
- Insolvency banner if the run ended early (Section 7.5).
- Full decision timeline in both **visual** (dot-on-a-60-month-axis, one symbol per decision type — add, slow, speed, suspend, resume, abandon, ARC-reduce, ARC-restore, ARC-cutoff) and **list** views.
- Comparison against the **optimal benchmark portfolio** (greedy alignment-per-dollar knapsack).
- Strategic alignment of delivered projects vs available-pool average.
- Outcome mix chart (completed, expired, abandoned proportions).
- Buttons to open the **Performance Assessment** (Section 9.5) and the **Leaderboard** (Section 9.7).

### 9.5 Performance Assessment (Rule-Based)

Opened from the Debrief, this is a personalised, deterministic review generated entirely from the run's recorded decisions and final state (no external API). It presents:

- **Decision summary:** projects added, tempo actions (slow + speed), abandonments.
- **What you did well** and **Where to improve** — each populated from a bank of ~15 independent condition checks, including: delivery rate vs target, alignment of completed vs pool average, quality of abandonment choices (was low- or high-alignment work cut?), budget deployment / leftover cash, expiry count, timing of additions (early vs late-game), use of tempo controls, unresumed suspensions, ARC funding cuts and their benefit impact, full ARC cutoffs (decommissioned assets), the realised-vs-potential Social Benefits ratio, and insolvency.
- **Key insight:** a single closing paragraph selected by final score band (or, if the run ended in insolvency, a dedicated insolvency-focused insight regardless of score).

### 9.6 Portfolio Status Report (Rule-Based, Mid-Run)

Available at any point during the run from the header's overflow ("⋯") menu → **Status report**. Generates a deterministic, client-side 7-section PMO-style narrative from the live simulation state — no network call, no external API:

1. **Executive Summary** — overall health label (on track / under pressure / in distress), delivery count, budget deployment, and expiry trajectory.
2. **Financial Position** — deployment rate, inflation exposure from the remaining available pool, cash-position note, unspent-balance warning, sunk-cost note.
3. **Project Portfolio Status** — narrative listing for each state group (active, completed, suspended, abandoned) with per-project alignment/progress/end-month detail.
4. **Strategic Alignment Analysis** — budget-weighted alignment of active + completed vs pool average; call-outs for low-alignment active projects and the alignment of delivered work.
5. **Risk Profile** — count and detail of recent risk events; projects at imminent expiry risk; high-burn-relative-to-balance projects.
6. **Portfolio Manager Assessment** — decision counts, a bulleted "strengths observed" list, and a bulleted "areas requiring attention" list, both built from the same kind of condition checks as Section 9.5 but phrased for the live (not final) state.
7. **Recommended Actions** — up to 5 prioritised, specific actions naming project IDs (e.g. speed up a near-complete at-risk project, add a specific high-alignment affordable candidate, slow a high-burn project, resume a suspended one where the numbers still work).

Rendered in a serif typeface with sans-serif section headers; footer reads *"Rule-based PMO report · generated from simulation data."*

### 9.7 Leaderboard

Every completed run (reaching the Debrief screen) is automatically saved to a local leaderboard (browser `localStorage`, key `portfolio_sim_leaderboard_v1`, capped at the most recent 500 entries), recording: player name, run name, difficulty preset, final score and band, completed/abandoned/expired counts, the Delivery/Alignment/Efficiency subscores, date/time, and a snapshot of key parameters (inflation, funding profile, tightness, political count, risk).

The Leaderboard modal (opened from the Debrief or the Setup screen) shows an "All" view plus one tab per difficulty preset, sorted by score descending, top 50 rows, with medal styling for the top 3 and the just-completed run's row highlighted.

---

## 10. User Interface

### 10.1 Layout and Theme

Sticky header, a persistent KPI strip, then a split-view main grid:

```
┌──────────────────────────────────────────────────────────────────────┐
│ [Logo] Run name   [Q1▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪ Q20⚠] Month 14/60 · proj. 62 │
│                                    Available $X.XM  [Hint][☀/☾][Save] │
│                                    [⋯] [Advance → (hover: preview)]   │
├──────────────────────────────────────────────────────────────────────┤
│ FUNDING EFFICIENCY │ STRATEGIC ALIGNMENT │ COMPLETED │ ARC │ BENEFITS │
├─────────────────────────┬────────────────────────────────────────────┤
│   MONTHLY DECISION      │         PORTFOLIO DASHBOARD                │
│                         │  [Cash Flow][Funds][Gantt][S-Curves][KPIs] │
│  Risk event alerts      │                                            │
│  ► Active Projects      │  [Visualisation Area]                      │
│  ► Top Picks            │                                            │
│  ► Pending Approval     │                                            │
│  ► Suspended Projects   │                                            │
│  ► Completed            │                                            │
│  ► Available Pool       │                                            │
└─────────────────────────┴────────────────────────────────────────────┘
```

The interface defaults to a **light theme**. A **sun/moon toggle** in the header switches to dark mode. All colours follow the active theme. The choice is not persisted between sessions.

**Semantic state colour palette:**

| State | Colour |
|---|---|
| Active | Blue |
| Pending | Indigo |
| Suspended | Amber |
| Completed | Green |
| Abandoned | Grey |
| Expired | Red |
| ARC | Purple |
| Primary action | Indigo |

**Quarter timeline (header):** replaces a simple progress bar with a 20-segment axis. Each segment represents one quarter (Q1–Q20); hovering a segment shows its month range. Segments in the final 4 quarters (Q17–Q20, months 49–60) are tinted as a "danger zone." A dot marks the current quarter; a small tick marks the segment of the next scheduled fund release. Month counter and (unless Blind score) the live projected score are shown above the axis.

**Advance button:** its color is `primary` (safe), `warn` (demand > 80% of available), or `danger` (demand > available) based on this month's projected demand vs. balance. Hovering it (when not disabled) shows a tooltip previewing Demand, Available, Net, and — if within 3 months — a countdown to the next release.

**Overflow menu ("⋯"):** a small dropdown next to Save, currently containing the **Status report** action (Section 9.6).

### 10.2 Monthly Decision Panel

Sections appear in this order, each collapsible (chevron toggle), all open by default except Completed:

- **Risk event alerts** (dismissible cards at top when triggered).
- **Active Projects:** each card shows a risk-tinted left border (green/amber/red based on projected overrun and burn-vs-balance), progress bar and % complete badge, BAC / inflation-adjusted monthly spend / projected completion month, category/subcategory and ARC rate, a political badge if applicable, inline status badges (e.g. "⚠ Expires M63", "Late risk M58", "High burn"), and four actions: **Speed** · **Slow** · **Suspend** · **Abandon** (two-step confirm; disabled during political lock).
- **Top Picks:** the top 3 affordable, finishable, highest-alignment Available projects, shown as compact rows with Preview and one-click Add.
- **Pending Approval** (shown when approval lag > 0 and projects are pending): locked BAC, countdown to activation. No actions available.
- **Suspended Projects:** remaining cost with inflation note; **Resume** (+10% duration penalty) and **Abandon** buttons.
- **Completed** (shown when ARC and/or Social Benefits is enabled and at least one project is completed; collapsed by default): each card shows delivery month, and — if ARC is on — current/full ARC rate with a **Restore full funding** action when reduced, and — if Benefits is on — current effective BU/month (flagged "reduced" or "negative" as applicable) and cumulative BU with its $ social-value equivalent.
- **Available Projects:** sortable table (Section 10.4) with filter chips (Affordable / Can finish / High alignment ≥70%, the last hidden under Blind alignment) and a concurrent-cap warning banner when applicable.

The **Shortfall Resolution panel** (Section 7.2) appears as a blocking overlay when demand exceeds available funds.

### 10.3 Persistent KPI Strip (Portfolio Dashboard)

A row of KPI cards sits directly beneath the header, always visible regardless of the active dashboard tab:

| Card | Always shown? | Contents |
|---|---|---|
| Funding Efficiency | Yes | `committed / released` as a %, with amounts |
| Strategic Alignment | Yes | Budget-weighted alignment of active + completed projects (hidden under Blind alignment) |
| Completed | Yes | `completed / maxComp` with a progress bar |
| ARC Exposure | Only if ARC enabled | Cumulative ARC paid to date, current run-rate/month |
| Social Benefits | Only if Benefits enabled | Cumulative BU (and $ social value), colour-flipped to red if net negative |

### 10.4 Dashboard Visualisations

#### Tab 1: Cash Flow Chart
- Required Monthly Spend vs Available Funds (and, if ARC is on, ARC as a third recurring-cost line) across all 60 months.
- Projection uses the pre-computed release schedule (not a flat amount), so S-curve, back-loaded, volatile, or non-quarterly funding patterns are visible in advance.
- Quarterly reference markers as vertical dashed lines; current-month cursor in indigo; legend wraps below the chart without clipping.

#### Tab 2: Funds (Bar Chart)
- Same underlying monthly series as Cash Flow, rendered as grouped bars: Funds Available, Funds Used, and (if ARC is on) ARC.
- Same reference-line and current-month-cursor treatment as the Cash Flow tab.

#### Tab 3: Portfolio Gantt Chart
- One row per portfolio project; bars colour-coded by state.
- Pending projects shown as a lighter bar from addition month to activation month.
- Milestone markers (25/50/75%); risk-event icons; current-month cursor.

#### Tab 4: S-Curve Overlays
- Cumulative spend (% of BAC) over time for each project.
- Original baseline dashed; current plan solid — divergence reflects all rebaselines.
- Filterable by project.

#### Tab 5: KPI Summary Dashboard
- Projects Delivered gauge; Portfolio Budget Used gauge; Projected Score gauge (hidden if Blind score is active).
- Average Strategic Alignment of active + completed projects (hidden if Blind alignment); Projects At Risk count; Months Remaining countdown; Available Funds; Total Budget.
- ARC this month / cumulative paid (or "Off" if disabled).
- Benefits generated (cumulative BU + $ value) and Benefits this month (or "Off" if disabled).

### 10.5 Available Pool Table and Project Preview

| Field | Display |
|---|---|
| Title | Project name with ID and subcategory |
| Alignment | Badge (green ≥70%, amber 40–69%, red <40%) — **hidden** if Blind alignment |
| BAC | Current inflation-adjusted budget |
| Duration | Planned months |
| Risk c/d | Cost / duration risk factors |
| ARC | Preset ARC rate (% of BAC) |
| Benefits | BU/month rate — **only shown if Social Benefits is enabled** |
| Preview / Add | Buttons; Add disabled if unaffordable or cap reached |

Sortable by alignment, BAC, duration, and risk factors. When Blind alignment is active, alignment sort is removed.

Clicking **Preview** (eye icon) opens the **Project Preview Modal**: key stats (inflation-adjusted BAC, duration and projected end, alignment, monthly-burn increase if added, ARC rate, and — if Benefits is on — benefit rate with its $ equivalent), plus a side-by-side line chart comparing required-vs-available funds for the rest of the run with and without the project added. An **Add** button commits directly from the modal.

### 10.6 Hint Advisor

A **Hint** button (lightbulb icon) in the header opens a coaching card. Priority logic (first matching condition wins):

| Priority | Condition | Recommendation |
|---|---|---|
| 1 | Monthly demand > available balance | Name the lowest-alignment active project to slow or suspend. |
| 2 | ≤14 months left and active projects project past Month 60 | If a well-advanced project (≥45% complete) can be rescued by speed-up, recommend it with compression pre-calculated. Otherwise recommend abandoning the weakest expiring project. |
| 3 | Balance > 1.6× quarterly release and affordable high-alignment project available (>16 months left) | Recommend adding it; note inflation cost of waiting. |
| 4 | Suspended projects exist | Recommend resuming the highest-alignment one or abandoning the weakest. |
| 5 | Multiple active projects project past Month 60 | Recommend suspending the lowest-alignment overrun. |
| 6 | Portfolio balanced | Confirm good standing; suggest an affordable high-alignment add if one exists; show projected score. |

The card includes a one-tap **Apply** button for Add and Speed Up recommendations, and an always-on context line ("Delivered X of ~Y possible · Z months left"). Closes with: *"Guidance is heuristic — a coaching prompt, not the only correct move. The judgement stays yours."*

Hint logic currently reasons only about capital cash flow (slow/suspend/add/resume/speed) — it does not yet factor ARC or Social Benefits pressure into its recommendations.

### 10.7 Slow Down and Speed Up Modals

Both follow the same pattern: a percentage slider, a live before/after preview, and Apply/Cancel.

- **Slow Down:** 5%–80% slider (5% steps). Preview: Remaining months, Monthly burn (before → after).
- **Speed Up:** 5%–60% slider (5% steps). Preview: Remaining months, Monthly burn, projected Finish month (flagged if > M60), and BAC including the crash premium.

### 10.8 Rules / How to Play Modal

A **How to Play** button on the setup screen opens a six-tab reference modal:

| Tab | Contents |
|---|---|
| Objective | Role, 60-month loop, inflation penalty for inaction |
| Projects | Attributes table, state descriptions, S-curve explanation |
| Actions | All six levers with strategic reasoning and when to use each |
| Funding | Quarterly releases, demand vs supply, shortfall panel, inflation trap |
| Risk | Milestone triggers, shock types, risk event cards, mitigation advice |
| Scoring | Component table, penalties, performance bands, the unspent-cash insight |

A "Got it — start the run" button closes the modal directly into the setup screen.

> **Known limitation:** this modal's content has not been updated for v5.0 — it still describes the pre-ARC/pre-Benefits scoring (40/35/25, two penalty types) and does not mention categories, ARC, or Social Benefits. It should be revised to match Sections 4.4, 4.5, and 9 before relying on it as the in-app source of truth.

---

## 11. Technical Architecture

### 11.1 Platform

- **Single-page React application** (Vite + React, `recharts` for charts, `lucide-react` for icons). No backend, no external API calls of any kind — the v4 Anthropic-API-backed report has been replaced with a fully client-side rule-based generator (Section 9.6).
- All simulation state held in memory during the session.
- Persistent storage via a `window.storage` key/value API for saving/resuming the in-progress session, and `localStorage` for the cross-session leaderboard.
- Deployment: Node version pinned via `.node-version` (22.12.0) for build-platform compatibility; a `start.bat` convenience launcher and `robots.txt` are included in the built app.

### 11.2 Key Data Structures

```javascript
// Simulation configuration (set at start, immutable during run)
config: {
  preset:            String,   // learning | standard | advanced | custom
  fundingProfile:    String,   // flat | scurve | frontloaded | backloaded | volatile
  fundingFrequency:  Number,   // months per release: 1 | 3 | 6 | 12
  budgetTightness:   Number,   // 1.2 | 1.5 | 1.8 | 2.2
  politicalProjects: Number,   // 0–5
  concurrentCap:     Number,   // 0 = unconstrained
  approvalLag:       Number,   // months (0 = none)
  riskMultiplier:    Number,   // 0.5 | 1.0 | 1.5
  blindAlignment:    Boolean,
  blindScore:        Boolean,
  arcEnabled:        Boolean,  // Integrated Budget Wallet (Section 4.4)
  benefitsEnabled:   Boolean,  // Social Benefits (Section 4.5)
}

// Simulation state
{
  name: String,
  playerName: String,
  seed: Number,
  month: Number,                   // 1–60
  annualRate: Number,
  monthlyRate: Number,             // (1 + annual)^(1/12) − 1
  totalBudget: Number,
  releaseSchedule: Number[N],      // pre-computed release amounts, N = 60 / fundingFrequency
  quarterlyRelease: Number,        // current period's release (for display)
  availableBalance: Number,
  released: Number,                // cumulative releases to date
  maxComp: Number,                 // greedy cheapest-first packing count
  projects: Project[],
  events: RiskEvent[],
  decisions: Decision[],
  alerts: RiskEvent[],             // current-month dismissible alerts
  history: MonthHistory[],         // { month, demand, arc, balanceAfter }
  status: "running" | "ended",
  insolvent: Boolean,              // true if the run ended early via Section 7.5
  endMonth: Number | undefined,    // month of early termination, if insolvent
  config: Config,
  score: ScoreResult | undefined,
}

// Project
{
  id: String,                      // P01–P30
  title: String,
  category: String,                // 1 of 3 (Section 3.1)
  subCategory: String,              // 1 of 12 (Section 3.1)
  arcRate: Number,                 // preset ARC rate for the subcategory
  bacInitial: Number,              // original BAC at generation
  bacCurrent: Number,              // after inflation / crash premiums / risk events
  alignment: Number,               // 0.20–1.00
  durationPlanned: Number,         // original baseline months
  durationCurrent: Number,         // after all rebaselines
  costRisk: Number,                // scaled by riskMultiplier; capped at 0.40
  durRisk: Number,
  buRate: Number,                  // Benefit Units/month once completed and fully funded (Section 4.5.1)
  buCumulative: Number,            // running total BU generated; can go negative
  state: Enum,                     // available|pending|active|suspended|completed|abandoned|expired
  startMonth: Number | null,
  completionMonth: Number | null,
  pendingUntil: Number | null,     // month when pending project activates
  nominalSpent: Number,            // cumulative nominal spend
  cashDrawn: Number,               // cumulative inflation-adjusted cash drawn
  sCurve: Number[],                // forward monthly spend (rebaselined on changes)
  sCurveBaseline: Number[],        // original curve for S-Curve tab divergence display
  milestones: Number[],            // triggered thresholds, e.g. [25, 50]
  suspendPenalty: Number,          // accumulated penalty months from suspensions
  political: Boolean,              // true if forced in at start
  lockUntil: Number | null,        // month after which political project can be abandoned
  arcBaseBac: Number,              // bacCurrent frozen at completion — ARC calculation base
  arcReduced: Boolean,             // true while ARC funding is currently cut 30%
  arcBacklog: Number,              // $ owed to restore full ARC funding
  arcReductionCount: Number,       // lifetime reductions; capped at 2 (Section 4.4.1)
  arcCutoff: Boolean,              // true once fully cut off (Section 4.4.3) — state is then "abandoned"
}

// Decision audit entry
{
  month: Number,
  type: "add" | "speed" | "slow" | "suspend" | "resume" | "abandon"
      | "arc_reduce" | "arc_restore" | "arc_cutoff",
  id: String,
  title: String,
  a: Number | undefined,           // compression % for speed-up
  s: Number | undefined,           // slowdown % for slow
}

// Leaderboard entry (persisted separately, localStorage key portfolio_sim_leaderboard_v1)
{
  playerName: String, runName: String, preset: String,
  score: Number, band: String,
  completed: Number, abandoned: Number, expired: Number,
  delivery: Number, alignment: Number, efficiency: Number,
  date: String, time: String,
  params: { inflation: String, funding: String, tightness: Number, political: Number, risk: Number },
}
```

### 11.3 Release Schedule Computation

```javascript
function computeReleaseSchedule(totalBudget, profile, rng, N) {
  const norm = (weights) => {
    const sum = weights.reduce((a, b) => a + b, 0);
    return weights.map(w => +(w * totalBudget / sum).toFixed(4));
  };
  if (profile === "scurve")
    return norm(Array.from({length: N}, (_, i) => betaCDF((i+1)/N) - betaCDF(i/N)));
  if (profile === "frontloaded")
    return norm(Array.from({length: N}, (_, i) => N - i));
  if (profile === "backloaded")
    return norm(Array.from({length: N}, (_, i) => i + 1));
  if (profile === "volatile")
    return norm(Array.from({length: N}, () => 0.8 + rng() * 0.4));
  return Array(N).fill(+(totalBudget / N).toFixed(4));  // flat
}
// N = Math.round(60 / fundingFrequency); default fundingFrequency = 3 → N = 20
```

### 11.4 S-Curve and Rebaseline

```javascript
const CRASH_K = 0.5;

function betaCDF(x) { return 3*x*x - 2*x*x*x; }   // α=β=2

function generateSCurve(budget, durationMonths) {
  const d = Math.max(1, Math.round(durationMonths));
  return Array.from({length: d}, (_, i) => {
    const t = i + 1;
    return budget * (betaCDF(t/d) - betaCDF((t-1)/d));
  });
}

function rebaseline(project, newRemainingDuration, atMonth) {
  const rem = Math.max(0, project.bacCurrent - project.nominalSpent);
  project.sCurve = generateSCurve(rem, newRemainingDuration);
  project.durationCurrent = (atMonth - project.startMonth) + project.sCurve.length;
}
```

### 11.5 Inflation Compounding

```javascript
const monthlyRate = Math.pow(1 + annualRate, 1/12) - 1;

bac_n           = bac_initial   * Math.pow(1 + monthlyRate, n);  // unstarted project BAC at month n
demand_inflated = nominal_spend * Math.pow(1 + monthlyRate, n);  // inflated demand at global month n
```

### 11.6 ARC and Benefits Engine Functions

```javascript
function arcFullMonthlyFor(p, month, annualRate) {
  if (!p.arcRate || !p.completionMonth || month <= p.completionMonth) return 0;
  const elapsed = month - p.completionMonth;
  const yearIdx = Math.floor((elapsed - 1) / 12);
  return (p.arcBaseBac * p.arcRate / 12) * Math.pow(1 + annualRate, yearIdx);
}
function arcMonthlyFor(p, month, annualRate) {
  const full = arcFullMonthlyFor(p, month, annualRate);
  return p.arcReduced ? full * 0.7 : full;
}
function reduceArcFunding(sim, id) {
  // guards: project must be completed, not already reduced, and arcReductionCount < 2
  // sets arcReduced = true, arcReductionCount += 1, logs an "arc_reduce" decision
}
function restoreArcFunding(sim, id) {
  // pays off arcBacklog from availableBalance if affordable; sets arcReduced = false, arcBacklog = 0
}
function cutArcCompletely(sim, id) {
  // guard: project must be completed (typically only offered once arcReductionCount >= 2)
  // sets state = "abandoned", arcCutoff = true, arcReduced = false, arcBacklog = 0
}

const isBenefitTracked = (p) => p.state === "completed" || (p.state === "abandoned" && p.arcCutoff);
function benefitMonthlyFor(p, month) {
  if (!p.buRate || !p.completionMonth || month <= p.completionMonth) return 0;
  if (p.arcCutoff) return -1.5 * p.buRate;
  return p.arcReduced ? p.buRate * 0.4 : p.buRate;
}
function benefitPotentialFor(p, uptoMonth) {
  if (!p.buRate || !p.completionMonth) return 0;
  return p.buRate * Math.max(0, uptoMonth - p.completionMonth);
}
```

### 11.7 Scoring

```javascript
function scoreSim(sim) {
  const benefitsOn = !!sim.config?.benefitsEnabled;
  const [deliveryMax, alignmentMax, efficiencyMax] = benefitsOn ? [35, 30, 20] : [40, 35, 25];

  const delivery   = Math.min(completed.length / Math.max(1, sim.maxComp), 1) * deliveryMax;
  const alignment  = completed.length ? avgAlignment(completed) * alignmentMax : 0;
  const efficiency = (1 - wastedRatio) * efficiencyMax;

  const benefitTracked   = sim.projects.filter(isBenefitTracked);
  const potentialBU      = benefitTracked.reduce((a, p) => a + benefitPotentialFor(p, sim.month), 0);
  const actualBU         = benefitTracked.reduce((a, p) => a + (p.buCumulative || 0), 0);
  const benefits         = benefitsOn ? (potentialBU > 0 ? clamp(actualBU / potentialBU, 0, 1) * 15 : 0) : 0;

  const raw     = delivery + alignment + efficiency + benefits;
  const penalty = abandoned.length * 2 + expired.length * 1
                + arcReductionCountAcrossProjects * 2
                + (sim.insolvent ? 10 : 0);
  const final   = Math.max(0, raw - penalty);
  // band thresholds as Section 9.3
}
```

---

## 12. Simulation Flow Summary

```
SETUP
  └─ User selects preset (or Custom) and independently toggles ARC / Benefits
     → newSim(config):
         generate 30 projects across 3 categories / 12 subcategories (with ARC rate, BU intensity)
         scale risk factors by riskMultiplier; compute buRate per project from final risk
         totalBudget = Σ BAC / budgetTightness
         releaseSchedule = computeReleaseSchedule(profile, N = 60/fundingFrequency)
         force N lowest-alignment projects Active (political lock until M24)
         maxComp = greedy cheapest-first packing count
         first period released → availableBalance = releaseSchedule[0]

MONTH LOOP (months 1 to 60):
  ├─ ACTIVATE PENDING: any project where month ≥ pendingUntil → Active,
  │     generate S-curve from locked BAC, arm risk milestones
  ├─ SCHEDULED RELEASE: if due this month, add releaseSchedule[qi] to balance
  ├─ INFLATE AVAILABLE BACs: unstarted projects × monthly inflator
  ├─ RISK MILESTONES: check cumulative spend crossing 25/50/75% of BAC
  │     → independent rolls for cost and duration shocks → rebaseline + alert card
  ├─ DEMAND CHECK: Σ inflation-adjusted active spend + Σ ARC on completed projects (if enabled)
  ├─ If demand > available balance:
  │     └─ PAUSE → Shortfall Resolution panel:
  │         ├─ Slow → rebaseline over longer duration
  │         ├─ Suspend → zero demand
  │         ├─ Abandon (active) → remove (subject to political lock)
  │         ├─ Reduce ARC 30% (completed, if enabled, < 2 lifetime reductions) → −2 pts, benefits → 40%
  │         ├─ Abandon (completed, ARC-exhausted) → full cutoff, benefits → −1.5×
  │         └─ End simulation (insolvency, −10 pts) if no levers remain
  │         (loop until demand ≤ available, or the run ends in insolvency; Advance disabled otherwise)
  ├─ DEDUCT: availableBalance -= (capital demand + ARC)
  ├─ ACCRUE BENEFITS: for each completed/cutoff-abandoned project, add its monthly BU (Section 4.5.2)
  ├─ PROGRESS: advance all active S-curves; update nominalSpent and cashDrawn
  ├─ COMPLETE: any project whose S-curve is exhausted → Completed (arcBaseBac frozen)
  ├─ DECISION PHASE: user may —
  │     ├─ Add project (→ Pending if lag > 0, else → Active next month), optionally previewing first
  │     ├─ Speed up / Slow down active project (dedicated modals, rebaseline)
  │     ├─ Suspend / Resume (+10% duration penalty, rebaseline)
  │     ├─ Abandon (if not locked)
  │     ├─ Restore ARC funding on a reduced completed project
  │     ├─ Request Hint               → context-aware coaching card
  │     └─ Request Status report      → rule-based PMO narrative (Section 9.6)
  └─ Advance to Month + 1

END (Month 60, or early via insolvency):
  ├─ Mark Active, Suspended, Pending → Expired
  ├─ Score: Delivery + Alignment + Efficiency [+ Benefits] − Penalties (floored at 0)
  ├─ Save entry to the local Leaderboard
  └─ Debrief: score breakdown · decision timeline · optimal benchmark comparison
     · Performance Assessment (Section 9.5) · Leaderboard (Section 9.7)
```

---

## 13. Open Items / Future Enhancements

| Item | Notes |
|---|---|
| Rules modal content refresh | The in-app "How to Play" modal (Section 10.8) has not been updated for ARC, Social Benefits, categories, or the current scoring weights — it should be revised to match this spec. |
| Hint advisor ARC/Benefits awareness | `computeHint` currently reasons only about capital cash flow; it does not recommend reducing ARC or protecting Benefits as a shortfall response. |
| Quarter timeline / non-quarterly cadence | The header's 20-segment timeline visual assumes quarterly granularity even when a different funding frequency is selected (Section 4.1); cosmetic only, but worth generalising. |
| Scenario events | Random mid-run shocks (market downturn, regulatory change, budget freeze) affecting the full portfolio simultaneously. |
| PDF export | Download session log and debrief as a formatted PDF. |
| Configurable project pool | Allow the trainer to define real project titles, BACs, and alignment scores before running a session with a specific cohort. |
| Configurable ARC rates / BU intensities | Currently fixed per subcategory (Section 3.1); could be exposed as Custom-mode overrides. |
| Variable political lock duration | Currently hardcoded at 24 months; could be a setup parameter. |
| Post-decision commentary | Brief rule-based note after each advance summarising what changed and flagging emerging risks. |
| Leaderboard export/reset | No current UI to clear or export the local leaderboard beyond browser storage tools. |
