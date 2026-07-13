# Current Token Usage Prompt

Use this skill only with exact token usage for your current agent run/request/session.

Mandatory final output: exactly one JSON object and nothing else. No prose. No Markdown fences.

If exact usage is unavailable, the JSON `status` must be exactly `"usage_unavailable"` and `totalTokens` must be `null`.

Rules:
1. Find exact current token usage from runtime telemetry, a usage object, CLI usage line, trace/log entry, or provider usage query scoped to this run.
2. Never use demo/default/example/estimated numbers. Never use `8620000` unless your current runtime reports exactly that value.
3. If exact usage is unavailable, do not clone, do not render, and do not call `renderPoster`.
4. If exact usage is available, write `DailyTokenUsage` with `source: "agent_runtime"` or a more precise source, then render with `npm run render:poster -- --usage usage.json --out dist/aitokenweight-poster.png`.
5. Before rendering, dynamically create all presentation fields for this exact usage: `funLine`, `verdict`, `energyLine`, and exactly 3 distinct `energyComparisons` objects (`label`, `unit`, plausible positive numeric `whPerUnit`, and `icon`). Never reuse examples, previous output, or legacy `metricIds`. Vary the three categories and energy scales; the page computes the displayed counts from `whPerUnit`. Reject and rewrite any payload containing `<...>` placeholders, string-valued `whPerUnit`, or duplicate labels.
6. If a helper CLI returns a pre-filled poster URL, decode its `data` payload and add these fresh fields before rebuilding or rendering it. Never return an un-enriched helper URL.
7. Any prose before/after the JSON, Markdown fences, or a different unavailable status violates this skill.

Creative limits and icon choices are defined in `public/agent.md` and the `DailyTokenUsage` schema. These presentation values are playful estimates; the token usage itself must still follow the exact-evidence policy above.

Rendered output:
{"status":"rendered","totalTokens":123,"usageEvidence":"exact evidence source","posterPath":"dist/aitokenweight-poster.png","checkedSources":["source"]}

Unavailable output:
{"status":"usage_unavailable","totalTokens":null,"usageEvidence":"why exact current usage is unavailable","posterPath":null,"checkedSources":["source checked"]}
