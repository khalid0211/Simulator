# Portfolio Simulator — Full Specification

**Version:** 3.0
**Date:** June 2026
**Supersedes:** v2.0 (June 2026)
**Purpose:** Training tool for portfolio managers to develop skills in project selection, funding decisions, and portfolio optimisation over a 60-month simulation horizon.

---

## 0. Change Log

### v3.0 — June 2026 (this version)

Three features added; no existing rules changed.

| # | Area | Change |
|---|---|---|
| 1 | Schedule acceleration (Section 5.6, 6.2, 7.5, 11.2, 12) | New **Speed Up** action: the user may compress an active project's remaining duration by a chosen percentage. The remaining budget is re-spread over the shorter schedule (raising monthly burn), and a crash premium is applied to the remaining cost. This is the symmetric inverse of the Slow Down action. |
| 2 | Hint advisor (Section 10.5) | A **Hint** button in the header opens a context-aware coaching card. It reads the live portfolio state and recommends the single most valuable next action, with the specific project named and the financial reasoning stated. In the late-game, it may suggest a one-tap speed-up to rescue an expiring project. |
| 3 | Light / dark theme (Section 10.1) | The interface now defaults to a **light theme**. A toggle in the header switches between light and dark modes. All colours, overlays, and chart palettes follow the active theme. |

### v2.0 — June 2026

| # | Area | v1.0 | v2.0 |
|---|---|---|---|
| 1 | Funding shortfall (Section 7) | System auto-extended durations proportionally. | Manual resolution panel; no automatic extension. |
| 2 | Slowdown behaviour | Not present. | Rebaselines the project over a longer duration; one-time, not persistent. |
| 3 | Strategic alignment scale | Inconsistent (20–100% vs 0.20–1.00; scoring divided by 100). | Stored as 0.20–1.00; scoring multiplies directly by component weight. |
| 4 | BAC generation range | Unspecified. | Uniform $2M–$15M, scaled so total demand ≈ 1.5× total budget. |
| 5 | Max possible completions | "~20" (undefined). | Computed by greedy cheapest-first packing. |
| 6 | Risk milestone basis | % of planned duration elapsed (ambiguous after reschedules). | Cumulative spend crossing 25/50/75% of current BAC. |
| 7 | Optimal benchmark | Unspecified. | Greedy alignment-per-dollar knapsack heuristic. |

---

## 1. Overview

The Portfolio Simulator is an interactive, browser-based training tool that places the user in the role of a portfolio manager. Over a simulated 60-month period, they must select, fund, monitor, accelerate, slow, and occasionally suspend or abandon projects from a pool of 30 candidates — with the objective of maximising the number of strategically aligned projects delivered within budget and time constraints.

At the end of the simulation, the user receives a composite performance score and a detailed debrief of their decisions.

---

## 2. Simulation Parameters

### 2.1 Setup Screen

Before the simulation begins, the user configures:

| Parameter | Description | Default |
|---|---|---|
| Inflation Rate | Annual rate, compounding monthly (`monthly_rate = (1 + annual_rate)^(1/12) - 1`) | 3% p.a. |
| Simulation Name | Optional label for the session | — |

The system pre-generates all 30 projects and the total portfolio budget at simulation start. These are fixed and not re-randomised mid-simulation.

### 2.2 Time Horizon

- **Total duration:** 60 months
- **Decision frequency:** Once per month
- **Funding release frequency:** Once per quarter (Months 1, 4, 7, 10 … 58)

---

## 3. Project Pool

### 3.1 Project Attributes

Each of the 30 projects is randomly generated at simulation start with the following attributes:

| Attribute | Range | Notes |
|---|---|---|
| Project ID | P01–P30 | Fixed identifier |
| Title | Descriptive name | e.g. "Digital Customer Portal", "Supply Chain Overhaul" |
| Budget at Completion (BAC) | $2M–$15M (uniform) | Scaled per Section 3.2 |
| Strategic Alignment Score | 0.20–1.00 (fraction) | Displayed as 20%–100%. Fixed at generation; not affected by inflation |
| Duration | 12–36 months | Baseline planned duration |
| Duration Risk Factor | 0.05–0.20 | % variation in duration (positive or negative) at milestones |
| Cost Risk Factor | 0.05–0.20 | % variation in BAC (positive or negative) at milestones |

