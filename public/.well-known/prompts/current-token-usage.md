# Current Token Usage Prompt

Use this skill only with exact token usage for your current agent run/request/session.

Mandatory final output: exactly one JSON object and nothing else. No prose. No Markdown fences.

If exact usage is unavailable, the JSON `status` must be exactly `"usage_unavailable"` and `totalTokens` must be `null`.

Rules:
1. Find exact current token usage from runtime telemetry, a usage object, CLI usage line, trace/log entry, or provider usage query scoped to this run.
2. Never use demo/default/example/estimated numbers. Never use `8620000` unless your current runtime reports exactly that value.
3. If exact usage is unavailable, do not clone, do not render, and do not call `renderPoster`.
4. If exact usage is available, write `DailyTokenUsage` with `source: "agent_runtime"` or a more precise source, then render with `npm run render:poster -- --usage usage.json --out dist/aitokenweight-poster.png`.
5. Any prose before/after the JSON, Markdown fences, or a different unavailable status violates this skill.

Rendered output:
{"status":"rendered","totalTokens":123,"usageEvidence":"exact evidence source","posterPath":"dist/aitokenweight-poster.png","checkedSources":["source"]}

Unavailable output:
{"status":"usage_unavailable","totalTokens":null,"usageEvidence":"why exact current usage is unavailable","posterPath":null,"checkedSources":["source checked"]}
