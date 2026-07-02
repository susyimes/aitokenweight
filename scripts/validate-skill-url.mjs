import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function readJson(relativePath) {
  const filePath = resolve(root, relativePath)
  return JSON.parse(readFileSync(filePath, 'utf8'))
}

function readText(relativePath) {
  return readFileSync(resolve(root, relativePath), 'utf8')
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

const collection = readJson('public/.well-known/agent-descriptions')
const agent = readJson('public/.well-known/agents/daily-token-poster.json')
const skill = readJson('public/.well-known/skills/daily-token-poster.skill.json')
const toolset = readJson('public/.well-known/skills/daily-token-poster.mcp.json')
const usageSchema = readJson(
  'public/.well-known/schemas/daily-token-usage.schema.json',
)
const resultSchema = readJson(
  'public/.well-known/schemas/daily-token-poster-result.schema.json',
)
const packageJson = readJson('package.json')
const appSource = readText('src/App.tsx')
const renderSource = readText('scripts/render-poster.mjs')
const currentUsagePrompt = readText(
  'public/.well-known/prompts/current-token-usage.md',
)

assert(collection['@type'] === 'CollectionPage', 'Discovery must be CollectionPage')
assert(
  collection.items?.some(
    (item) => item.url === '/.well-known/agents/daily-token-poster.json',
  ),
  'Discovery must link the daily token poster Agent Description',
)
assert(agent.protocolType === 'ANP', 'Agent Description must use ANP')
assert(agent.type === 'AgentDescription', 'Agent Description type mismatch')
assert(
  agent['x-aitokenweight']?.proofStatus !== 'fake',
  'Do not ship fake DID proof',
)
assert(
  agent.interfaces?.some(
    (item) =>
      item.type === 'StructuredInterface' &&
      item.protocol === 'MCP' &&
      item.url === '/.well-known/skills/daily-token-poster.mcp.json',
  ),
  'Agent Description must expose the MCP structured interface',
)
assert(skill.schema === 'agent-skill-url.v1', 'Skill manifest schema mismatch')
assert(
  skill.template?.posterUrlTemplate ===
    '/?poster=1&data={base64url-json-DailyTokenUsage}',
  'Skill manifest must describe the poster URL template',
)
assert(
  skill.localCommands?.renderPoster?.command?.includes('npm run render:poster'),
  'Skill manifest must expose the local renderPoster command',
)
assert(
  skill.localCommands?.renderPosterFromExactTotal?.command?.includes(
    '<exact-current-total-tokens>',
  ),
  'Skill manifest must require an exact current total placeholder',
)
assert(
  skill.repository?.cloneUrl === 'https://github.com/susyimes/aitokenweight.git',
  'Skill manifest must expose the public Git clone URL',
)
assert(
  skill.repository?.rawDiscoveryUrl?.includes(
    'raw.githubusercontent.com/susyimes/aitokenweight/main',
  ),
  'Skill manifest must expose a raw GitHub discovery URL',
)
assert(
  skill.remoteExecution?.freshMachineFlow?.some((step) =>
    step.includes('usage_unavailable'),
  ),
  'Skill manifest must describe usage_unavailable when exact usage is missing',
)
assert(
  skill.strictUsagePolicy?.defaultTokenUsageAllowed === false,
  'Skill manifest must forbid default token usage',
)
assert(
  skill.prompts?.currentTokenUsage?.rawUrl?.includes(
    'public/.well-known/prompts/current-token-usage.md',
  ),
  'Skill manifest must link the current token usage prompt',
)
assert(toolset.schema === 'mcp.toolset.v1', 'Toolset schema mismatch')
const toolNames = new Set(toolset.tools?.map((tool) => tool.name))
assert(toolNames.has('collectUsage'), 'Toolset must define collectUsage')
assert(toolNames.has('renderPoster'), 'Toolset must define renderPoster')
assert(
  usageSchema.required?.includes('totalTokens'),
  'DailyTokenUsage must require totalTokens',
)
assert(
  usageSchema.properties?.source?.enum?.includes('agent_runtime'),
  'DailyTokenUsage source enum must include agent_runtime',
)
assert(
  resultSchema.required?.includes('posterPng'),
  'Poster result must require posterPng',
)
assert(
  appSource.includes('decodePosterPayload') &&
    appSource.includes('readPosterUrlState'),
  'App must include the URL payload poster entrypoint',
)
assert(
  packageJson.scripts?.['render:poster'] === 'node scripts/render-poster.mjs',
  'package.json must expose npm run render:poster',
)
assert(
  renderSource.includes("page.locator('.report-poster')") &&
    renderSource.includes('chromium.launch'),
  'render-poster must screenshot the poster with Playwright',
)
assert(
  renderSource.includes('Missing exact token usage') &&
    !renderSource.includes('DEFAULT_USAGE.totalTokens'),
  'render-poster must fail without exact usage instead of using defaults',
)
assert(
  currentUsagePrompt.includes('Never use demo/default/example/estimated numbers') &&
    currentUsagePrompt.includes('usage_unavailable'),
  'current token usage prompt must forbid demo defaults and define unavailable behavior',
)
assert(
  currentUsagePrompt.includes('exactly one JSON object and nothing else') &&
    currentUsagePrompt.includes('No Markdown fences'),
  'current token usage prompt must require strict JSON output',
)

const sampleUsage = {
  date: '2026-07-02',
  timezone: 'Asia/Shanghai',
  provider: 'agent-runtime',
  handle: 'susyimes',
  inputTokens: 5200000,
  outputTokens: 3420000,
  cachedTokens: 0,
  totalTokens: 8620000,
  whPerThousand: 0.4,
  metricIds: ['phone', 'ev', 'kettle'],
  history: [4137600, 4913400, 3620400, 6034000, 4568600, 7068400, 8620000],
  source: 'agent_runtime',
  usageEvidence: 'validator fixture only; not a default runtime usage value',
}
const encoded = Buffer.from(JSON.stringify(sampleUsage), 'utf8').toString(
  'base64url',
)

console.log(
  JSON.stringify(
    {
      status: 'ok',
      discovery: '/.well-known/agent-descriptions',
      agentDescription: '/.well-known/agents/daily-token-poster.json',
      skillManifest: '/.well-known/skills/daily-token-poster.skill.json',
      structuredInterface: '/.well-known/skills/daily-token-poster.mcp.json',
      fixturePosterUrl: `/?poster=1&data=${encoded}`,
      sampleTargetSelector: '.report-poster',
      localRenderCommand:
        'npm run render:poster -- --usage usage.json --out dist/aitokenweight-poster.png',
      missingUsageBehavior: 'usage_unavailable; do not render',
    },
    null,
    2,
  ),
)
