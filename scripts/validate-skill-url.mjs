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
    step.includes('npm run render:poster'),
  ),
  'Skill manifest must describe a fresh-machine remote render flow',
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

const sampleUsage = {
  date: '2026-07-02',
  timezone: 'Asia/Shanghai',
  provider: 'manual',
  handle: 'susyimes',
  inputTokens: 5200000,
  outputTokens: 3420000,
  cachedTokens: 0,
  totalTokens: 8620000,
  whPerThousand: 0.4,
  metricIds: ['phone', 'ev', 'kettle'],
  history: [4137600, 4913400, 3620400, 6034000, 4568600, 7068400, 8620000],
  source: 'manual',
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
      samplePosterUrl: `/?poster=1&data=${encoded}`,
      sampleTargetSelector: '.report-poster',
      localRenderCommand:
        'npm run render:poster -- --tokens 8620000 --handle susyimes --out dist/aitokenweight-poster.png',
    },
    null,
    2,
  ),
)