### 3.2 Budget Calibration

Raw BACs are drawn uniformly in the $2M–$15M range. The total portfolio budget is then set so that completing all 30 projects would require approximately **1.5× the available budget**, making it possible to complete at most ~20 projects. This creates real scarcity and forces prioritisation.

```
Total Portfolio Budget = (Σ BAC_initial of all 30 projects) / 1.5
Quarterly Release       = Total Portfolio Budget / 20
```

### 3.3 Inflation on Unstarted Projects

Projects not yet added to the portfolio see their BAC increase each month due to inflation:

```
BAC_month(n) = BAC_initial × (1 + monthly_inflation_rate)^n
```

where `n` is the number of months elapsed since simulation start.

---

## 4. Funding Model

### 4.1 Quarterly Budget Releases

- The total 60-month portfolio budget is divided into **20 equal quarterly tranches**.
- Each tranche is released at the **start of each quarter** (months 1, 4, 7, … 58).
- **Unused funds carry over** to the next quarter's available balance. There is no "use it or lose it" rule.

```
Quarterly Release     = Total Portfolio Budget / 20
Available Funds (Q)   = Quarterly Release + Unspent Carry-Forward from Q-1
```

### 4.2 Inflation Adjustment on Demand

The **funding demand** for active projects in each month is adjusted upward by the cumulative inflation inflator, indexed to the global simulation month:

```
Monthly Demand (inflated) = Σ [ Project S-curve spend(month) × (1 + monthly_rate)^n ]
```

where `n` is the current global simulation month. The real cost of active projects therefore rises over time, adding pressure to start high-priority projects early.

---

## 5. Project Lifecycle

### 5.1 States

| State | Description |
|---|---|
| **Available** | In the pool; not yet started. BAC inflates monthly. |
| **Active** | In the portfolio; consuming funds per its (possibly rebaselined) S-curve. |
| **Suspended** | Paused by the user. No new funds consumed. Remaining cost continues to inflate. |
| **Completed** | Delivered within the 60-month window. Counts toward score. |
| **Abandoned** | Removed from portfolio permanently. Sunk costs are lost. Counts against score. |
| **Expired** | Still in portfolio at month 60 but not completed. Counts as a partial penalty (see Section 9). |

### 5.2 Adding a Project

- The user selects a project from the Available pool and adds it to the portfolio in any month.
- Upon addition:
  - The project's **S-curve cash flow profile is calculated** (see Section 6).
  - The project's **risk milestones are armed** at 25%, 50%, and 75% of cumulative spend.
  - The project moves to **Active** state.
- A project added during a month's decision phase begins consuming funds in the **following** month (per the Section 12 loop order).

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

- The user may permanently abandon any Active or Suspended project.
- Sunk costs are not recovered.
- The project is removed from all cash flow calculations.
- Abandoned projects incur a **score penalty** (see Section 9).

### 5.6 Speed Up (Schedule Crashing)

The user may accelerate any Active project by compressing its remaining schedule. This models **schedule crashing** — buying time by increasing resource intensity.

- The user selects a **compression percentage a** (5%–60%).
- The simulation applies the following changes and rebaselines the project (Section 6.3):

```
crash_premium          = remaining_budget × CRASH_K × a       // CRASH_K = 0.5
BAC_current           += crash_premium
new_remaining_duration = ceil( remaining_duration × (1 − a) )
rebaseline( new_BAC_current − cumulative_spend, new_remaining_duration )
```

- The re-spread of a larger remaining budget over fewer months raises the monthly burn accordingly.

**Trade-offs by design.** Speed-up involves three simultaneous costs:

| Effect | Direction | Reason |
|---|---|---|
| Monthly funding demand | Increases | Larger budget spread over fewer months |
| Total project cost (BAC) | Increases | Crash premium applied to remaining budget |
| Finish date | Earlier | Fewer remaining months |

