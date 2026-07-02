# Agent Skill URL

aitokenweight exposes a public, agent-readable skill entrypoint for generating daily token posters. The skill is deliberately split into two layers:

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
  "provider": "manual",
  "handle": "susyimes",
  "inputTokens": 5200000,
  "outputTokens": 3420000,
  "cachedTokens": 0,
  "totalTokens": 8620000,
  "whPerThousand": 0.4,
  "metricIds": ["phone", "ev", "kettle"],
  "history": [4137600, 4913400, 3620400, 6034000, 4568600, 7068400, 8620000],
  "source": "manual"
}
```

If `metricIds` or `history` are omitted, the template uses stable defaults. `totalTokens` is preferred. If it is absent, the page can derive a total from `inputTokens + outputTokens + cachedTokens`.

## Agent Flow

```text
skill link
  -> read /.well-known/agent-descriptions
  -> read the Agent Description
  -> inspect the MCP-compatible structured interface
  -> ask the user for token_usage:read before collecting provider or local usage
  -> normalize to DailyTokenUsage
  -> encode DailyTokenUsage as base64url JSON
  -> open /?poster=1&data=<payload>
  -> screenshot .report-poster
  -> return poster.png + summary.json
```

## Validation

Run the local contract check:

```bash
npm run validate:skill
```

Generate a poster PNG from explicit token totals:

```bash
npm run render:poster -- --tokens 8620000 --handle susyimes --out dist/aitokenweight-poster.png
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
npm run render:poster -- --tokens 8620000 --handle susyimes --out dist/aitokenweight-poster.png
```

The skill manifest also exposes this as `repository`, `localCommands.bootstrapRemote`, and `remoteExecution.freshMachineFlow`, so an agent can discover the commands instead of relying on this document.

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
codex --ask-for-approval never exec -C D:\aitokenweight -s workspace-write "Read public/.well-known/agent-descriptions, discover the Daily Token Poster skill, then generate a poster for 8,620,000 tokens by calling the local renderPoster command from the skill manifest. Put the image in dist/codex-cli-poster.png."
```

To force Codex CLI to behave like a fresh remote machine, run it outside the repo and give it the GitHub URL:

```bash
codex --ask-for-approval never exec -s workspace-write "Read https://github.com/susyimes/aitokenweight as an Agent Skill URL source. Clone it, inspect public/.well-known/agent-descriptions, follow the Daily Token Poster skill manifest, install dependencies, and generate dist/remote-agent-poster.png for 8,620,000 tokens."
```
