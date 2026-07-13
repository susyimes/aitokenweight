---
name: daily-token-poster
description: Collect today's exact AI token usage and render a shareable aitokenweight energy poster. Use when the user asks for a daily token poster, token usage share card, or "今日token海报".
---

# Daily Token Poster

Turn today's exact token usage into a shareable aitokenweight poster. Never render
from demo, default, or estimated numbers — exact evidence or `usage_unavailable`.

## Step 1 — Collect today's exact usage (try in order, stop at first success)

1. **Universal — own runtime usage (any agent)**: read the cumulative token
   usage your runtime exposes (usage object, telemetry, context counter).
   Whole day → `scope: "day"`; this conversation only → `scope: "session"`
   plus tell the user the poster covers this session only. Either way
   `source: "agent_runtime"`. No counter at all? Derive an estimate from the
   visible conversation (≈1.5 tokens per CJK char, ≈1.3 per English word),
   `source: "derived"`, disclose it as an estimate — don't give up.
   Exception: on the user's own machine with shell access prefer method 2 —
   it yields the richer full-day poster.
2. **On the user's machine with a shell (richer daily poster)**: cloud
   sandboxes have no user transcripts — skip shell commands there. Run
   `npx -y aitokenweight@latest --json --no-open` — decode the exact usage
   payload from its `posterPath`, enrich it with fresh creative fields in Step
   2, then rebuild the URL; never return the un-enriched CLI link. (`--handle
   <name>` sets the poster name.) Or read transcripts via
   `npx -y ccusage@latest daily --json`:
   today's `agent: "all"` entry, map `inputTokens`, `outputTokens`,
   `cacheCreationTokens`, `cacheReadTokens`, `totalTokens`,
   `history = last ≤7 days of totalTokens`, `source: "local_log"`.
3. **Provider usage API**: if the user has provided an admin/usage API key, query
   the provider usage endpoint scoped to today, `source: "provider_api"`.
4. **Ask the user**: exact numbers only, `source: "manual"`.

Before reading provider APIs or local logs, confirm the user authorizes
`token_usage:read` (skip the confirmation if the user's request itself asked you
to check their usage).

If none of the above yields exact numbers, output exactly:
`{"status":"usage_unavailable","totalTokens":null,"usageEvidence":"<why>","posterPath":null,"checkedSources":[...]}`
and stop. Do not render.

## Step 2 — Normalize

Build a `DailyTokenUsage` object (schema:
`public/.well-known/schemas/daily-token-usage.schema.json`):

```json
{
  "date": "YYYY-MM-DD",
  "timezone": "Asia/Shanghai",
  "provider": "agent-runtime",
  "handle": "<user handle>",
  "inputTokens": 0,
  "outputTokens": 0,
  "cacheCreationTokens": 0,
  "cacheReadTokens": 0,
  "totalTokens": 0,
  "history": [0],
  "funLine": "≈ <fresh token-volume metaphor>",
  "verdict": "<fresh short punchline>",
  "energyLine": "<fresh energy sentence>",
  "energyComparisons": [
    {"label":"<invent label 1>","unit":"<unit>","whPerUnit":"<positive number>","icon":"<icon>"},
    {"label":"<invent label 2>","unit":"<unit>","whPerUnit":"<different positive number>","icon":"<icon>"},
    {"label":"<invent label 3>","unit":"<unit>","whPerUnit":"<third positive number>","icon":"<icon>"}
  ],
  "source": "local_log",
  "usageEvidence": "<exact evidence: command/API/log used>"
}
```

Always set `usageEvidence` to the concrete evidence source you used.

Agent-created links MUST include fresh `funLine` (≤48 chars, starts with `≈`),
`verdict` (≤36 chars), `energyLine` (≤48 chars), and exactly three distinct
`energyComparisons`. Never copy the placeholders above, previous output, or
send legacy `metricIds`. Each comparison needs a playful Chinese `label` (≤18
chars), short `unit` (≤8 chars), a plausible positive `whPerUnit` for one unit,
and an icon from: `phone`, `car`, `kettle`, `laptop`, `led`, `ac`, `fan`,
`fridge`, `rice`, `washer`, `tv`, `coffee`, `battery`, `bike`, `game`, `music`,
`projector`, `train`, `wifi`, `sparkles`. Vary category and energy scale; aim
for rendered counts around 0.1–9999. The page computes the result from
`whPerUnit`; do not send the precomputed count. Before encoding, verify there
are no `<...>` placeholders, all `whPerUnit` values are JSON numbers, and all
three labels differ. For scale selection, rough kWh is `totalTokens ×
whPerThousand / 1,000,000`; with token breakdown use `(input×0.3 + output×0.9
+ cacheCreation×0.3 + cacheRead×0.03) / 1,000,000`.

## Step 3 — Fill the template and share

Serialize with a real JSON encoder (never hand-concatenate the string), encode
as base64url, and build the poster URL. Verify before sharing: decode the
`data` param back and `JSON.parse` it — rebuild if it fails.
`<origin>/?poster=1&data=<base64url>`

- **Hosted origin available** (preferred, zero setup): give the user the full URL —
  it IS the deliverable. Do NOT screenshot or render a PNG unless the user
  explicitly asks for an image file.
- **No hosted origin**: clone-and-run —
  `git clone https://github.com/susyimes/aitokenweight.git && cd aitokenweight && npm ci && npx playwright install chromium`,
  write `usage.json`, then
  `npm run render:poster -- --usage usage.json --out dist/aitokenweight-poster.png`.

## Step 4 — Report

Output exactly one JSON object, no prose:
`{"status":"rendered","totalTokens":<n>,"usageEvidence":"<source>","posterPath":"<path or URL>","checkedSources":[...]}`