The crash premium (coefficient 0.5) ensures that finishing earlier is never strictly cheaper than proceeding normally: the real-cost saving from avoiding future inflation months is partially offset by the premium. Without this, speed-up would dominate every decision in a high-inflation run.

**Interaction with the shortfall panel.** Because speed-up raises monthly demand, it may trigger a shortfall on the next advance. This is intended behaviour: crashing pulls cash forward, and the user must verify that funds are available.

**Duration cap.** A speed-up may not compress remaining duration below 1 month.

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

- A project is **slowed** — voluntarily or during shortfall resolution (Section 7).
- A project is **sped up** (Section 5.6).
- A project is **resumed** after suspension — with the 10% duration penalty applied first.
- A **risk event** alters cost or duration (Section 8).

### 6.3 Rebaseline Routine (single shared routine)

A rebaseline re-derives a project's forward spend profile from its **remaining budget** and **remaining duration**:

```
remaining_budget   = BAC_current − cumulative_spend_to_date
remaining_duration = (new remaining months, per the triggering rule)
new S-curve        = generateSCurve(remaining_budget, remaining_duration)
```

After a rebaseline the project runs normally on the new S-curve. No residual multiplier persists — the new baseline *is* the plan. This single routine serves slowdown, speed-up, resume, and risk-event reschedules.

---

## 7. Funding Shortfall Management (Manual Resolution)

### 7.1 Monthly Check

At the start of each month, after fund release, inflation, and risk evaluation, the system computes:

```
Monthly Demand    = Σ inflation-adjusted spend(t) for all Active projects this month
Available Balance = Carried-forward balance + any quarterly release this month
```

### 7.2 Shortfall Resolution Panel

If `Monthly Demand > Available Balance`, the simulation **pauses** and presents a Shortfall Resolution panel. There is **no automatic duration extension**. The user resolves the shortfall using any combination of three levers, applied to one or more Active projects:

| Lever | Effect |
|---|---|
| **Slow down** | Enter a slowdown % for a project; its remaining budget is re-spread over a longer remaining duration, lowering this month's burn (Section 7.3). |
| **Suspend** | Removes the project's demand entirely for the current and subsequent months until resumed (Section 5.3). |
| **Abandon** | Permanently removes the project and its demand; sunk costs lost; score penalty applies (Section 5.5). |

Note: **Speed Up is not available as a shortfall lever** — it raises demand and would worsen the gap. It remains available during the normal decision phase each month.

### 7.3 Slowdown Mechanics

A slowdown of **s** (0 ≤ s < 1) on an Active project rebaselines it as follows:

```
new_remaining_duration = ceil( remaining_duration / (1 − s) )
rebaseline( remaining_budget, new_remaining_duration )        // per Section 6.3
```

The reduction in this month's funding demand is the **emergent result** of re-spreading the same remaining budget over a longer schedule. Approximate relationship: monthly burn scales with `(1 − s)` and remaining duration scales with `1 / (1 − s)`. A 50% slowdown roughly halves the burn and roughly doubles the remaining duration.

Notes:
- A slowdown may push a project's completion beyond Month 60, in which case it ends as **Expired** (partial penalty).
- Slowing increases a project's real total cost, because the additional months continue to inflate.
- The slowdown is a one-time rebaseline and does not persist as an ongoing multiplier.

### 7.4 Advance Gate

The user iterates on the three levers until `Monthly Demand ≤ Available Balance`. The **Advance to Next Month** button remains disabled until this condition is met.

### 7.5 Speed Up Mechanics

A speed-up of compression **a** (0 < a < 1) on an Active project applies as follows (available outside the shortfall panel only):

```
crash_premium          = remaining_budget × 0.5 × a
BAC_current           += crash_premium
new_remaining_duration = max( 1, ceil( remaining_duration × (1 − a) ) )
rebaseline( BAC_current − cumulative_spend, new_remaining_duration )   // per Section 6.3
```

The increase in this month's funding demand is the emergent result of re-spreading a larger remaining budget over fewer months. A 40% compression roughly doubles the monthly burn and adds 20% to the remaining BAC.

