# Current Token Usage & Cost Baseline

**Date:** 2026-05-10  
**Purpose:** Establish an accurate baseline for current AI token usage and cost, compare it against the existing Learning Units unit economics model, and use the result as the reference point for post-optimisation impact analysis.

---

## 1. Goal

We need a baseline document that captures:

1. Current token usage per AI action.
2. Current estimated or observed cost per AI action.
3. The corresponding Learning Unit (LU) economics from the existing unit economics document.
4. Any variance between actual usage/cost and the current LU pricing model.
5. A reusable baseline for comparing usage and cost before and after optimisation work.

After this baseline is agreed, future optimisation results should be compared against it to quantify impact in terms of:

- Token usage reduction.
- Cost reduction.
- Cost per action improvement.
- Margin improvement versus LU pricing.
- Any changes in user-facing behaviour or quality.

---

## 2. Source Unit Economics Baseline

Source document reviewed: **Learning Units Pricing & Cost Model (v1)**.

Key assumptions from the unit economics document:

- **1 Learning Unit (LU) = $0.25**.
- LU is an internal billing and enforcement abstraction for AI usage.
- Runtime logic should map each AI action to an LU cost, deduct LU from the user balance, block execution if the user has insufficient LU, and log usage per action for analytics and auditing.
- USD costs in the unit economics document are reference costs only and should not be used directly for runtime logic.
- The current default model is **Sonnet 4.6**.
- LU values and pricing may change over time based on real usage and cost behaviour, so assumptions should not be hard-coded.

---

## 3. Unit Economics Reference Table

The table below captures the reference costs from the existing pricing/cost model. Since the current default model is Sonnet 4.6, the Sonnet 4.6 column should be treated as the primary comparison point for the current baseline unless the actual production model differs.


| AI Action              | Haiku 4.5 Cost | Sonnet 4.6 Cost | Opus 4.7 Cost | Pipeline / Notes                                                                            | Implied LU at Sonnet 4.6 | Implied Gross Margin vs 1 LU |
| ---------------------- | -------------- | --------------- | ------------- | ------------------------------------------------------------------------------------------- | ------------------------ | ---------------------------- |
| Course Generation      | $0.211         | $0.633          | $1.055        | Extract -> structure -> 2                                                                   | 2.53 LU                  | -153.2%                      |
| Homework Check (Smart) | $0.117         | $0.349          | $0.583        | Decompose + solve +                                                                         | 1.40 LU                  | -39.6%                       |
| Prepare Guide          | $0.088         | $0.264          | $0.440        | Single call, 16K output                                                                     | 1.06 LU                  | -5.6%                        |
| Homework Check         | $0.079         | $0.237          | $0.395        | Solve + read + grade +                                                                      | 0.95 LU                  | 5.2%                         |
| Practice Session       | $0.066         | $0.198          | $0.330        | Generate + 3 tutor turns                                                                    | 0.79 LU                  | 20.8%                        |
| Diagram (with image)   | $0.085         | $0.175          | $0.265        | Classify + schema + image generation. Diagram costs include a flat $0.04 Recraft image fee. | 0.70 LU                  | 30.0%                        |
| Exam Generation        | $0.046         | $0.137          | $0.228        | 2.5 question batches                                                                        | 0.55 LU                  | 45.2%                        |
| Lesson Expansion       | $0.045         | $0.135          | $0.225        | Single call, 8K output                                                                      | 0.54 LU                  | 46.0%                        |
| Chat (Prepare Guide)   | $0.027         | $0.082          | $0.137        | Single call on guide                                                                        | 0.33 LU                  | 67.2%                        |
| Walkthrough            | $0.023         | $0.070          | $0.117        | Single call, step-by-step                                                                   | 0.28 LU                  | 72.0%                        |
| Chat (Course)          | $0.009         | $0.027          | $0.045        | Single call on course                                                                       | 0.11 LU                  | 89.2%                        |
| Flashcard Batch        | $0.009         | $0.027          | $0.045        | Single call, batch of flashcards                                                            | 0.11 LU                  | 89.2%                        |


**Formulae used:**

