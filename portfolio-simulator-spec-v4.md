# Portfolio Simulator — Full Specification

**Version:** 4.0
**Date:** June 2026
**Supersedes:** v3.0 (June 2026)
**Purpose:** Training tool for portfolio managers to develop skills in project selection, funding decisions, and portfolio optimisation over a 60-month simulation horizon.

---

## 0. Change Log

### v4.0 — June 2026 (this version)

Eight configuration parameters added to the setup screen, each fully wired into the engine. Two new UI features added.

| # | Area | Change |
|---|---|---|
| 1 | Difficulty presets (Section 2.1) | Four preset tiles — Learning, Standard, Advanced, Custom — pre-fill all parameters with one click. Custom exposes all parameters individually. |
| 2 | Funding profile (Section 2.1, 4.1) | Five selectable release patterns replace the hardcoded flat schedule: Flat, S-Curve, Front-loaded, Back-loaded, Volatile. The engine pre-computes a 20-quarter release schedule at simulation start. |
| 3 | Budget tightness (Section 2.1, 3.2) | The hardcoded 1.5× scarcity divisor is now a user-selectable parameter (1.2×, 1.5×, 1.8×, 2.2×), controlling how many projects are completable. |
| 4 | Political projects (Section 2.1, 5.7) | The user selects 0–5 mandatory projects. At simulation start, the N lowest-alignment projects are forced into Active state and are locked against abandonment until Month 24. |
| 5 | Concurrent project cap (Section 2.1, 5.2) | An optional ceiling on simultaneously Active + Pending projects. When the cap is reached, the Add button is disabled and a warning is shown. |
| 6 | Approval lag / Pending state (Section 2.1, 5.2, 5.8) | An optional delay (0–6 months) between adding a project and it beginning to draw funds. Projects in this window enter a new **Pending** state: BAC is locked at the addition-time figure, no cash is drawn, and a countdown shows in the decision panel. |
| 7 | Risk environment (Section 2.1, 8.1) | A multiplier (0.5×, 1.0×, 1.5×) scales all generated project risk factors up or down uniformly at generation time, capped at 0.40 per factor. |
| 8 | Scoring visibility (Section 2.1, 10.2, 10.4) | Two optional information restrictions: **Blind alignment** hides alignment scores in the available pool; **Blind score** hides the live projected score in the header and KPI tab. |
| 9 | Portfolio Status Report (Section 10.7) | A **Report** button in the simulation header calls the Anthropic API to generate a PMO-style narrative report from the live simulation state, covering seven structured sections. |
| 10 | Rules / How to Play modal (Section 10.8) | A **How to Play** button on the setup screen opens a six-tab reference modal covering Objective, Projects, Actions, Funding, Risk, and Scoring. |

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

The Portfolio Simulator is an interactive, browser-based training tool that places the user in the role of a portfolio manager. Over a simulated 60-month period, they must select, fund, monitor, accelerate, slow, and occasionally suspend or abandon projects from a pool of 30 candidates — with the objective of maximising the number of strategically aligned projects delivered within budget and time constraints.

The simulation is fully configurable before each run: inflation, funding pattern, scarcity, mandatory political projects, institutional capacity constraints, approval process delays, risk environment, and information transparency can all be varied, producing a wide range of training scenarios from a gentle introduction to a pressure-tested advanced exercise.

At the end of the simulation, the user receives a composite performance score and a detailed debrief comparing their decisions against an optimal benchmark.

---

## 2. Simulation Parameters

### 2.1 Setup Screen

The setup screen presents a **difficulty preset selector** and an expandable **Custom** configuration panel. Selecting a preset auto-fills all parameters; selecting Custom exposes them individually.

#### 2.1.1 Difficulty Presets

| Preset | Inflation | Funding | Tightness | Political | Cap | Lag | Risk | Visibility |
|---|---|---|---|---|---|---|---|---|
| **Learning** | 2% | Flat | 1.2× | 0 | None | None | Calm (0.5×) | Full |
| **Standard** | 3% | S-Curve | 1.5× | 2 | None | None | Normal (1.0×) | Full |
| **Advanced** | 5% | Volatile | 1.8× | 4 | 8 | 2 months | Turbulent (1.5×) | Blind score |
| **Custom** | User-set | User-set | User-set | User-set | User-set | User-set | User-set | User-set |

