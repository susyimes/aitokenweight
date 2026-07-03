# aitokenweight CLI

One command from token logs to a shareable poster:

```bash
npx aitokenweight
```

Reads today's exact Claude Code token usage from local transcripts (via
[ccusage](https://github.com/ryoppippi/ccusage)), fills it into the
[aitokenweight](https://github.com/susyimes/aitokenweight) poster page, prints
the filled URL, and opens it in your browser.

Strict policy: exact numbers only. If no usage is recorded for today, it prints
`usage_unavailable` and exits 1 — it never renders estimates or demo values.

## Options

```text
--handle <name>      Name shown on the poster (default: OS username)
--origin <url>       Poster site origin (default: https://susyimes.github.io/aitokenweight/)
--timezone <iana>    Timezone for "today" (default: Asia/Shanghai)
--date <YYYY-MM-DD>  Override the report date
--wh <number>        Wh per 1K tokens (default: 0.4)
--json               Print machine-readable skill result JSON only
--no-open            Do not open the poster URL in a browser
```

## For AI agents

`npx -y aitokenweight@latest --json --no-open` prints exactly one JSON object:

```json
{"status":"rendered","totalTokens":123,"usageEvidence":"...","posterPath":"https://...","checkedSources":["local_log"]}
```

or, when no exact usage exists, `{"status":"usage_unavailable", ...}` with exit
code 1. See the site's `/agent.md` for the full skill contract.
