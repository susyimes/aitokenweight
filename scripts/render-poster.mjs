import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DEFAULT_USAGE = {
  date: new Date().toISOString().slice(0, 10),
  timezone: 'Asia/Shanghai',
  provider: 'manual',
  handle: 'susyimes',
  inputTokens: 5200000,
  outputTokens: 3420000,
  cachedTokens: 0,
  totalTokens: 8620000,
  whPerThousand: 0.4,
  metricIds: ['phone', 'ev', 'kettle'],
  source: 'manual',
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
  const cachedTokens = readNumber(args.cachedTokens ?? fromFile.cachedTokens)
  const explicitTotal = readNumber(
    args.tokens ?? args.totalTokens ?? fromFile.totalTokens,
  )
  const legacyTotal =
    (inputTokens ?? 0) + (outputTokens ?? 0) + (cachedTokens ?? 0)
  const totalSource = explicitTotal ?? (legacyTotal || DEFAULT_USAGE.totalTokens)
  const totalTokens = Math.max(
    1,
    Math.round(totalSource),
  )

  return {
    ...DEFAULT_USAGE,
    ...fromFile,
    date: args.date ?? fromFile.date ?? DEFAULT_USAGE.date,
    timezone: args.timezone ?? fromFile.timezone ?? DEFAULT_USAGE.timezone,
    provider: args.provider ?? fromFile.provider ?? DEFAULT_USAGE.provider,
    handle: args.handle ?? fromFile.handle ?? DEFAULT_USAGE.handle,
    inputTokens: inputTokens ?? fromFile.inputTokens ?? DEFAULT_USAGE.inputTokens,
    outputTokens:
      outputTokens ?? fromFile.outputTokens ?? DEFAULT_USAGE.outputTokens,
    cachedTokens:
      cachedTokens ?? fromFile.cachedTokens ?? DEFAULT_USAGE.cachedTokens,
    totalTokens,
    whPerThousand:
      readNumber(args.whPerThousand ?? fromFile.whPerThousand) ??
      DEFAULT_USAGE.whPerThousand,
    source: args.source ?? fromFile.source ?? DEFAULT_USAGE.source,
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
