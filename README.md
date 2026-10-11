# TenK — Broke But Functional: Survive the Month

**₹10,000. 30 days. Every consequence visible.**

Built for the problem statement **"Broke But Functional — Survive the Month."**

**Live:** _add the deployed URL here after running `vercel --prod`_
**Repo:** _add this repository's GitHub URL here_

TenK is a modern, interactive personal finance experience built for Gen Z around a single
hard constraint: one limited budget of **₹10,000** to last **30 days**.

It is not an expense tracker. The point of TenK is the thing a tracker cannot do — **let you
simulate a financial decision before you take it**, and show you exactly what that decision
costs across every part of your month at once.

---

## The problem it solves

Most budgeting apps tell you what you have already spent. They answer the easy question.
The hard question a student actually asks is *"can I afford this?"* — and that question has
nothing to do with the balance on the screen, because the balance is not yours to spend. Some
of it is a gym charge on day 20. Some of it is already promised to a trip you are saving for.

TenK answers the hard question. Type in what you are thinking of doing — a concert ticket, a
phone repair, a new subscription, moving money into savings — and before you commit to
anything, you see the effect on:

| | |
|---|---|
| **Remaining balance** | what is actually in the account |
| **Safe to spend** | balance minus commitments and goals still owed |
| **Daily allowance** | what is genuinely free, spread across the days left |
| **Savings goals** | how much each goal is still waiting for, and whether it is on pace |
| **Monthly forecast** | the balance for all 30 days, before and after, on one chart |
| **Financial risk** | low / moderate / high / critical |
| **Financial health** | a 0–100 score built from four named, explained parts |

Nothing is written anywhere until you press **Take this decision**.

---

## What makes the consequences genuinely interconnected

Every figure in the application comes from **one pure function** over **one state object**:
[`src/lib/finance.ts`](src/lib/finance.ts). Nothing is calculated inside a component. Change
one input and all the others move together, because they are all outputs of the same
calculation rather than numbers that happen to sit on the same screen.

```
balance        = budget + income − spent − subscriptions already charged
safe to spend  = balance − commitments still to come − still owed to goals
daily allowance= safe to spend ÷ days left
average burn   = discretionary spend ÷ completed days
projected end  = balance − commitments − average burn × remaining days
health         = runway (30) + discipline (25) + savings (25) + commitments (20)
risk           = read straight off health
```

Simulation is the same engine run twice:

```ts
export function simulate(state: FinanceState, decision: Decision) {
  const next = structuredCopyOf(state)   // the real state is never touched
  applyDecision(next, decision)
  return { before: derive(state), after: derive(next), nextState: next }
}
```

That is why the before/after comparison can be trusted — it is not a second, approximate
model of the month. It is the same month, derived twice.

The app exposes this openly: **"How the numbers work"** on the overview opens the full
arithmetic with your own current figures substituted in.

### Two modelling decisions worth calling out

**A one-off purchase does not rewrite your daily habit.** The burn rate averages
*completed* days only. Without this, buying one ₹2,000 thing this morning would make the
model claim you now spend ₹167 more *every day* for the rest of the month — wildly
overstating a single purchase. With it, a decision taken today lowers the balance by exactly
its own size and leaves the trend alone, so the two forecast lines run parallel, separated by
the cost of the decision. Verified: for every decision type, the end-of-month gap between the
lines equals the decision amount exactly.

**Money moved into a goal is a transfer, not consumption.** It leaves the spendable balance
(so it can never be counted twice) but is excluded from the burn rate and the category
breakdown — saving should not be scored as overspending. Transfers carry a `transfer` flag
through the engine.

---

## Features

- **Overview** — balance, safe-to-spend, daily allowance and projected end balance, with a
  30-day forecast chart (solid for real spending, dashed for the projection), contextual
  warnings when the money will run out or the burn rate exceeds the allowance, the health
  score broken into its four explained parts, upcoming commitments and recent activity.
- **Simulate** — the core feature. Preset real-world decisions, three decision types
  (one-off expense, new subscription, move to savings), live recalculation on every
  keystroke, a plain-English verdict, before/after health rings, a full before→after table
  of every affected figure, and an overlaid forecast comparison. Commit or walk away.
- **Spending** — ranked spend-by-category chart, full transaction history with add and
  delete, subscription management showing what has been charged and what is still coming.
- **Goals** — per-goal progress with an on-pace / behind-pace judgement against the calendar,
  contribute-to-goal with validation against your real balance, and goal creation.
- **Day scrubber** — move "today" through the 30-day period and watch every figure respond
  to time passing, not just to spending.
- **Light and dark themes**, chosen from the system preference and applied before first
  paint so there is no flash.

## Accessibility and quality

- Every chart carries a text alternative describing its data; colour is never the only
  carrier of meaning (risk, deltas and pacing all pair a colour with an icon or a word).