```text
Implied LU at Sonnet 4.6 = Sonnet 4.6 cost / $0.25
Implied gross margin vs 1 LU = ($0.25 - Sonnet 4.6 cost) / $0.25
```

**Important:** The margin column assumes each action is currently charged at exactly 1 LU. If the product charges different LU amounts per action, replace the `1 LU` assumption with the actual charged LU value for each action.

---

## 4. Current Token Usage Baseline

This section should be filled using production logs, analytics exports, or provider usage data for the agreed baseline period.

**Baseline period:** `TBD`  
**Environment:** `Production / Staging / Other`  
**Model(s):** `TBD`  
**Data source:** `TBD`  
**Currency:** USD


| AI Action                               | Total Tokens | Input Tokens | Output Tokens | Cache Read Tokens | Cache Write Tokens | Image / Tool Fees | Observed Cost | Cost per Request | Current Charged LU | Revenue at $0.25/LU | Gross Margin | Notes                                                       |
| --------------------------------------- | ------------ | ------------ | ------------- | ----------------- | ------------------ | ----------------- | ------------- | ---------------- | ------------------ | ------------------- | ------------ | ----------------------------------------------------------- |
| Course Generation (Text content)        | 17,769       | 5,770        | 11,999        | 0                 | 0                  | 0                 | 0.197295      | TBD              | TBD                | TBD                 | TBD          | This is based on text content with 45-60 mins               |
| Course Generation (Upload file content) | 10,944       | 5,694        | 5,250         | 0                 | 0                  | 0                 | 0.0958        | TBD              | TBD                | TBD                 | TBD          | 20-30min uploaded file; structured output -> shorter output |
| Homework Check (Smart)                  | 2,261        | 575          | 1,686         | 0                 | 0                  | 0                 | 0.027015      | TBD              | TBD                | TBD                 | TBD          | TBD                                                         |
| Prepare Guide                           | 8,873        | 1,506        | 7,367         | 0                 | 0                  | 0                 | 0.115023      | TBD              | TBD                | TBD                 | TBD          | TBD                                                         |
| Homework Check                          | 3,062        | 1,460        | 1,602         | 0                 | 0                  | 0                 | 0.028410      | TBD              | TBD                | TBD                 | TBD          | TBD                                                         |
| Practice Session                        | 10,698       | 6,698        | 4,000         | 0                 | 0                  | 0                 | 0.080094      | TBD              | TBD                | TBD                 | TBD          | TBD                                                         |
| Diagram (with image)                    | 576          | 568          | 8             | 8                 | 8                  | 8                 | 0.001824      | TBD              | TBD                | TBD                 | TBD          |                                                             |
| Exam Generation                         | 6,581        | 2,635        | 3,946         | 0                 | 0                  | 0                 | 0.067095      | TBD              | TBD                | TBD                 | TBD          | TBD                                                         |
| Lesson Expansion                        | 1,262        | 422          | 840           | 0                 | 0                  | 0                 | 0.013866      | TBD              | TBD                | TBD                 | TBD          | TBD                                                         |
| Chat (Prepare Guide)                    | 669          | 19           | 650           | 0                 | 3,317              | 0                 | 0.022246      | TBD              | TBD                | TBD                 | TBD          | TBD                                                         |
| Walkthrough                             | 2,053        | 651          | 1,402         | 0                 | 0                  | 0                 | 0.022983      | TBD              | TBD                | TBD                 | TBD          | TBD                                                         |
| Chat (Course)                           | 1,677        | 1,387        | 290           | 0                 | 0                  | 0                 | 0.008511      | TBD              | TBD                | TBD                 | TBD          | TBD                                                         |
| Flashcard Batch                         | 631          | 570          | 61            | 0                 | 0                  | 0                 | 0.002625      | TBD              | TBD                | TBD                 | TBD          | TBD                                                         |


**Formulae used:**


| Formula             | Expression                                                                                                                                    |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Observed Cost       | `(Billable Input / 1,000,000 × $3.00) + (Output / 1,000,000 × $15.00) + (Cache Read / 1,000,000 × $0.30) + (Cache Write / 1,000,000 × $3.75)` |
| Billable Input      | `Input Tokens − Cache Read Tokens`                                                                                                            |
| Cost per Request    | `Observed Cost / Requests`                                                                                                                    |
| Revenue at $0.25/LU | `Current Charged LU × $0.25`                                                                                                                  |
| Gross Margin        | `(Revenue − Observed Cost) / Revenue`                                                                                                         |


