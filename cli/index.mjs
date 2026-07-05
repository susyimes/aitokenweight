#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { userInfo } from 'node:os'

const DEFAULT_ORIGIN = 'https://susyimes.github.io/aitokenweight/'
const DEFAULT_TIMEZONE = 'Asia/Shanghai'

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

function isoDate(date, timeZone) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function unavailable(reason, checkedSources) {
  console.log(
    JSON.stringify({
      status: 'usage_unavailable',
      totalTokens: null,
      usageEvidence: reason,
      posterPath: null,
      checkedSources,
    }),
  )
  process.exit(1)
}

function openInBrowser(url) {
  if (process.platform === 'win32') {
    spawnSync('rundll32', ['url.dll,FileProtocolHandler', url])
    return
  }

  spawnSync(process.platform === 'darwin' ? 'open' : 'xdg-open', [url], {
    stdio: 'ignore',
  })
}

const args = parseArgs(process.argv.slice(2))

if (args.help) {
  console.log(`aitokenweight — turn today's AI token usage into a shareable poster URL

Usage: npx aitokenweight [options]

Reads today's Claude Code token usage from local transcripts (via ccusage)
and prints a filled poster URL. No estimates: if no exact usage is found,
prints usage_unavailable and exits 1.

Options:
  --handle <name>      Name shown on the poster (default: OS username)
  --origin <url>       Poster site origin (default: ${DEFAULT_ORIGIN})
  --timezone <iana>    Timezone for "today" (default: ${DEFAULT_TIMEZONE})
  --date <YYYY-MM-DD>  Override the report date
  --wh <number>        Wh per 1K tokens (default: 0.4)
  --json               Print machine-readable skill result JSON only
  --no-open            Do not open the poster URL in a browser
  --help               Show this help`)
  process.exit(0)
}

const timezone = args.timezone ?? DEFAULT_TIMEZONE
const date = args.date ?? isoDate(new Date(), timezone)
const since = isoDate(new Date(Date.now() - 6 * 86_400_000), timezone).replaceAll(
  '-',
  '',
)

const result = spawnSync(
  'npx',
  ['-y', 'ccusage@latest', 'daily', '--json', '--since', since],
  {
    encoding: 'utf8',
    shell: process.platform === 'win32',
    windowsHide: true,
    maxBuffer: 64 * 1024 * 1024,
  },
)

if (result.error || result.status !== 0 || !result.stdout) {
  unavailable(
    `ccusage failed: ${result.error?.message ?? result.stderr?.slice(0, 200) ?? 'no output'}`,
    ['local_log'],
  )
}

let daily
try {
  const jsonStart = result.stdout.indexOf('{')
  daily = JSON.parse(result.stdout.slice(jsonStart)).daily ?? []
} catch {
  unavailable('ccusage output was not valid JSON', ['local_log'])
}

const hasAgentField = daily.some((entry) => 'agent' in entry)
const entries = (hasAgentField
  ? daily.filter((entry) => entry.agent === 'all')
  : daily
).sort((a, b) => a.period.localeCompare(b.period))
const today = entries.find((entry) => entry.period === date)

if (!today || !(today.totalTokens > 0)) {
  unavailable(`no transcript usage recorded for ${date} (${timezone})`, [
    'local_log',
  ])
}

const usage = {
  date,
  timezone,
  provider: 'agent-runtime',
  handle: args.handle ?? userInfo().username,
  inputTokens: today.inputTokens ?? 0,
  outputTokens: today.outputTokens ?? 0,
  cacheCreationTokens: today.cacheCreationTokens ?? 0,
  cacheReadTokens: today.cacheReadTokens ?? 0,
  totalTokens: today.totalTokens,
  whPerThousand: Number(args.wh ?? 0.4),
  history: entries.slice(-7).map((entry) => entry.totalTokens),
  source: 'local_log',
  usageEvidence: `ccusage daily --json over local Claude Code transcripts for ${date}`,
}

let origin = args.origin ?? process.env.AITOKENWEIGHT_ORIGIN ?? DEFAULT_ORIGIN
if (!origin.endsWith('/')) origin += '/'

const encoded = Buffer.from(JSON.stringify(usage), 'utf8').toString('base64url')
const posterUrl = new URL(`?poster=1&data=${encoded}`, origin).href

if (args.json) {
  console.log(
    JSON.stringify({
      status: 'rendered',
      totalTokens: usage.totalTokens,
      usageEvidence: usage.usageEvidence,
      posterPath: posterUrl,
      checkedSources: ['local_log'],
    }),
  )
} else {
  console.log(`今日 (${date}) Token 消耗：${usage.totalTokens.toLocaleString('en-US')} tokens`)
  console.log(`海报链接：\n${posterUrl}`)

  if (!args['no-open']) openInBrowser(posterUrl)
}