---

## 8. Risk Events

### 8.1 Milestone Triggers

Risk events are evaluated when an Active project's **cumulative spend** first crosses each of three thresholds:

| Milestone | Cumulative Spend Threshold (% of current BAC) |
|---|---|
| Early | 25% |
| Mid | 50% |
| Late | 75% |

This basis is robust to rebaselining (slowdown, speed-up, resume, prior risk events), unlike calendar-duration milestones. At each milestone, the system independently rolls for cost and duration risk:

- **Cost Risk:** with probability equal to the project's Cost Risk Factor, the BAC increases or decreases by that factor (equal chance of either sign).
- **Duration Risk:** with probability equal to the project's Duration Risk Factor, the remaining duration increases or decreases by that factor.

Each milestone fires **at most once** per project, and risk events do **not** compound across milestones. Any cost or duration change triggers a rebaseline (Section 6.3).

### 8.2 Risk Event Notification

When a risk event triggers, a **visible alert/event card** appears in the monthly decision panel:

```
⚠  RISK EVENT — [Project Title]
    Milestone reached: 50% of budget spent
    Cost increased by 12% → New BAC: $X.XXM
    Duration extended by 2 months → New end: Month 34
    [Dismiss]
```

The S-curve and cash flow projections update immediately.

---

## 9. Scoring & Assessment

### 9.1 Composite Score

At the end of month 60, the user receives a **composite score out of 100** based on three equally weighted components:

| Component | Weight | Calculation |
|---|---|---|
| **Delivery Score** | 40 | `(Projects Completed / Max Possible Completions) × 40`, capped at 40 |
| **Strategic Alignment Score** | 35 | `(Avg alignment fraction of completed projects) × 35` |
| **Budget Efficiency Score** | 25 | `(1 − Budget Wasted Ratio) × 25` |

```
Budget Wasted Ratio = (Sunk costs on abandoned projects + unspent budget at month 60) / Total Portfolio Budget
```

**Max Possible Completions** is computed deterministically by greedy cheapest-first packing: sort the 30 projects by initial BAC ascending and count how many fit within the total portfolio budget cumulatively. (With the 1.5× calibration this is ≈20.)

Alignment is stored and scored as a fraction (0.20–1.00); the average of completed projects is multiplied directly by 35. If no projects are completed, the Alignment component is 0.

### 9.2 Penalties

| Event | Penalty |
|---|---|
| Project abandoned | −2 points per project |
| Project expired (in portfolio at month 60 but incomplete) | −1 point per project |

Penalties are subtracted from the raw composite score, floored at 0.

### 9.3 Performance Bands

| Score | Rating |
|---|---|
| 85–100 | **Excellent** — Exceptional portfolio manager |
| 70–84 | **Good** — Sound decisions with minor inefficiencies |
| 55–69 | **Satisfactory** — Room for improvement in prioritisation |
| 40–54 | **Poor** — Significant inefficiencies observed |
| 0–39 | **Needs Development** — Fundamental decision-making gaps |

### 9.4 End-of-Simulation Debrief

The debrief screen shows:
- Final composite score and rating.
- Breakdown of all three scoring components with penalty detail.
- **Decision timeline**: all project actions (add, speed up, slow down, suspend, resume, abandon) with the month and compression/slowdown percentage where applicable.
- Comparison of the user's delivered portfolio vs an **optimal benchmark portfolio**, computed by a greedy alignment-per-dollar knapsack heuristic: rank projects by `alignment / initial BAC` and fill until the budget is exhausted.
- Strategic alignment of delivered projects vs the available-pool average.
- Key decision moments highlighted (e.g. "Speeding up P12 at month 49 brought delivery forward from M66 to M59").

---

## 10. User Interface

### 10.1 Layout and Theme

**Split-view layout** with two primary panels:

