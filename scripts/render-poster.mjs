import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DEFAULT_USAGE_METADATA = {
  date: new Date().toISOString().slice(0, 10),
  timezone: 'Asia/Shanghai',
  provider: 'agent-runtime',
  handle: 'susyimes',
  whPerThousand: 0.4,
  metricIds: ['phone', 'ev', 'kettle'],
  scope: 'rolling_24h',
  source: 'agent_runtime',
}

function parseArgs(argv) {
  const args = {}

  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index]

    if (!item.startsWith('--')) continue

    const key = item.slice(2)
    const next = argv[index + 1]

    if (!next || next.startsWith('--')) {
      args[key] = true
      continue
    }

    args[key] = next
    index += 1
  }

  return args
}

function readNumber(value) {
  if (value === undefined || value === null || value === '') return undefined

  const parsed = Number(String(value).replace(/[,\s_]/g, ''))
  return Number.isFinite(parsed) ? parsed : undefined
}

function readUsage(args) {
  const usagePath = args.usage ? resolve(root, args.usage) : null
  const fromFile =
    usagePath && existsSync(usagePath)
      ? JSON.parse(readFileSync(usagePath, 'utf8'))
      : {}
  const inputTokens = readNumber(args.inputTokens ?? fromFile.inputTokens)
  const outputTokens = readNumber(args.outputTokens ?? fromFile.outputTokens)
  const legacyCachedTokens = readNumber(args.cachedTokens ?? fromFile.cachedTokens)
  const cacheCreationTokens = readNumber(
    args.cacheCreationTokens ?? fromFile.cacheCreationTokens,
  )
  const cacheReadTokens =
    readNumber(args.cacheReadTokens ?? fromFile.cacheReadTokens) ??
    legacyCachedTokens
  const explicitTotal = readNumber(
    args.tokens ?? args.totalTokens ?? fromFile.totalTokens,
  )
  const hasTokenBreakdown =
    inputTokens !== undefined ||
    outputTokens !== undefined ||
    cacheCreationTokens !== undefined ||
    cacheReadTokens !== undefined
  const legacyTotal =
    (inputTokens ?? 0) +
    (outputTokens ?? 0) +
    (cacheCreationTokens ?? 0) +
    (cacheReadTokens ?? 0)
  const totalSource = explicitTotal ?? (hasTokenBreakdown ? legacyTotal : undefined)

  if (totalSource === undefined) {
    throw new Error(
      'Missing exact token usage. Pass --tokens, --totalTokens, --usage with totalTokens, or an input/output/cached token breakdown. Do not use demo/default token values.',
    )
  }

  const totalTokens = Math.max(0, Math.round(totalSource))

  return {
    ...DEFAULT_USAGE_METADATA,
    ...fromFile,
    date: args.date ?? fromFile.date ?? DEFAULT_USAGE_METADATA.date,
    timezone: args.timezone ?? fromFile.timezone ?? DEFAULT_USAGE_METADATA.timezone,
    provider: args.provider ?? fromFile.provider ?? DEFAULT_USAGE_METADATA.provider,
    handle: args.handle ?? fromFile.handle ?? DEFAULT_USAGE_METADATA.handle,
    ...(inputTokens !== undefined ? { inputTokens } : {}),
    ...(outputTokens !== undefined ? { outputTokens } : {}),
    ...(cacheCreationTokens !== undefined ? { cacheCreationTokens } : {}),
    ...(cacheReadTokens !== undefined ? { cacheReadTokens } : {}),
    totalTokens,
    whPerThousand:
      readNumber(args.whPerThousand ?? fromFile.whPerThousand) ??
      DEFAULT_USAGE_METADATA.whPerThousand,
    scope: args.scope ?? fromFile.scope ?? DEFAULT_USAGE_METADATA.scope,
    source: args.source ?? fromFile.source ?? DEFAULT_USAGE_METADATA.source,
  }
}

async function isReachable(url) {
  try {
    const response = await fetch(url)
    return response.ok
  } catch {
    return false
  }
}

async function waitForServer(url, timeoutMs = 20000) {
  const startedAt = Date.now()

  while (Date.now() - startedAt < timeoutMs) {
    if (await isReachable(url)) return
    await new Promise((resolveWait) => setTimeout(resolveWait, 400))
  }

  throw new Error(`Timed out waiting for ${url}`)
}

async function ensureServer(args) {
  const requested =
    args['base-url'] ?? args.baseUrl ?? process.env.AITOKENWEIGHT_BASE_URL

  if (requested) {
    await waitForServer(requested, 10000)
    return { baseUrl: requested, process: null }
  }

  const requestedPort = readNumber(args.port)
  const candidates = requestedPort
    ? []
    : ['http://127.0.0.1:4173/', 'http://127.0.0.1:4174/']

  for (const candidate of candidates) {
    if (await isReachable(candidate)) {
      return { baseUrl: candidate, process: null }
    }
  }

  const port = requestedPort ?? 4173
  const { createServer } = await import('vite')
  const viteServer = await createServer({
    root,
    logLevel: 'silent',
    server: {
      host: '127.0.0.1',
      port,
      strictPort: true,
    },
  })
  const baseUrl = `http://127.0.0.1:${port}/`

  await viteServer.listen()
  await waitForServer(baseUrl)
  return { baseUrl, viteServer }
}

async function launchBrowser() {
  try {
    return await chromium.launch({ headless: true })
  } catch (error) {
    try {
      return await chromium.launch({ channel: 'chrome', headless: true })
    } catch {
      throw error
    }
  }
}

function buildPosterUrl(baseUrl, usage) {
  const encoded = Buffer.from(JSON.stringify(usage), 'utf8').toString(
    'base64url',
  )
  return new URL(`/?poster=1&data=${encoded}`, baseUrl).href
}

const args = parseArgs(process.argv.slice(2))
const usage = readUsage(args)
const outputPath = resolve(root, args.out ?? 'dist/aitokenweight-poster.png')
mkdirSync(dirname(outputPath), { recursive: true })

let server
let browser

try {
  server = await ensureServer(args)
  const posterUrl = buildPosterUrl(server.baseUrl, usage)
  browser = await launchBrowser()

  const page = await browser.newPage({
    viewport: { width: 900, height: 1300 },
    deviceScaleFactor: readNumber(args.pixelRatio) ?? 2,
  })

  await page.goto(posterUrl, { waitUntil: 'networkidle' })
  await page.addStyleTag({
    content:
      '.result-toolbar,.result-notice{display:none!important}.result-page{gap:0!important}',
  })
  const poster = page.locator('.report-poster')
  await poster.waitFor({ state: 'visible', timeout: 15000 })
  await poster.evaluate((element) => element.classList.add('export-compact'))
  await poster.screenshot({ path: outputPath })

  console.log(
    JSON.stringify(
      {
        status: 'ok',
        output: outputPath,
        baseUrl: server.baseUrl,
        posterUrl,
        selector: '.report-poster',
        usage: {
          date: usage.date,
          timezone: usage.timezone,
          provider: usage.provider,
          handle: usage.handle,
          totalTokens: usage.totalTokens,
          source: usage.source,
        },
      },
      null,
      2,
    ),
  )
} finally {
  await browser?.close()

  await server?.viteServer?.close()
}