#### 2.1.2 Individual Parameters

| Parameter | Options | Effect |
|---|---|---|
| **Run name** | Free text | Label for the session |
| **Inflation rate** | 0%–20% p.a. (slider, 0.5% steps) | Monthly rate derived as `(1 + annual)^(1/12) − 1` |
| **Funding profile** | Flat / S-Curve / Front-loaded / Back-loaded / Volatile | Shape of the 20-quarter release schedule (Section 4.1) |
| **Budget tightness** | 1.2× / 1.5× / 1.8× / 2.2× | Divisor applied to total raw BAC; controls number of completable projects |
| **Political projects** | 0–5 (slider) | Count of mandatory low-alignment projects forced in at start (Section 5.7) |
| **Concurrent cap** | Unconstrained / 5 / 8 / 12 | Maximum simultaneous Active + Pending projects |
| **Approval lag** | None / 2 / 4 / 6 months | Delay from adding a project to it drawing funds (Section 5.8) |
| **Risk environment** | Calm (0.5×) / Normal (1.0×) / Turbulent (1.5×) | Scales all generated project risk factors at generation; individual factors capped at 0.40 |
| **Scoring visibility** | Full / Blind alignment / Blind score / Full blind | Controls which information is shown during the run (Section 10.2, 10.4) |

#### 2.1.3 Setup Screen Summary Bar

A four-cell bar below the panel reflects the active Inflation, Funding, Political, and Risk settings at a glance, updating as the user adjusts parameters.

### 2.2 Time Horizon

- **Total duration:** 60 months
- **Decision frequency:** Once per month
- **Funding release frequency:** Once per quarter at the start of Months 1, 4, 7 … 58 (20 releases total)

---

## 3. Project Pool

### 3.1 Project Attributes

Each of the 30 projects is randomly generated at simulation start with the following attributes:

| Attribute | Range | Notes |
|---|---|---|
| Project ID | P01–P30 | Fixed identifier |
| Title | Descriptive name | e.g. "Digital Customer Portal", "Supply Chain Overhaul" |
| Budget at Completion (BAC) | $2M–$15M (uniform) | Scaled per Section 3.2; inflates monthly while unstarted |
| Strategic Alignment Score | 0.20–1.00 (fraction) | Displayed as 20%–100%. Fixed at generation; not affected by inflation |
| Duration | 12–36 months | Baseline planned duration |
| Duration Risk Factor | 0.05–0.20 base, scaled by risk multiplier | % variation in duration at milestones; capped at 0.40 |
| Cost Risk Factor | 0.05–0.20 base, scaled by risk multiplier | % variation in BAC at milestones; capped at 0.40 |

### 3.2 Budget Calibration

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

### 3.3 Inflation on Unstarted Projects

Projects not yet added to the portfolio see their BAC increase each month due to inflation:

```
BAC_month(n) = BAC_initial × (1 + monthly_inflation_rate)^n
```

where `n` is the number of months elapsed since simulation start.

---

## 4. Funding Model

### 4.1 Funding Profiles and Release Schedule

At simulation start, the engine pre-computes a **20-element release schedule** — one amount per quarter — based on the selected funding profile. The schedule is fixed for the entire run. Releases occur at the start of Months 1, 4, 7 … 58 (quarter index qi = 0, 1 … 19).

```
qi = floor( (month − 1) / 3 )
```

| Profile | Release pattern | Formula |
|---|---|---|
| **Flat** | Equal every quarter | `release[qi] = totalBudget / 20` |
| **S-Curve** | Slow early, peaks mid-run, tapers | `weights[qi] = betaCDF((qi+1)/20) − betaCDF(qi/20)` then normalised to `totalBudget` |
| **Front-loaded** | Large early, declining each quarter | `weights[qi] = 20 − qi` then normalised |
| **Back-loaded** | Small early, growing each quarter | `weights[qi] = qi + 1` then normalised |
| **Volatile** | Flat ±20% random variation | `weights[qi] = uniform(0.8, 1.2)` then normalised to ensure Σ = `totalBudget` |

The Volatile profile uses the same random seed as project generation, so the release pattern is deterministic for a given run but unpredictable to the user.

The Cash Flow tab projects all 60 months using the full schedule, so upcoming shortfalls caused by back-loading or volatile dips are visible in advance.

