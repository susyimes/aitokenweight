---
name: daily-token-poster
description: Collect exact rolling last-24-hours AI token usage and render a shareable aitokenweight energy poster. Use when the user asks for a token usage poster, token usage share card, or "今日token海报".
---

# Rolling 24h Token Poster

Turn exact rolling last-24-hours token usage into a shareable aitokenweight
poster. Never render from demo, default, or estimated numbers — exact evidence
or `usage_unavailable`.

## Step 1 — Collect exact usage (try in order, stop at first success)

1. **Preferred — rolling 24h evidence**: collect the exact total from
   `now - 24 hours` to `now`. Use `scope: "rolling_24h"` and write the window
   start/end in `usageEvidence`. Runtime telemetry, usage objects, provider
   APIs, and timestamped local logs are acceptable only if they truly cover
   that rolling window.
2. **Fallback scopes**: if only calendar-day usage is available, use
   `scope: "day"` and tell the user it is natural-day data, not rolling 24h. If
   only this conversation/session is available, use `scope: "session"` and tell
   the user the poster covers this session only. No counter at all? Derive an
   estimate from the visible conversation (≈1.5 tokens per CJK char, ≈1.3 per
   English word), `source: "derived"`, disclose it as an estimate — don't give
   up.
3. **On the user's machine with a shell**: cloud sandboxes have no user
   transcripts — skip shell commands there. Prefer timestamped logs that can be
   filtered to the rolling 24-hour window. `ccusage daily --json` is
   calendar-day aggregation; if you use it, set `scope: "day"` and do not
   present it as rolling 24h.
4. **Provider usage API**: if the user has provided an admin/usage API key,
   query the provider usage endpoint scoped to the rolling last 24 hours when
   supported; otherwise label the fallback scope.
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
  "scope": "rolling_24h",
  "source": "local_log",
  "usageEvidence": "<exact evidence: command/API/log used>"
}
```

Always set `usageEvidence` to the concrete evidence source you used. For
`scope: "rolling_24h"`, include the window start and end.

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
