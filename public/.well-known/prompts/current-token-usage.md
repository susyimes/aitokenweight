# Current Token Usage Prompt

You are consuming the aitokenweight Daily Token Poster skill from a remote repository.

Your first task is to determine the exact token usage for your current agent run, current API request, or current session, using telemetry that your runtime exposes to you.

Do not use demo values, examples, previous screenshots, README numbers, package defaults, or estimates. In particular, do not use `8620000` unless your current runtime explicitly reports that exact total as evidence.

Acceptable evidence includes:

- a structured API response usage object for the current request or run;
- a CLI/runtime final usage line for the current session;
- a trace, span, or local log entry that identifies this current session and records token usage;
- a provider usage endpoint result whose time window and actor match this current run.

If exact usage is available:

1. Report the evidence source and the exact total.
2. Write a `DailyTokenUsage` JSON file with `source: "agent_runtime"` or the more precise source that applies.
3. Run the manifest's `renderPoster` command with `--usage <that-json-file>`.
4. Return the image path and the usage evidence.

If exact usage is not available:

1. Do not invent, estimate, extrapolate, or use any default token count.
2. Do not run `renderPoster` with a placeholder total.
3. Return `usage_unavailable`.
4. List the telemetry sources you checked and what was missing.

Output requirements:

- Return exactly one JSON object.
- Do not wrap the JSON in Markdown fences.
- Do not add prose before or after the JSON.
- Use `null` for `totalTokens` and `posterPath` when usage is unavailable.

Output shape:

```json
{
  "status": "rendered | usage_unavailable",
  "totalTokens": "exact integer when rendered, otherwise null",
  "usageEvidence": "exact source, or unavailable reason",
  "posterPath": "path when rendered, otherwise null",
  "checkedSources": ["sources checked before deciding"]
}
```