### 4.2 Available Balance and Carry-Forward

Unused funds carry over each quarter. There is no "use it or lose it" rule.

```
Available Balance (start of quarter qi) = release[qi] + Unspent Carry-Forward
```

### 4.3 Inflation Adjustment on Demand

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
| **Pending** | Added but awaiting approval lag expiry. BAC locked at addition-time figure; no funds drawn; countdown shown in decision panel. |
| **Active** | In the portfolio; consuming funds per its (possibly rebaselined) S-curve. |
| **Suspended** | Paused by the user. No new funds consumed. Remaining cost continues to inflate. |
| **Completed** | Delivered within the 60-month window. Counts toward score. |
| **Abandoned** | Removed from portfolio permanently. Sunk costs are lost. −2 score penalty. |
| **Expired** | Still in portfolio at month 60 but not completed (including projects still Pending at month 60). −1 score penalty. |

### 5.2 Adding a Project

- The user selects a project from the Available pool and clicks **Add to Portfolio**.
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

- The user may permanently abandon any Active or Suspended project, subject to the political lock constraint (Section 5.7).
- Sunk costs are not recovered.
- The project is removed from all cash flow calculations.
- Abandoned projects incur a **−2 score penalty** (Section 9.2).

### 5.6 Speed Up (Schedule Crashing)

The user may accelerate any Active project by compressing its remaining schedule. This models **schedule crashing** — buying time by increasing resource intensity.

- The user selects a **compression percentage a** (5%–60%) via the Speed Up modal (Section 10.6).
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
Available Balance = Carried-forward balance + this quarter's scheduled release (if applicable)
```

### 7.2 Shortfall Resolution Panel

If `Monthly Demand > Available Balance`, the simulation **pauses**. The user resolves the shortfall using any combination of:

| Lever | Effect |
|---|---|
| **Slow down** | Re-spreads remaining budget over a longer schedule, lowering monthly burn (Section 7.3). |
| **Suspend** | Removes the project's demand entirely until resumed (Section 5.3). |
| **Abandon** | Permanently removes the project; sunk costs lost; −2 score penalty (subject to political lock). |

Speed Up is not available as a shortfall lever.

### 7.3 Slowdown Mechanics

```
new_remaining_duration = ceil( remaining_duration / (1 − s) )
rebaseline( remaining_budget, new_remaining_duration )
```

A 50% slowdown roughly halves the monthly burn and doubles the remaining duration. A slowdown may push completion past Month 60, resulting in **Expired** state. Total real cost rises slightly due to additional inflation months.

### 7.4 Advance Gate

The Advance to Next Month button remains **disabled** until `Monthly Demand ≤ Available Balance`.

### 7.5 Speed Up Mechanics (voluntary, outside shortfall)

```
crash_premium          = remaining_budget × 0.5 × a
BAC_current           += crash_premium
new_remaining_duration = max( 1, ceil( remaining_duration × (1 − a) ) )
rebaseline( BAC_current − cumulative_spend, new_remaining_duration )
```

A 40% compression roughly doubles the monthly burn and adds 20% to remaining BAC.

---

## 8. Risk Events

### 8.1 Risk Factors and the Risk Environment Multiplier

Project cost and duration risk factors are generated in the range 0.05–0.20 and then scaled by the **risk environment multiplier** set at setup:

| Setting | Multiplier | Effective factor range |
|---|---|---|
| Calm | 0.5× | 0.025–0.10 |
| Normal | 1.0× | 0.05–0.20 |
| Turbulent | 1.5× | 0.075–0.30 (capped at 0.40) |

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

At the end of Month 60, the user receives a **composite score out of 100**:

| Component | Weight | Calculation |
|---|---|---|
| **Delivery Score** | 40 | `(Projects Completed / Max Possible Completions) × 40`, capped at 40 |
| **Strategic Alignment Score** | 35 | `(Avg alignment fraction of completed projects) × 35` |
| **Budget Efficiency Score** | 25 | `(1 − Budget Wasted Ratio) × 25` |

```
Budget Wasted Ratio = (Sunk costs on abandoned projects + unspent balance at month 60) / Total Budget
```

Max Possible Completions is computed by greedy cheapest-first packing at simulation start and reflects the chosen budget tightness. With Standard (1.5×) it is ≈20; with Severe (2.2×) it is ≈14.

### 9.2 Penalties

| Event | Penalty |
|---|---|
| Project abandoned | −2 points |
| Project expired (Active, Suspended, or Pending at Month 60) | −1 point |

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

- Final score, band, and component breakdown with penalty detail.
- Full decision timeline (add, speed up, slow, suspend, resume, abandon) with month and percentages.
- Comparison against the **optimal benchmark portfolio** (greedy alignment-per-dollar knapsack).
- Strategic alignment of delivered projects vs available-pool average.
- Outcome mix chart (completed, expired, abandoned proportions).

---

## 10. User Interface

### 10.1 Layout and Theme

Split-view layout with a sticky header:

```
┌──────────────────────────────────────────────────────────────────┐
│  [Logo] Run name · Month 14/60 ▓▓▓▓▓░░░  Available $X.XM        │
│  [Report] [Hint] [☀/☾] [Save] [Advance →]                       │
└──────────────────────────────────────────────────────────────────┘
┌─────────────────────────┬──────────────────────────────────────┐
│   MONTHLY DECISION      │         PORTFOLIO DASHBOARD          │
│                         │  [Cash Flow] [Gantt] [S-Curves] [KPI]│
│  Risk event alerts      │                                       │
│  ► Active Projects      │  [Visualisation Area]                │
│  ► Pending Approval     │                                       │
│  ► Suspended Projects   │                                       │
│  ► Available Pool       │                                       │
└─────────────────────────┴──────────────────────────────────────┘
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
| Primary action | Indigo (same hue as Pending; distinct from green/amber/red) |