- Colour tokens were checked for WCAG AA contrast in **both** themes; the chart palette was
  validated for lightness banding and colour-vision-deficiency separation.
- Full keyboard operation, visible focus rings, labelled form controls with errors wired via
  `aria-describedby`, `role="status"` live regions for results, and a skip link.
- `prefers-reduced-motion` is respected globally.
- Verified at 375px with an automated overflow sweep; zero console errors across all routes
  in both themes.
- The charting library is lazy-loaded, so the first paint does not wait on it.

## Testing

45 tests across the calculation engine, the persistence layer, and the hero flow, run with
**Vitest** and **React Testing Library**:

```bash
npm run test            # run once
npm run test:watch      # watch mode
npm run test:coverage   # with a coverage report
```

| File | What it covers |
|---|---|
| `src/lib/finance.test.ts` | The engine: every formula checked against hand-computed values, the forecast walk, health scoring, risk bands, `simulate()`'s immutability and its four decision types, currency formatting edge cases (negative, fractional, large values). |
| `src/lib/stateSchema.test.ts` | Input validation — see **Security** below. |
| `src/lib/store.test.tsx` | Persistence round-trips, `reset()`, goal-contribution clamping, that a corrupted `localStorage` value falls back safely instead of crashing. |
| `src/features/simulate/Simulate.test.tsx` | The hero flow: invalid input disables commit, a preset fills the form and shows a live verdict with nothing saved, committing persists it. |

`npm run build:strict` runs the typechecker, the full test suite, and the production build in
sequence — the gate this project ships through.

## Security and data sanitization

- **No unsafe rendering anywhere in the codebase.** No `dangerouslySetInnerHTML`, no `eval`,
  no `document.write`. User-entered text (expense labels, goal names) is always rendered as a
  React text node, so it is never interpreted as markup — confirmed by a test that feeds an
  `<img onerror=...>` payload through a label and asserts it round-trips as inert text.
- **Every form is validated with Zod** (`react-hook-form` + `@hookform/resolvers/zod`) —
  amounts are bounded and required to be positive numbers, free text is length-capped, days
  are constrained to the 1–30 period. Nothing reaches the calculation engine unvalidated.
- **Storage is re-validated on every read, not just parsed.** `localStorage` is same-origin,
  but it can still be hand-edited in devtools, left over from a previous app version, or
  corrupted — and `JSON.parse` succeeding says nothing about the shape of what comes back.
  `src/lib/stateSchema.ts` runs a Zod schema over every value loaded from storage: amounts are
  bounded to a sane range, array lengths are capped (a defence against a storage-filling
  payload), free text has control characters stripped and is length-capped, and anything that
  does not validate falls back to the known-good seed rather than being partially trusted.
  Covered by 9 tests, including negative/`Infinity`/`NaN` amounts, a tampered category enum,
  and an oversized array.
- **No secrets, API keys, or backend credentials anywhere** — the whole app is client-side
  state in `localStorage`; there is no server component to leak.

## Tech stack

| | |
|---|---|
| Framework | **React 18** + **TypeScript** (strict) |
| Build | **Vite 6** |
| Styling | **Tailwind CSS 3.4** with HSL design tokens |
| Components | **Radix UI** primitives |
| Charts | **Recharts** (lazy-loaded) |
| Forms | **React Hook Form** + **Zod** |
| Routing | **React Router 6** with route-level code splitting |
| Notifications | **Sonner** |
| Icons | **Lucide** |

State is held in a React context over `localStorage`, with storage as the source of truth:
every write re-reads it first and a `storage` listener keeps multiple tabs in step, so a
second tab cannot silently overwrite the first.

## Running it locally

```bash
npm install
npm run dev        # http://localhost:5173
```

```bash
npm run build         # production build into dist/
npm run preview       # serve the production build
npm run typecheck     # tsc --noEmit
npm run test          # vitest run
npm run build:strict  # typecheck, then test, then build — the ship gate
```

Requires Node 18 or newer.

## Project structure

```
src/
  lib/finance.ts          the entire calculation engine — pure, no React
  lib/finance.test.ts     engine tests
  lib/store.tsx           state, persistence, cross-tab sync, commit()
  lib/store.test.tsx      persistence and store tests
  lib/stateSchema.ts       validates/sanitizes whatever comes back out of localStorage
  lib/stateSchema.test.ts validation tests
  data/seed.ts            a realistic month in progress
  features/
    overview/             landing route: the state of the month
    simulate/             decision builder + before/after consequences
    spending/             categories, transactions, subscriptions
    goals/                savings goals and pacing
    shared/               health ring, risk pill, delta row, day scrubber
  components/
    charts/               forecast, comparison, category bars, tooltip
    ui/                   button, card, badge, input, field, dialog, …
    layout/               shell, navbar, footer, error boundary
```

---

Built with React, TypeScript and Tailwind CSS.