```
┌─────────────────────────┬──────────────────────────────────────┐
│   MONTHLY DECISION      │         PORTFOLIO DASHBOARD          │
│   PANEL (left)          │         (right)                      │
│                         │                                       │
│  Month: 14 / 60         │  [Tab: Cash Flow] [Gantt] [S-Curves] │
│  Available Funds: $X.XM │  [KPI Summary]                       │
│                         │                                       │
│  ► Active Projects      │  [Visualisation Area]                │
│  ► Available Projects   │                                       │
│  ► Suspended Projects   │                                       │
│  ► Risk Event Alerts    │                                       │
│                         │                                       │
│  [Advance to Next Month]│                                       │
└─────────────────────────┴──────────────────────────────────────┘
```

The interface defaults to a **light theme** (white panels, dark text). A **sun/moon toggle** in the header switches to the dark theme (dark navy panels, light text). All colours — state badges, chart lines, overlays, and scrims — follow the active theme. The choice is not persisted between sessions.

**Semantic state colour palette** (consistent across both themes):

| State | Colour |
|---|---|
| Active | Blue |
| Suspended | Amber |
| Completed | Green |
| Abandoned | Grey |
| Expired | Red |
| Primary action / Add | Indigo (distinct from all state colours) |

### 10.2 Monthly Decision Panel

- **Month indicator** and progress bar (current month / 60).
- **Funds summary:** available balance, next quarterly release date.
- **Risk event alerts** (dismissible cards, shown at top when triggered).
- **Active Projects list:** each card shows % complete (progress bar), current BAC, inflation-adjusted monthly spend, projected completion month, and four action buttons:
  - **Speed** (fast-forward icon) — opens Speed Up modal (Section 10.6).
  - **Slow** (rewind icon) — opens Slow Down modal.
  - **Suspend** — immediately pauses the project.
  - **Abandon** — permanently removes the project.
- **Suspended Projects list:** projects on hold with their inflating remaining cost; Resume and Abandon buttons.
- **Available Projects list:** sortable/filterable table of unstarted projects (Title, inflation-adjusted BAC, Duration, Alignment, Risk Factors, Add button).
- **Shortfall Resolution panel:** appears when demand > available; provides slow/suspend/abandon controls and live demand-vs-available recomputation; Advance stays disabled until resolved.
- **Advance button:** disabled while a shortfall is unresolved.

### 10.3 Dashboard Visualisations

#### Tab 1: Cash Flow Chart
- Line chart of **Required Monthly Spend** (aggregate active S-curves) vs **Available Funds** across all 60 months.
- Projected shortfall months visible where the required line exceeds the available line.
- Quarterly release markers as vertical dashed lines; current month as a vertical cursor.

#### Tab 2: Portfolio Gantt Chart
- One row per portfolio project; bars colour-coded by state.
- Milestone markers (25/50/75%) on each bar; risk-event icons where triggered; current-month cursor.

#### Tab 3: S-Curve Overlays
- Cumulative spend (% of BAC) over time for each active project.
- Original baseline shown dashed; current (rebaselined) curve solid — divergence reflects all slowdowns, speed-ups, risk events, and resumes.
- Filterable by project.

#### Tab 4: KPI Summary Dashboard
- **Projects Delivered:** count and gauge vs max possible.
- **Portfolio Budget Used:** % spent vs available.
- **Average Strategic Alignment:** of active + completed projects.
- **Projected Final Score:** live estimate on current trajectory.
- **Projects At Risk:** count with late projected finish or high funding pressure.
- **Months Remaining:** countdown.

### 10.4 Project Card (Available Pool)

| Field | Display |
|---|---|
| Title | Project name |
| BAC | Current inflation-adjusted budget |
| Duration | Planned months |
| Alignment | Score badge (green ≥70%, amber 40–69%, red <40%) |
| Cost Risk | % risk factor |
| Duration Risk | % risk factor |
| Status | Available / greyed out if BAC exceeds remaining balance |

Sortable by alignment, BAC, duration, and risk factors.

### 10.5 Hint Advisor

A **Hint** button (lightbulb icon) in the header is available throughout the simulation. It opens a coaching card that analyses the current portfolio state and recommends the single most valuable next move. The card names the specific project, states the financial reasoning, and — where the recommended action is Add or Speed Up — offers a one-tap **Apply** button to execute it immediately.