### 10.2 Monthly Decision Panel

- **Month indicator** and progress bar (current month / 60).
- **Funds summary:** available balance, next scheduled release amount and month.
- **Risk event alerts** (dismissible cards at top when triggered).
- **Active Projects list:** each card shows:
  - Progress bar and % complete badge.
  - BAC, inflation-adjusted monthly spend, projected completion month.
  - Political badge ("🔒 locked to M24" or "political").
  - Four action buttons: **Speed** · **Slow** · **Suspend** · **Abandon** (Abandon disabled during political lock; buttons wrap on narrow screens).
- **Pending Approval list** (shown when approval lag > 0 and projects are pending): each card shows locked BAC, countdown to activation. No actions available.
- **Suspended Projects list:** remaining cost with inflation note; **Resume** (+10% duration penalty) and **Abandon** buttons.
- **Available Projects list:** sortable table — if **Blind alignment** is active, the Alignment column is hidden. If **Concurrent cap** is reached, a warning banner is shown and the Add button is disabled.
- **Shortfall Resolution panel:** appears when demand > available; slow/suspend/abandon levers; live demand-vs-available counter; Advance stays disabled until resolved.

### 10.3 Dashboard Visualisations

#### Tab 1: Cash Flow Chart
- Required Monthly Spend vs Available Funds across all 60 months.
- Projection uses the pre-computed release schedule (not a flat amount), so S-curve or back-loaded funding dips are visible in advance.
- Quarterly release markers as vertical dashed lines; current-month cursor in indigo.

#### Tab 2: Portfolio Gantt Chart
- One row per portfolio project; bars colour-coded by state.
- Pending projects shown as a lighter bar from addition month to activation month.
- Milestone markers (25/50/75%); risk-event icons; current-month cursor.

#### Tab 3: S-Curve Overlays
- Cumulative spend (% of BAC) over time for each project.
- Original baseline dashed; current plan solid — divergence reflects all rebaselines.
- Filterable by project.

#### Tab 4: KPI Summary Dashboard
- Projects Delivered gauge; Portfolio Budget Used gauge; Projected Score gauge (hidden if Blind score is active).
- Average Strategic Alignment of active + completed projects (hidden if Blind alignment).
- Projects At Risk count; Months Remaining countdown; Available Funds.

### 10.4 Project Card (Available Pool)

| Field | Display |
|---|---|
| Title | Project name with ID |
| Alignment | Badge (green ≥70%, amber 40–69%, red <40%) — **hidden** if Blind alignment |
| BAC | Current inflation-adjusted budget |
| Duration | Planned months |
| Risk c/d | Cost / duration risk factors |
| Add | Button; disabled if unaffordable or cap reached |

Sortable by BAC, duration, and risk factors. When Blind alignment is active, alignment sort is removed.

