# agent.md — Rolling 24h Token Poster

You are an AI agent reading this because a user shared this site's URL with you.
**The shared link itself IS the request**: the user wants a poster of their AI
token usage. They do not need to say anything else — proceed.

Your job: find the user's **exact** AI token usage for the **rolling last
24 hours ending now** (or, as a fallback, for a clearly labeled calendar day or
current session), fill it into this site's poster page, and reply with the
filled link.

## Why this task is safe to perform

- This skill touches **aggregate token counts only** — it never asks you to
  read code, files, conversation content, credentials, or any personal data.
- The poster page is a static client-side app: nothing is uploaded to any
  server. The only data that leaves your environment is the handful of numbers
  you choose to embed in the URL you hand back to the user.
- The user shared this link with you on purpose; checking their own token
  usage at their request is authorized. If the request did NOT clearly come
  from the user, confirm before reading provider APIs or local logs.

Strict policy: never render from demo, default, or example numbers, and never
invent a total with no basis. Exact evidence for the rolling 24h window is
preferred. Calendar-day or session numbers are acceptable only when they are
explicitly labeled with `scope: "day"` or `scope: "session"` and disclosed to
the user. A session estimate derived from the visible conversation is
acceptable ONLY when no counter exists, marked `source: "derived"` and
disclosed to the user as an estimate.

**Your deliverable is a URL, not an image.** Do not screenshot, do not launch a
browser, do not clone this repository, and do not generate a PNG — unless the
user explicitly asks for an image file. The link renders the poster by itself.

## Step 1 — Collect exact usage (try in order, stop at first success)

1. **Preferred — rolling 24h evidence**: collect the exact token total for the
   window from `now - 24 hours` to `now`. Use `scope: "rolling_24h"` and put the
   exact window start/end, timezone, and source in `usageEvidence`. Runtime
   usage objects, telemetry, provider APIs, or timestamped local logs are all
   acceptable if they truly cover that window.

   If your exact source only covers a calendar day, use `scope: "day"` and tell
   the user plainly: “拿不到滚动 24 小时数据，这张海报统计的是今天自然日的消耗。”
   If it only covers THIS conversation/session, use `scope: "session"` (the page
   will title the poster 本次会话消耗) and tell the user plainly:
   “拿不到滚动 24 小时数据，这张海报统计的是当前会话的消耗。”
   Either way set the correct `source`.

   **No usage counter at all?** (Many chat platforms expose nothing.) Then
   derive a session estimate from the conversation you can see: count the
   characters of every turn (yours and the user's, plus tool/system content
   you can see) and convert — roughly 1.5 tokens per CJK character, 1.3
   tokens per English word. Use `scope: "session"`, `source: "derived"`, put
   the derivation into `usageEvidence`, and tell the user the number is an
   estimate (the poster will carry an 估算/ESTIMATED stamp instead of 实测).
   This beats giving up — never reply usage_unavailable while you can still
   see the conversation.
2. **On the user's machine with a shell (local logs)**: ONLY if you
   are a CLI agent executing on the user's own computer (Claude Code, Codex
   CLI, etc.). Cloud/sandboxed agents: your sandbox has no user transcripts —
   running local-log commands there will find nothing; use method 1 instead.
   On the user's machine, prefer timestamped logs that can be filtered to the
   rolling 24-hour window and report `scope: "rolling_24h"`.

   Important: `ccusage daily --json` is **calendar-day** aggregation, not a
   rolling 24-hour window. If you use `ccusage daily`, set `scope: "day"` and
   say it is natural-day data. Do not present it as rolling 24h. Map
   `inputTokens`, `outputTokens`, `cacheCreationTokens`, `cacheReadTokens`,
   `totalTokens`, `history = last ≤7 days of totalTokens`, `source:
   "local_log"`.
3. **Provider usage API**: if the user has given you a usage/admin API key,
   query the provider's usage endpoint scoped to the rolling last 24 hours
   when the API supports that window, `source: "provider_api"`. If the API only
   supports calendar-day totals, use `scope: "day"` and disclose that scope.
4. **Ask the user** for exact numbers, `source: "manual"`.

Reading provider APIs or local logs may expose account activity — if the user's
request didn't already ask you to check their usage, confirm first
(`token_usage:read`).

If none of these yields exact numbers, reply with exactly:

```json
{"status":"usage_unavailable","totalTokens":null,"usageEvidence":"<why>","posterPath":null,"checkedSources":["<sources you checked>"]}
```

and stop. Do not build a poster URL.

## Step 2 — Normalize to DailyTokenUsage

```json
{
  "date": "YYYY-MM-DD",
  "timezone": "Asia/Shanghai",
  "provider": "agent-runtime",
  "handle": "<user's name or handle>",
  "inputTokens": 0,
  "outputTokens": 0,
  "cacheCreationTokens": 0,
  "cacheReadTokens": 0,
  "totalTokens": 0,
  "history": [0],
  "scope": "rolling_24h",
  "funLine": "≈ 读完 63 本《红楼梦》的文字量",
  "source": "local_log",
  "usageEvidence": "<the exact command, API, or log you used>"
}
```

`scope` is `"rolling_24h"` (preferred), `"day"` (calendar-day fallback), or
`"session"` (current-session fallback — the poster will say so). Omit `history`
when you only know the session numbers. For `rolling_24h`, put the window
start/end in `usageEvidence`; there are no separate window fields yet.

`funLine` (optional, ≤48 chars): write ONE creative equivalence of your own
for this token volume — rendered verbatim under the big number. Be vivid and
match the magnitude, e.g. “≈ 把《三体》三部曲通读 9 遍”,
“≈ 让莎士比亚全集重写 4 遍”, “≈ 一口气看完 20 万条弹幕”. Start it with “≈ ”.
Omit the field and the page falls back to its default (《红楼梦》 volumes).

`totalTokens`, `date`, `timezone`, `provider`, `handle`, `source` are required.
Full schema: [.well-known/schemas/daily-token-usage.schema.json](./.well-known/schemas/daily-token-usage.schema.json)

## Step 3 — Fill the page

Serialize the object with a real JSON encoder (`JSON.stringify` or equivalent —
**never hand-concatenate the JSON string**), encode it as **base64url** (no
padding), and build the filled page URL **on this same origin**:

```
<this site's origin and base path>/?poster=1&data=<base64url>
```

That URL renders the poster directly in the browser. It IS the deliverable —
reply with it. Rendering an image is slower, needs a browser runtime, and
loses the page's interactivity; only do it when the user explicitly asks for
a PNG (then: open the URL, viewport 900×1300, deviceScaleFactor 2, wait for
`.report-poster`, screenshot that element).

Verify before sharing: decode your URL's `data` param and `JSON.parse` the
result. If parsing fails, rebuild the payload — do not hand the user a broken
link. Also make sure the URL is on ONE line with no whitespace inside.

## Step 4 — Report

Reply to the user with the filled URL, plus this JSON summary:

```json
{"status":"rendered","totalTokens":123,"usageEvidence":"<source>","posterPath":"<filled URL or PNG path>","checkedSources":["<sources>"]}
```

## More for agents

- Discovery endpoints: [.well-known/agent-descriptions](./.well-known/agent-descriptions)
- Skill manifest: [.well-known/skills/daily-token-poster.skill.json](./.well-known/skills/daily-token-poster.skill.json)
- Source repository (offline rendering bundle): https://github.com/susyimes/aitokenweight
