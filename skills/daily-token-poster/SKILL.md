---
name: daily-token-poster
description: Collect today's exact AI token usage and render a shareable aitokenweight energy poster. Use when the user asks for a daily token poster, token usage share card, or "今日token海报".
---

# Daily Token Poster

Turn today's exact token usage into a shareable aitokenweight poster. Never render
from demo, default, or estimated numbers — exact evidence or `usage_unavailable`.

## Step 1 — Collect today's exact usage (try in order, stop at first success)

0. **One-shot CLI (preferred)**: run `npx -y aitokenweight@latest --json --no-open`.
   On success it prints `{"status":"rendered",...}` whose `posterPath` already
   is the filled poster URL — report it to the user and stop (pass
   `--handle <name>` to set the poster name). If it errors or prints
   `usage_unavailable`, fall through to the methods below.
1. **Claude Code / local transcripts**: run `npx -y ccusage@latest daily --json`.
   Take the entry whose `period` is today (user's timezone, default Asia/Shanghai)
   and `agent` is `all`. Map: `inputTokens`, `outputTokens`,
   `cachedTokens = cacheReadTokens + cacheCreationTokens`, `totalTokens`,
   `history = last ≤7 days of totalTokens`, `source: "local_log"`.
2. **Provider usage API**: if the user has provided an admin/usage API key, query
   the provider usage endpoint scoped to today, `source: "provider_api"`.
3. **Current-session fallback**: if daily data is unreachable (remote/sandboxed
   runtime), use this session's cumulative usage instead with
   `scope: "session"`, `source: "agent_runtime"`, and tell the user the poster
   covers this session only, not the whole day.
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