### 10.5 Hint Advisor

A **Hint** button (lightbulb icon) in the header opens a coaching card. Priority logic (first matching condition wins):

| Priority | Condition | Recommendation |
|---|---|---|
| 1 | Monthly demand > available balance | Name the lowest-alignment active project to slow or suspend. |
| 2 | ≤14 months left and active projects project past Month 60 | If a well-advanced project (≥45% complete) can be rescued by speed-up, recommend it with compression pre-calculated. Otherwise recommend abandoning the weakest expiring project. |
| 3 | Balance > 1.5× quarterly release and affordable high-alignment project available | Recommend adding it; note inflation cost of waiting. |
| 4 | Suspended projects exist | Recommend resuming the highest-alignment one or abandoning the weakest. |
| 5 | Multiple active projects project past Month 60 | Recommend suspending the lowest-alignment overrun. |
| 6 | Portfolio balanced | Confirm good standing; show projected score (unless Blind score). |

The card includes a one-tap **Apply** button for Add and Speed Up recommendations. Closes with: *"Guidance is heuristic — a coaching prompt, not the only correct move. The judgement stays yours."*

### 10.6 Speed Up Modal

- Compression slider: 5%–60%, in 5% steps.
- Live preview before/after: Remaining months · Monthly burn · Projected finish month (flagged if > M60) · New BAC with crash premium shown separately.
- **Apply speed-up** and Cancel.

### 10.7 Portfolio Status Report (AI-Generated)

A **Report** button (file icon) in the simulation header calls the **Anthropic API** (claude-sonnet-4-6) with a structured prompt containing the full live simulation state. The generated report follows a seven-section PMO narrative format:

1. **Executive Summary** — overall health, financial position, trajectory (3–4 sentences).
2. **Financial Position** — budget deployment rate, inflation exposure, cash flow outlook.
3. **Project Portfolio Status** — narrative on each state group (active, completed, suspended, abandoned).
4. **Strategic Alignment Analysis** — alignment of active projects vs pool average; high- and low-value callouts.
5. **Risk Profile** — risk events to date; projects at risk of expiry or cost overrun.
6. **Portfolio Manager Assessment** — frank evaluation of decisions made; what has been done well and what needs correction.
7. **Recommended Actions** — 3–5 specific, prioritised actions for the next 5 months, naming project IDs.

The modal renders in a serif typeface with section headers in the action colour. A loading spinner is shown while the API responds. Footer note: *"AI-generated report · for training purposes only."*

The prompt includes: month, remaining months, total / released / available budget, all project states with alignment and progress, last 8 decisions, last 5 risk events, and the live projected score.

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

---

## 11. Technical Architecture

### 11.1 Platform

- **Single-page React application** (HTML/CSS/JS, no backend).
- All simulation state held in memory during the session.
- Persistent storage via `window.storage` API for saving/resuming sessions.
- AI report generation via the Anthropic `/v1/messages` API (claude-sonnet-4-6, max_tokens 1000).

### 11.2 Key Data Structures

```javascript
// Simulation configuration (set at start, immutable during run)
config: {
  fundingProfile:    String,   // flat | scurve | frontloaded | backloaded | volatile
  budgetTightness:   Number,   // 1.2 | 1.5 | 1.8 | 2.2
  politicalProjects: Number,   // 0–5
  concurrentCap:     Number,   // 0 = unconstrained
  approvalLag:       Number,   // months (0 = none)
  riskMultiplier:    Number,   // 0.5 | 1.0 | 1.5
  blindAlignment:    Boolean,
  blindScore:        Boolean,
}

// Simulation state
{
  name: String,
  seed: Number,
  month: Number,                   // 1–60
  annualRate: Number,
  monthlyRate: Number,             // (1 + annual)^(1/12) − 1
  totalBudget: Number,
  releaseSchedule: Number[20],     // pre-computed quarterly releases
  quarterlyRelease: Number,        // current quarter's release (for display)
  availableBalance: Number,
  released: Number,                // cumulative releases to date
  maxComp: Number,                 // greedy cheapest-first packing count
  projects: Project[],
  events: RiskEvent[],
  decisions: Decision[],
  alerts: RiskEvent[],             // current-month dismissible alerts
  history: MonthHistory[],         // { month, demand, balanceAfter }
  status: "running" | "ended",
  config: Config,
  score: ScoreResult | undefined,
}

// Project
{
  id: String,                      // P01–P30
  title: String,
  bacInitial: Number,              // original BAC at generation
  bacCurrent: Number,              // after inflation / crash premiums / risk events
  alignment: Number,               // 0.20–1.00
  durationPlanned: Number,         // original baseline months
  durationCurrent: Number,         // after all rebaselines
  costRisk: Number,                // scaled by riskMultiplier; capped at 0.40
  durRisk: Number,
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
}

// Decision audit entry
{
  month: Number,
  type: "add" | "speed" | "slow" | "suspend" | "resume" | "abandon",
  id: String,
  title: String,
  a: Number | undefined,           // compression % for speed-up
  s: Number | undefined,           // slowdown % for slow
}
```