**Priority logic** (first matching condition wins):

| Priority | Condition | Recommendation |
|---|---|---|
| 1 | Monthly demand exceeds available funds | Name the lowest-alignment active project to slow or suspend; explain the burn reduction. |
| 2 | Late game (≤14 months left) and active projects project past Month 60 | If a well-advanced project (≥45% complete) can be rescued with a speed-up, recommend that speed-up with the compression pre-calculated to fit the remaining window. Otherwise recommend abandoning the weakest expiring project to recover funds. |
| 3 | Available balance > 1.5 × quarterly release and a high-alignment affordable project can finish in time | Recommend adding the highest-alignment affordable project; note the inflation penalty for waiting. |
| 4 | Suspended projects exist | Name the highest-alignment suspended project; recommend resuming (and note the 10% duration penalty) or abandoning the weakest. |
| 5 | Multiple active projects project past Month 60 | Recommend concentrating funds by suspending the lowest-alignment overrun. |
| 6 | Portfolio balanced | Confirm good standing; show the live projected score. |

The hint card closes with a disclaimer: *"Guidance is heuristic — a coaching prompt, not the only correct move. The judgement stays yours."*

### 10.6 Speed Up Modal

Opened via the **Speed** button on any active project card. Contains:

- Compression slider: 5%–60%, in 5% steps.
- Live preview of four metrics before and after the chosen compression:
  - Remaining months
  - Monthly burn
  - Projected finish month (flagged if > Month 60)
  - New BAC including crash premium
- **Apply speed-up** button and Cancel.

---

## 11. Technical Architecture

### 11.1 Platform

- **Single-page React application** (HTML/CSS/JS, no backend).
- All simulation state held in memory during the session.
- Persistent storage via the `window.storage` API for saving/resuming sessions.

### 11.2 Key Data Structures

```javascript
// Simulation state
{
  month: Number,                    // Current month (1–60)
  annualRate: Number,               // e.g. 0.03
  monthlyRate: Number,              // Derived: (1 + annual)^(1/12) - 1
  totalBudget: Number,
  quarterlyRelease: Number,         // totalBudget / 20
  availableBalance: Number,
  released: Number,                 // Cumulative funds released so far
  maxComp: Number,                  // Greedy cheapest-first packing count
  projects: Project[],
  events: RiskEvent[],
  decisions: Decision[],            // Full audit trail
  alerts: RiskEvent[],              // Current-month dismissible alerts
  history: MonthHistory[],          // { month, demand, balanceAfter }
  status: "running" | "ended"
}

// Project
{
  id: String,                       // P01–P30
  title: String,
  bacInitial: Number,               // Original BAC at generation
  bacCurrent: Number,               // After inflation / crash premiums / risk events
  alignment: Number,                // 0.20–1.00 (fraction)
  durationPlanned: Number,          // Original baseline months
  durationCurrent: Number,          // After all rebaselines
  costRisk: Number,                 // 0.05–0.20
  durRisk: Number,                  // 0.05–0.20
  state: Enum,                      // available | active | suspended | completed | abandoned | expired
  startMonth: Number | null,
  completionMonth: Number | null,
  nominalSpent: Number,             // Cumulative nominal spend (pre-inflation)
  cashDrawn: Number,                // Cumulative inflation-adjusted cash drawn
  sCurve: Number[],                 // Forward monthly spend array (rebaselined on changes)
  sCurveBaseline: Number[],         // Original curve, kept for S-Curve tab divergence display
  milestones: Number[],             // Triggered thresholds, e.g. [25, 50]
  suspendPenalty: Number            // Accumulated penalty months from all suspensions
}

// Decision (audit log entry)
{
  month: Number,
  type: "add" | "speed" | "slow" | "suspend" | "resume" | "abandon",
  id: String,
  title: String,
  a: Number | undefined,            // Compression % for speed-up decisions
  s: Number | undefined             // Slowdown % for slow decisions
}
```

### 11.3 S-Curve Computation

