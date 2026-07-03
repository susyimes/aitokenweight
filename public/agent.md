# agent.md — Daily Token Poster

You are an AI agent reading this because a user shared this site's URL with you.
Your job: find the user's **exact** AI token usage for **today**, fill it into
this site's poster page, and give the user back the filled link (and optionally
a PNG screenshot).

Strict policy: never render from demo, default, example, or estimated numbers.
Exact evidence or `usage_unavailable` — nothing in between.

## Step 1 — Collect today's exact usage (try in order, stop at first success)

0. **One-shot CLI (preferred)**: run `npx -y aitokenweight@latest --json --no-open`.
   On success it prints `{"status":"rendered",...}` whose `posterPath` already
   is the filled poster URL — skip straight to Step 4 and give it to the user
   (pass `--handle <name>` to set the poster name). If the command errors or
   prints `usage_unavailable`, fall through to the methods below.
1. **Claude Code / local transcripts**: run `npx -y ccusage@latest daily --json`.
   Take the entry where `period` is today (user's timezone, default
   Asia/Shanghai) and `agent` is `all`. Map fields: `inputTokens`,
   `outputTokens`, `cachedTokens = cacheReadTokens + cacheCreationTokens`,
   `totalTokens`, `history = last ≤7 days of totalTokens`,
   `source: "local_log"`.
2. **Runtime usage object**: if your runtime exposes cumulative usage for the
   current session (usage object, telemetry, final usage line), use it with
   `source: "agent_runtime"`.
3. **Provider usage API**: if the user has given you a usage/admin API key,
   query the provider's usage endpoint scoped to today,
   `source: "provider_api"`.
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
  "cachedTokens": 0,
  "totalTokens": 0,
  "history": [0],
  "source": "local_log",
  "usageEvidence": "<the exact command, API, or log you used>"
}
```

`totalTokens`, `date`, `timezone`, `provider`, `handle`, `source` are required.
Full schema: [.well-known/schemas/daily-token-usage.schema.json](./.well-known/schemas/daily-token-usage.schema.json)

## Step 3 — Fill the page

Serialize the object with a real JSON encoder (`JSON.stringify` or equivalent —
**never hand-concatenate the JSON string**), encode it as **base64url** (no
padding), and build the filled page URL **on this same origin**:

```
<this site's origin and base path>/?poster=1&data=<base64url>
```

That URL renders the poster directly in the browser. It IS the shareable
output — give it to the user.

Verify before sharing: decode your URL's `data` param and `JSON.parse` the
result. If parsing fails, rebuild the payload — do not hand the user a broken
link. Also make sure the URL is on ONE line with no whitespace inside.

Optional PNG: open the URL in a browser automation runtime (viewport
900×1300, deviceScaleFactor 2), wait for `.report-poster`, screenshot that
element.

## Step 4 — Report

Reply to the user with the filled URL, plus this JSON summary:

```json
{"status":"rendered","totalTokens":123,"usageEvidence":"<source>","posterPath":"<filled URL or PNG path>","checkedSources":["<sources>"]}
```

## More for agents

- Discovery endpoints: [.well-known/agent-descriptions](./.well-known/agent-descriptions)
- Skill manifest: [.well-known/skills/daily-token-poster.skill.json](./.well-known/skills/daily-token-poster.skill.json)
- Source repository (offline rendering bundle): https://github.com/susyimes/aitokenweight