### 11.3 Release Schedule Computation

```javascript
function computeReleaseSchedule(totalBudget, profile, rng) {
  const N = 20;
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

bac_n         = bac_initial   * Math.pow(1 + monthlyRate, n);  // unstarted project BAC at month n
demand_inflated = nominal_spend * Math.pow(1 + monthlyRate, n);  // inflated demand at global month n
```

---

## 12. Simulation Flow Summary

```
SETUP
  └─ User selects preset or configures all parameters
     → newSim(config):
         generate 30 projects, scale risk factors by riskMultiplier
         totalBudget = Σ BAC / budgetTightness
         releaseSchedule = computeReleaseSchedule(profile)
         force N lowest-alignment projects Active (political lock until M24)
         maxComp = greedy cheapest-first packing count
         Q1 released → availableBalance = releaseSchedule[0]

MONTH LOOP (months 1 to 60):
  ├─ ACTIVATE PENDING: any project where month ≥ pendingUntil → Active,
  │     generate S-curve from locked BAC, arm risk milestones
  ├─ QUARTERLY RELEASE: if (month−1) % 3 === 0, add releaseSchedule[qi] to balance
  ├─ INFLATE AVAILABLE BACs: unstarted projects × monthly inflator
  ├─ RISK MILESTONES: check cumulative spend crossing 25/50/75% of BAC
  │     → independent rolls for cost and duration shocks → rebaseline + alert card
  ├─ DEMAND CHECK: Σ inflation-adjusted active spend this month
  ├─ If demand > available balance:
  │     └─ PAUSE → Shortfall Resolution panel:
  │         ├─ Slow → rebaseline over longer duration
  │         ├─ Suspend → zero demand
  │         └─ Abandon → remove (subject to political lock)
  │         (loop until demand ≤ available; Advance disabled)
  ├─ DEDUCT: availableBalance -= demand
  ├─ PROGRESS: advance all active S-curves; update nominalSpent and cashDrawn
  ├─ COMPLETE: any project whose S-curve is exhausted → Completed
  ├─ DECISION PHASE: user may —
  │     ├─ Add project (→ Pending if lag > 0, else → Active next month)
  │     ├─ Speed up active project    → crash premium + rebaseline shorter
  │     ├─ Slow active project        → rebaseline longer
  │     ├─ Suspend active project
  │     ├─ Resume suspended project   → +10% duration penalty, rebaseline
  │     ├─ Abandon (if not locked)
  │     ├─ Request Hint               → context-aware coaching card
  │     └─ Request Report             → AI-generated PMO narrative
  └─ Advance to Month + 1

END (Month 60):
  ├─ Mark Active, Suspended, Pending → Expired
  ├─ Score: Delivery + Alignment + Efficiency − Penalties (floored at 0)
  └─ Debrief: score breakdown · decision timeline · optimal benchmark comparison
```

---

## 13. Open Items / Future Enhancements

| Item | Notes |
|---|---|
| Scenario events | Random mid-run shocks (market downturn, regulatory change, budget freeze) affecting the full portfolio simultaneously |
| Leaderboard | Compare final scores across multiple sessions or cohort members |
| PDF export | Download session log and debrief as a formatted PDF |
| Configurable project pool | Allow the trainer to define real project titles, BACs, and alignment scores before running a session with a specific cohort |
| Variable political lock duration | Currently hardcoded at 24 months; could be a setup parameter |
| Post-decision commentary | Brief AI-generated note after each advance summarising what changed and flagging emerging risks |
