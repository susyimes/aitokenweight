# Agent Skill URL

aitokenweight exposes a public, agent-readable skill entrypoint for generating rolling 24h token posters. The skill is deliberately split into two layers:

- ANP layer: identity, discovery, capability description, structured interface metadata, and human authorization requirements.
- Application layer: provider token usage collection, usage normalization, and browser template rendering.

ANP does not fetch token usage or render images by itself. It gives a generic agent enough signed/discoverable metadata to decide what the skill can do and how to call the application actions.

## Public Entry Points

When this app is served from any origin, these paths form the Agent Skill URL surface:

```text
/.well-known/agent-descriptions
/.well-known/agents/daily-token-poster.json
/.well-known/skills/daily-token-poster.skill.json
/.well-known/skills/daily-token-poster.mcp.json
/.well-known/schemas/daily-token-usage.schema.json
/.well-known/schemas/daily-token-poster-result.schema.json
/.well-known/prompts/current-token-usage.md
```

When the app is not served as a website yet, a remote agent can use the public repository itself as the skill source:

```text
https://github.com/susyimes/aitokenweight
https://raw.githubusercontent.com/susyimes/aitokenweight/main/public/.well-known/agent-descriptions
```

In this mode the agent reads the raw manifest first, then clones the repository only when it needs the bundled renderer.

The browser template also accepts a URL payload:

```text
/?poster=1&data=<base64url-json-DailyTokenUsage>
```

The page opens directly on the poster view and renders `.report-poster`, which a host agent can screenshot with Playwright, browser-use, or another browser automation runtime.

## DailyTokenUsage

The poster URL consumes a `DailyTokenUsage` object:

```json
{
  "date": "2026-07-02",
  "timezone": "Asia/Shanghai",
  "provider": "agent-runtime",
  "handle": "agent-name",
  "inputTokens": 5200000,
  "outputTokens": 3420000,
  "cacheCreationTokens": 0,
  "cacheReadTokens": 0,
  "totalTokens": 8620000,
  "whPerThousand": 0.4,
  "metricIds": ["phone", "ev", "kettle"],
  "history": [4137600, 4913400, 3620400, 6034000, 4568600, 7068400, 8620000],
  "scope": "rolling_24h",
  "source": "agent_runtime",
  "usageEvidence": "Rolling 24h window 2026-07-01T12:00:00+08:00 to 2026-07-02T12:00:00+08:00 from runtime/API/log evidence"
}
```

If `metricIds` or `history` are omitted, the template uses stable defaults. `totalTokens` is preferred. If it is absent, the page can derive a total from `inputTokens + outputTokens + cacheCreationTokens + cacheReadTokens`.

The numbers above are documentation examples only. A remote agent must not reuse them as defaults. Before rendering, the agent must read `/.well-known/prompts/current-token-usage.md` and obtain exact rolling 24h usage evidence, or a clearly labeled calendar-day/session fallback. If exact usage is not available, it must return `usage_unavailable` and skip rendering.

## Agent Flow

```text
skill link
  -> read /.well-known/agent-descriptions
  -> read the Agent Description
  -> inspect the MCP-compatible structured interface
  -> read /.well-known/prompts/current-token-usage.md
  -> ask the user for token_usage:read before collecting provider or local usage
  -> find exact rolling 24h usage evidence, or a clearly labeled day/session fallback
  -> normalize to DailyTokenUsage
  -> encode DailyTokenUsage as base64url JSON
  -> open /?poster=1&data=<payload>
  -> screenshot .report-poster
  -> return poster.png + summary.json
```

If exact usage evidence is unavailable, stop before the render step and return `usage_unavailable`.

## Validation

Run the local contract check:

```bash
npm run validate:skill
```

Generate a poster PNG from a proven exact token total:

```bash
npm run render:poster -- --tokens <exact-rolling-24h-total-tokens> --handle <agent-handle> --source agent_runtime --out dist/aitokenweight-poster.png
```

Generate from a `DailyTokenUsage` JSON file:

```bash
npm run render:poster -- --usage usage.json --out dist/aitokenweight-poster.png
```

The renderer reuses an already running local app when available. Otherwise it starts Vite, opens `/?poster=1&data=<payload>`, waits for `.report-poster`, and screenshots that element.

## Remote Machine Flow

For another computer or another agent runtime, use the repository as the executable skill bundle:

```bash
git clone https://github.com/susyimes/aitokenweight.git
cd aitokenweight
npm ci
npx playwright install chromium
cat public/.well-known/prompts/current-token-usage.md
# If exact rolling 24h usage, or a clearly labeled day/session fallback, is available:
npm run render:poster -- --usage usage.json --out dist/aitokenweight-poster.png
# If exact usage is unavailable:
# return usage_unavailable and do not render
```

The skill manifest also exposes this as `repository`, `prompts.currentTokenUsage`, `strictUsagePolicy`, `localCommands.bootstrapRemote`, and `remoteExecution.freshMachineFlow`, so an agent can discover the commands and constraints instead of relying on this document.

Run a production build:

```bash
npm run build
```

The validation script prints a sample poster URL that can be opened under `npm run dev` or `npm run preview`.

## Production Notes

The current Agent Description has `proofStatus: unsigned-draft`. Before using it as production identity evidence, add a real DID document and proof. Token usage adapters are intentionally outside ANP; a host agent may call provider APIs, read local logs, or pass manual usage directly.

## Codex CLI Prompt

Codex CLI does not automatically inherit the Codex app browser tab. Pass the URL or repository path explicitly:

```bash
codex --ask-for-approval never exec -C D:\aitokenweight -s workspace-write "Read public/.well-known/agent-descriptions, discover the Rolling 24h Token Poster skill, then read public/.well-known/prompts/current-token-usage.md. If you can prove exact rolling 24h token usage, write usage.json with scope rolling_24h and render dist/codex-cli-poster.png. If you only have calendar-day or session usage, label that scope clearly. If you cannot prove exact usage, return usage_unavailable and do not render."
```

To force Codex CLI to behave like a fresh remote machine, run it outside the repo and give it the GitHub URL:

```bash
codex --ask-for-approval never exec -s workspace-write "Read https://github.com/susyimes/aitokenweight as an Agent Skill URL source. Clone it, inspect public/.well-known/agent-descriptions, follow the Rolling 24h Token Poster skill manifest, install dependencies, and read the current token usage prompt. Render only if exact rolling 24h usage or a clearly labeled day/session fallback is available; otherwise return usage_unavailable."
```
