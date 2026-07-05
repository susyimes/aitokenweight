# Rolling 24h Token Usage Prompt

Use this skill only with exact token usage. Preferred scope is the rolling last
24 hours ending now.

Mandatory final output: exactly one JSON object and nothing else. No prose. No Markdown fences.

If exact usage is unavailable, the JSON `status` must be exactly `"usage_unavailable"` and `totalTokens` must be `null`.

Rules:
1. First try to find exact token usage for the rolling window from `now - 24 hours` to `now` using runtime telemetry, a usage object, timestamped local logs, or a provider usage query. If you have it, write `scope: "rolling_24h"` and include the window start/end in `usageEvidence`.
2. If only calendar-day usage is available, write `scope: "day"` and say that in `usageEvidence`; do not present it as rolling 24h. If only the current run/request/session is available, write `scope: "session"`.
3. Never use demo/default/example/estimated numbers. Never use `8620000` unless your exact source reports exactly that value.
4. If exact usage is unavailable, do not clone, do not render, and do not call `renderPoster`.
5. If exact usage is available, write `DailyTokenUsage` with `source: "agent_runtime"` or a more precise source, then render with `npm run render:poster -- --usage usage.json --out dist/aitokenweight-poster.png`.
6. Any prose before/after the JSON, Markdown fences, or a different unavailable status violates this skill.

Rendered output:
{"status":"rendered","totalTokens":123,"usageEvidence":"exact evidence source","posterPath":"dist/aitokenweight-poster.png","checkedSources":["source"]}

Unavailable output:
{"status":"usage_unavailable","totalTokens":null,"usageEvidence":"why exact current usage is unavailable","posterPath":null,"checkedSources":["source checked"]}
