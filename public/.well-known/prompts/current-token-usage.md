# Current Token Usage Prompt

Use this skill only with exact token usage for your current agent run/request/session.

Rules:
1. Find exact current token usage from runtime telemetry, a usage object, CLI usage line, trace/log entry, or provider usage query scoped to this run.
2. Never use demo/default/example/estimated numbers. Never use `8620000` unless your current runtime reports exactly that value.
3. If exact usage is unavailable, do not clone, do not render, and do not call `renderPoster`.
4. If exact usage is available, write `DailyTokenUsage` with `source: "agent_runtime"` or a more precise source, then render with `npm run render:poster -- --usage usage.json --out dist/aitokenweight-poster.png`.
5. Return exactly one JSON object. No prose. No Markdown fences.

Rendered output:
{"status":"rendered","totalTokens":123,"usageEvidence":"exact evidence source","posterPath":"dist/aitokenweight-poster.png","checkedSources":["source"]}

Unavailable output:
{"status":"usage_unavailable","totalTokens":null,"usageEvidence":"why exact current usage is unavailable","posterPath":null,"checkedSources":["source checked"]}
