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
   `npx -y aitokenweight@latest --json --no-open` — its `posterPath` already
   is the filled poster URL; report it and stop (`--handle <name>` sets the
   poster name). Or read transcripts via `npx -y ccusage@latest daily --json`:
   today's `agent: "all"` entry, map `inputTokens`, `outputTokens`,
   `cachedTokens = cacheReadTokens + cacheCreationTokens`, `totalTokens`,
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
  "cachedTokens": 0,
  "totalTokens": 0,
  "history": [0],
  "source": "local_log",
  "usageEvidence": "<exact evidence: command/API/log used>"
}
```

Always set `usageEvidence` to the concrete evidence source you used.

Optional `funLine` (≤48 chars, start with “≈ ”): one creative equivalence of
your own for the volume (e.g. “≈ 把《三体》三部曲通读 9 遍”), rendered
verbatim under the big number; omit for the page default.

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