**Token pricing (Sonnet 4.6):**


| Token Type       | Rate (per 1M tokens) |
| ---------------- | -------------------- |
| Input (billable) | $3.00                |
| Output           | $15.00               |
| Cache read       | $0.30                |
| Cache write      | $3.75                |


---

## 5. Comparison Against Unit Economics Model

Observed costs from Section 4 compared against Sonnet 4.6 reference costs from Section 3. Revenue and gross margin are calculated using the official LU pricing table (1 LU = $0.25).


| AI Action                               | Unit Economics Reference Cost | Observed Current Cost | Delta $    | Delta % | LU / Action | Revenue @ LU Price | Gross Margin | Baseline Status     | Notes                                                                                 |
| --------------------------------------- | ----------------------------- | --------------------- | ---------- | ------- | ----------- | ------------------ | ------------ | ------------------- | ------------------------------------------------------------------------------------- |
| Course Generation (Text content)        | $0.633                        | $0.223086             | -$0.409914 | -64.8%  | 10.0 LU     | $2.50              | 91.1%        | Overestimated       | Reference significantly overestimated actual text-based generation cost.              |
| Course Generation (Upload file content) | $0.633                        | $0.095832             | -$0.537168 | -84.9%  | 10.0 LU     | $2.50              | 96.2%        | Overestimated       | Upload-based generation is even cheaper; shorter output due to structured file input. |
| Homework Check (Smart)                  | $0.349                        | $0.027015             | -$0.321985 | -92.3%  | 4.0 LU      | $1.00              | 97.3%        | Overestimated       | Actual cost is a fraction of reference; likely fewer tokens than modelled.            |
| Prepare Guide                           | $0.264                        | $0.105975             | -$0.158025 | -59.9%  | 3.0 LU      | $0.75              | 85.9%        | Overestimated       | Meaningful gap vs reference; output tokens lower than 16K assumption.                 |
| Homework Check                          | $0.237                        | TBD                   | TBD        | TBD     | 2.0 LU      | $0.50              | TBD          | Needs investigation | No observed data yet.                                                                 |
| Practice Session                        | $0.198                        | $0.080094             | -$0.117906 | -59.5%  | 2.0 LU      | $0.50              | 84.0%        | Overestimated       | Reference assumed 3 tutor turns; observed may reflect fewer or shorter interactions.  |
| Diagram (with image)                    | $0.175                        | TBD                   | TBD        | TBD     | 3.0 LU      | $0.75              | TBD          | Needs investigation | No observed data yet. Includes flat Recraft image fee.                                |
| Exam Generation                         | $0.137                        | $0.049734             | -$0.087266 | -63.7%  | 2.0 LU      | $0.50              | 90.1%        | Overestimated       | Strong margin; actual generation significantly cheaper than 2.5-batch assumption.     |
| Lesson Expansion                        | $0.135                        | $0.008865             | -$0.126135 | -93.4%  | TBD         | TBD                | TBD          | Overestimated       | Largest delta % of all measured actions; no LU mapping in pricing table.              |
| Chat (Prepare Guide)                    | $0.082                        | $0.015927             | -$0.066073 | -80.6%  | 0.5 LU      | $0.125             | 87.3%        | Overestimated       | Includes 3,024 cache write tokens; reference overestimated single-call chat cost.     |
| Walkthrough                             | $0.070                        | TBD                   | TBD        | TBD     | TBD         | TBD                | TBD          | Needs investigation | No observed data yet.                                                                 |
| Chat (Course)                           | $0.027                        | $0.008511             | -$0.018489 | -68.5%  | 0.5 LU      | $0.125             | 93.2%        | Overestimated       | Cheapest measured action; very short output (290 tokens).                             |
| Flashcard Batch                         | $0.027                        | TBD                   | TBD        | TBD     | 1.0 LU      | $0.25              | TBD          | Needs investigation | No observed data yet.                                                                 |


**Formulae:**