```javascript
const CRASH_K = 0.5;               // Crash premium coefficient

function betaCDF(x) {
  return 3 * x * x - 2 * x * x * x;   // regularised incomplete Beta, α=β=2
}

function generateSCurve(budget, durationMonths) {
  const d = Math.max(1, Math.round(durationMonths));
  const curve = [];
  for (let t = 1; t <= d; t++) {
    curve.push(budget * (betaCDF(t / d) - betaCDF((t - 1) / d)));
  }
  return curve;
}

// Shared rebaseline routine (slowdown / speed-up / resume / risk event)
function rebaseline(project, newRemainingDuration, atMonth) {
  const remainingBudget = Math.max(0, project.bacCurrent - project.nominalSpent);
  project.sCurve = generateSCurve(remainingBudget, newRemainingDuration);
  project.durationCurrent = (atMonth - project.startMonth) + project.sCurve.length;
}

// Slow down
function slowProject(sim, id, s) {
  const p = sim.projects.find(x => x.id === id);
  rebaseline(p, Math.ceil(p.sCurve.length / (1 - s)), sim.month);
}

// Speed up (schedule crashing)
function speedProject(sim, id, a) {
  const p = sim.projects.find(x => x.id === id);
  const remBudget = p.bacCurrent - p.nominalSpent;
  const premium = remBudget * CRASH_K * a;
  p.bacCurrent += premium;
  rebaseline(p, Math.max(1, Math.ceil(p.sCurve.length * (1 - a))), sim.month);
}
```

### 11.4 Inflation Compounding

```javascript
const monthlyRate = Math.pow(1 + annualRate, 1 / 12) - 1;

// BAC of unstarted project at month n:
bac_n = bac_initial * Math.pow(1 + monthlyRate, n);

// Inflation-adjusted demand for a nominal spend s at global month n:
demand_inflated = s * Math.pow(1 + monthlyRate, n);
```

---

## 12. Simulation Flow Summary

```
START
  └─ Setup: set inflation rate → generate 30 projects + budget
            → compute maxComp (greedy cheapest-first packing)

MONTH LOOP (months 1 to 60):
  ├─ If start of quarter: release quarterly funds → add to available balance
  ├─ Apply monthly inflation to unstarted project BACs
  ├─ Check risk milestones (cumulative spend crossing 25/50/75%) → rebaseline + alert
  ├─ Calculate monthly demand (all active projects, inflation-adjusted)
  ├─ If demand > available balance:
  │     └─ PAUSE → Shortfall Resolution panel (manual):
  │         ├─ Slow project(s)    → rebaseline over longer remaining duration
  │         ├─ Suspend project(s) → remove from demand
  │         └─ Abandon project(s) → remove permanently, score penalty
  │         (loop until demand ≤ available; Advance stays disabled)
  ├─ Deduct monthly spend from available balance
  ├─ Advance cumulative spend / progress on all active projects
  ├─ Mark any project reaching 100% of BAC as Completed
  ├─ DECISION PHASE: user may —
  │     ├─ Add project(s) from Available pool (begin spending next month)
  │     ├─ Speed up active project(s)    → crash premium + rebaseline over shorter duration
  │     ├─ Slow active project(s)        → rebaseline over longer duration
  │     ├─ Suspend active project(s)
  │     ├─ Resume suspended project(s)   → +10% duration penalty, rebaseline
  │     ├─ Abandon project(s)
  │     └─ Request a hint (Hint button)  → context-aware coaching card
  └─ Advance to Month + 1

END (Month 60):
  ├─ Mark incomplete portfolio projects as Expired
  ├─ Calculate composite score (components + penalties, floored at 0)
  └─ Show debrief screen (score, decision timeline, optimal benchmark comparison)
```

---

## 13. Open Items / Future Enhancements

| Item | Notes |
|---|---|
| Difficulty modes | Easy (lower inflation, more budget), Hard (higher inflation, tighter budget) |
| Resource constraints | Limit concurrent active projects to simulate team capacity |
| Scenario events | Random external shocks (market downturn, regulatory change) affecting multiple projects simultaneously |
| Leaderboard | Compare scores across multiple sessions or users |
| Export | Download session log and debrief as PDF |