```text
Delta $ = Observed current cost − Unit economics reference cost
Delta % = Delta $ / Unit economics reference cost
Gross Margin = (Revenue − Observed current cost) / Revenue
```

**Status label definitions:**

- **Accurate baseline:** observed cost is within an agreed tolerance of the reference cost.
- **Underestimated:** observed cost is materially higher than the reference cost.
- **Overestimated:** reference cost was higher than actual observed cost (model assumed more expensive than reality).
- **Needs investigation:** data is incomplete, inconsistent, or affected by outliers.

**Key observations:**

- Every measured action came in significantly below the unit economics reference cost, ranging from −59.5% (Practice Session) to −93.4% (Lesson Expansion).
- All measured actions with known LU pricing produce healthy gross margins (84%–97%), well above the −153% to +89% range the reference implied.
- The unit economics model was consistently conservative — actual AI costs are much lower than planned.
- Four actions still need observed data: Homework Check, Diagram, Walkthrough, and Flashcard Batch.

---

## 6. Optimisation Baseline Metrics

These are the metrics we should lock before optimisation begins.


| Metric                      | Baseline Value | Post-Optimisation Value | Change | Notes                                            |
| --------------------------- | -------------- | ----------------------- | ------ | ------------------------------------------------ |
| Total requests              | TBD            | TBD                     | TBD    | Same period length or normalised volume.         |
| Total input tokens          | TBD            | TBD                     | TBD    | Split by action where possible.                  |
| Total output tokens         | TBD            | TBD                     | TBD    | Split by action where possible.                  |
| Total cached tokens         | TBD            | TBD                     | TBD    | Include read/write distinction if supported.     |
| Total AI cost               | TBD            | TBD                     | TBD    | Include model and tool/image fees.               |
| Average cost per request    | TBD            | TBD                     | TBD    | Weighted across all actions.                     |
| Average cost per LU charged | TBD            | TBD                     | TBD    | Useful for unit economics validation.            |
| Gross margin                | TBD            | TBD                     | TBD    | Based on charged LU revenue minus observed cost. |
| Highest-cost action         | TBD            | TBD                     | TBD    | Identify the largest optimisation opportunity.   |
| Highest-volume action       | TBD            | TBD                     | TBD    | Identify where small gains scale.                |


---

## 7. Required Data Inputs

To complete this baseline, we need the following data for the selected period:

1. Usage logs grouped by AI action.
2. Model used per action.
3. Input tokens per request.
4. Output tokens per request.
5. Cached token usage, if available.
6. Tool, image, or external API fees, especially for diagram generation.
7. Actual provider cost per request or enough pricing data to calculate it.
8. LU charged per action.
9. Any failed, retried, or cancelled requests that still incurred cost.
10. Any free, promotional, internal, or test usage that should be excluded from unit economics.

---

## 8. Baseline Decisions to Confirm

Before using this as the optimisation baseline, confirm:

- The baseline period to use.
- Whether the current production default model is still Sonnet 4.6.
- The actual LU charged per action today.
- Whether the comparison should use mean, median, p75, p90, or weighted average cost per action.
- Whether failed/retried requests are included.
- Whether internal/test users are excluded.
- Whether image/tool costs are included in the same cost line as model tokens.
- The acceptable tolerance for calling the existing unit economics model accurate.

---

## 9. Post-Optimisation Comparison Method

After optimisation, compare the same metrics using the same methodology:

```text
Usage reduction % = (Baseline tokens - Post-optimisation tokens) / Baseline tokens
Cost reduction % = (Baseline cost - Post-optimisation cost) / Baseline cost
Margin improvement = Post-optimisation gross margin - Baseline gross margin
```

The post-optimisation comparison should explain whether improvements came from:

- Lower input tokens.
- Lower output tokens.
- Better prompt structure.
- Better retrieval/context selection.
- Caching.
- Model routing.
- Reduced retries or failures.
- Cheaper external image/tool usage.
- Changes in action volume mix.

---

## 10. Current Status

This document currently includes the reference unit economics baseline from the uploaded pricing/cost model and a structured template for adding actual current token usage and observed costs.

The next step is to populate the current token usage table from production/provider usage data, then calculate variance against the Sonnet 4.6 reference costs.