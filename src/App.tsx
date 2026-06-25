import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { toPng } from 'html-to-image'
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Car,
  Coffee,
  Copy,
  Crown,
  Download,
  Fan,
  Flame,
  Laptop,
  Lightbulb,
  RefreshCw,
  Refrigerator,
  RotateCcw,
  SmartphoneCharging,
  Snowflake,
  Tv,
  User,
  Utensils,
  WashingMachine,
  Zap,
} from 'lucide-react'
import './App.css'

type Page = 'compose' | 'poster'

type ReportState = {
  handle: string
  reportDate: string
  totalTokens: number
  whPerThousand: number
  history: number[]
  metricIds: string[]
}

type EnergyMetric = {
  id: string
  label: string
  unit: string
  kwhPerUnit: number
  tone: string
  icon: keyof typeof metricIcons
}

const STORAGE_KEY = 'aitokenweight-state'
const DEFAULT_TOTAL_TOKENS = 8_620_000
const DEFAULT_WH_PER_THOUSAND = 0.4

const metricIcons = {
  phone: SmartphoneCharging,
  car: Car,
  kettle: Zap,
  laptop: Laptop,
  led: Lightbulb,
  ac: Snowflake,
  fan: Fan,
  fridge: Refrigerator,
  rice: Utensils,
  washer: WashingMachine,
  tv: Tv,
  coffee: Coffee,
}

const energyMetricPool: EnergyMetric[] = [
  {
    id: 'phone',
    label: '手机充满',
    unit: '次',
    kwhPerUnit: 0.015,
    tone: 'cyan',
    icon: 'phone',
  },
  {
    id: 'ev',
    label: '电动车续航',
    unit: '公里',
    kwhPerUnit: 0.15,
    tone: 'green',
    icon: 'car',
  },
  {
    id: 'kettle',
    label: '烧开 1L 水',
    unit: '壶',
    kwhPerUnit: 0.111,
    tone: 'orange',
    icon: 'kettle',
  },
  {
    id: 'laptop',
    label: '笔记本工作',
    unit: '小时',
    kwhPerUnit: 0.06,
    tone: 'blue',
    icon: 'laptop',
  },
  {
    id: 'led',
    label: '10W LED 点亮',
    unit: '小时',
    kwhPerUnit: 0.01,
    tone: 'yellow',
    icon: 'led',
  },
  {
    id: 'ac',
    label: '1 匹空调运行',
    unit: '小时',
    kwhPerUnit: 0.8,
    tone: 'ice',
    icon: 'ac',
  },
  {
    id: 'fan',
    label: '电风扇运行',
    unit: '小时',
    kwhPerUnit: 0.05,
    tone: 'mint',
    icon: 'fan',
  },
  {
    id: 'fridge',
    label: '家用冰箱运行',
    unit: '天',
    kwhPerUnit: 1.2,
    tone: 'teal',
    icon: 'fridge',
  },
  {
    id: 'rice',
    label: '电饭煲煮饭',
    unit: '次',
    kwhPerUnit: 0.3,
    tone: 'amber',
    icon: 'rice',
  },
  {
    id: 'washer',
    label: '洗衣机标准洗',
    unit: '次',
    kwhPerUnit: 0.5,
    tone: 'violet',
    icon: 'washer',
  },
  {
    id: 'tv',
    label: '电视播放',
    unit: '小时',
    kwhPerUnit: 0.12,
    tone: 'slate',
    icon: 'tv',
  },
  {
    id: 'coffee',
    label: '咖啡机冲煮',
    unit: '杯',
    kwhPerUnit: 0.08,
    tone: 'brown',
    icon: 'coffee',
  },
]

const trendLabels = ['一', '二', '三', '四', '五', '六', '日']
const formatNumber = new Intl.NumberFormat('en-US')
const formatCompact = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 2,
})

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function seedHistory(total: number) {
  return [0.48, 0.57, 0.42, 0.7, 0.53, 0.82, 1].map((ratio) =>
    Math.round(total * ratio),
  )
}

function randomMetricIds(count = 3) {
  const pool = [...energyMetricPool]

  for (let index = pool.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1))
    ;[pool[index], pool[target]] = [pool[target], pool[index]]
  }

  return pool.slice(0, count).map((metric) => metric.id)
}

function defaultState(): ReportState {
  return {
    handle: 'susyimes',
    reportDate: todayIso(),
    totalTokens: DEFAULT_TOTAL_TOKENS,
    whPerThousand: DEFAULT_WH_PER_THOUSAND,
    history: seedHistory(DEFAULT_TOTAL_TOKENS),
    metricIds: ['phone', 'ev', 'kettle'],
  }
}

function readSavedState(): ReportState {
  if (typeof window === 'undefined') {
    return defaultState()
  }

  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (!saved) {
      return defaultState()
    }

    const parsed = JSON.parse(saved) as Partial<
      ReportState & {
        inputTokens: number
        outputTokens: number
        cachedTokens: number
        modelId: string
      }
    >
    const legacyTotal =
      (parsed.inputTokens ?? 0) +
      (parsed.outputTokens ?? 0) +
      (parsed.cachedTokens ?? 0)
    const merged: ReportState = {
      ...defaultState(),
      ...parsed,
      totalTokens: parsed.totalTokens ?? (legacyTotal || DEFAULT_TOTAL_TOKENS),
      whPerThousand: parsed.whPerThousand ?? DEFAULT_WH_PER_THOUSAND,
      metricIds:
        parsed.metricIds?.filter((id) =>
          energyMetricPool.some((metric) => metric.id === id),
        ) ?? randomMetricIds(),
    }

    if (merged.handle === '@codemaster' || merged.handle === '@developer') {
      merged.handle = 'susyimes'
    }

    return merged
  } catch {
    return defaultState()
  }
}

function clampNumber(value: number, min = 0, max = Number.MAX_SAFE_INTEGER) {
  if (!Number.isFinite(value)) {
    return min
  }

  return Math.min(max, Math.max(min, value))
}

function parseTokenInput(value: string) {
  const normalized = value.replace(/[,\s_]/g, '')
  const parsed = Number(normalized)

  return clampNumber(parsed, 0)
}

function getLevel(totalTokens: number) {
  if (totalTokens >= 10_000_000) return '7'
  if (totalTokens >= 6_000_000) return '6'
  if (totalTokens >= 2_000_000) return '5'
  if (totalTokens >= 750_000) return '4'
  return '3'
}

function formatMetricValue(value: number) {
  if (value >= 100) return Math.round(value).toString()
  if (value >= 10) return value.toFixed(1).replace(/\.0$/, '')
  return value.toFixed(2).replace(/\.00$/, '').replace(/0$/, '')
}

async function writeClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const field = document.createElement('textarea')
    field.value = text
    field.setAttribute('readonly', 'true')
    field.style.position = 'fixed'
    field.style.top = '-999px'
    document.body.appendChild(field)
    field.select()

    try {
      return document.execCommand('copy')
    } finally {
      document.body.removeChild(field)
    }
  }
}

function App() {
  const [state, setState] = useState<ReportState>(readSavedState)
  const [page, setPage] = useState<Page>('compose')
  const [notice, setNotice] = useState('')
  const reportRef = useRef<HTMLDivElement>(null)

  const computed = useMemo(() => {
    const totalTokens = Math.round(clampNumber(state.totalTokens))
    const kwh = (totalTokens / 1_000) * state.whPerThousand * 0.001
    const percentile = Math.min(
      99.9,
      Math.max(1, 100 * (1 - Math.exp(-totalTokens / 2_000_000))),
    )
    const trend = [
      ...(state.history.length === 7
        ? state.history.slice(0, 6)
        : seedHistory(totalTokens).slice(0, 6)),
      totalTokens,
    ]
    const selectedMetrics = state.metricIds
      .map((id) => energyMetricPool.find((metric) => metric.id === id))
      .filter((metric): metric is EnergyMetric => Boolean(metric))

    return {
      totalTokens,
      displayMillions: totalTokens / 1_000_000,
      kwh,
      percentile,
      progress: Math.min(100, Math.max(8, percentile)),
      trend,
      maxTrend: Math.max(...trend, 1),
      level: getLevel(totalTokens),
      selectedMetrics:
        selectedMetrics.length === 3
          ? selectedMetrics
          : energyMetricPool.slice(0, 3),
    }
  }, [state.history, state.metricIds, state.totalTokens, state.whPerThousand])

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  useEffect(() => {
    if (!notice) return

    const timer = window.setTimeout(() => setNotice(''), 1800)
    return () => window.clearTimeout(timer)
  }, [notice])

  const generatePoster = (
    event?: FormEvent<HTMLFormElement | HTMLButtonElement>,
  ) => {
    event?.preventDefault()

    setState((current) => {
      const totalTokens = Math.round(clampNumber(current.totalTokens, 1))

      return {
        ...current,
        reportDate: todayIso(),
        totalTokens,
        history: [...current.history.slice(-6), totalTokens],
        metricIds: randomMetricIds(),
      }
    })
    setPage('poster')
    setNotice('')
  }

  const useSample = () => {
    setState(defaultState())
    setNotice('示例已填入')
  }

  const rerollMetrics = () => {
    setState((current) => ({ ...current, metricIds: randomMetricIds() }))
    setNotice('已换一组表达')
  }

  const copySummary = async () => {
    const metricLine = computed.selectedMetrics
      .map((metric) => {
        const value = formatMetricValue(computed.kwh / metric.kwhPerUnit)
        return `${metric.label} ${value}${metric.unit}`
      })
      .join('，')
    const summary = [
      `今日 Token 消耗：${formatNumber.format(computed.totalTokens)} tokens`,
      `等效电量：${computed.kwh.toFixed(1)} 度电`,
      `超过 ${computed.percentile.toFixed(1)}% 的开发者`,
      `约等于：${metricLine}。`,
    ].join('\n')

    const copied = await writeClipboard(summary)
    setNotice(copied ? '摘要已复制' : '复制被浏览器拦截')
  }

  const downloadReport = async () => {
    if (!reportRef.current) return

    const dataUrl = await toPng(reportRef.current, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: '#f4f1ea',
    })
    const link = document.createElement('a')
    link.download = `aitokenweight-${state.reportDate}.png`
    link.href = dataUrl
    link.click()
    setNotice('PNG 已导出')
  }

  const quickValues = [
    { label: '轻度 2.5M', value: 2_500_000 },
    { label: '高产 8.62M', value: 8_620_000 },
    { label: '爆肝 25M', value: 25_000_000 },
  ]

  return (
    <main className={`app-shell ${page === 'poster' ? 'poster-mode' : ''}`}>
      {page === 'compose' ? (
        <section className="compose-page" aria-label="生成 Token 海报">
          <header className="compose-header">
            <div className="panel-brand">
              <span className="brand-mark" aria-hidden="true" />
              <span className="brand-word">
                aitoken<span>weight</span>
              </span>
            </div>
            <div className="step-pills" aria-label="流程">
              <span className="active">01 输入</span>
              <span>02 海报</span>
            </div>
          </header>

          <form className="compose-card" onSubmit={generatePoster}>
            <div className="compose-copy">
              <span className="eyebrow">AI energy poster</span>
              <h1>把今天的 Token 变成一张能量海报</h1>
            </div>

            <label className="hero-input">
              <span>今日 Token 总量</span>
              <input
                inputMode="numeric"
                type="text"
                value={formatNumber.format(state.totalTokens)}
                onChange={(event) =>
                  setState((current) => ({
                    ...current,
                    totalTokens: Math.round(parseTokenInput(event.target.value)),
                  }))
                }
              />
              <small>可直接粘贴 8620000、8,620,000 或带空格的数字。</small>
            </label>

            <div className="quick-values" aria-label="快捷 Token 总量">
              {quickValues.map((item) => (
                <button
                  type="button"
                  key={item.label}
                  onClick={() =>
                    setState((current) => ({
                      ...current,
                      totalTokens: item.value,
                    }))
                  }
                >
                  {item.label}
                </button>
              ))}
            </div>

            <label className="name-input">
              <span>开发者</span>
              <input
                type="text"
                value={state.handle}
                onChange={(event) =>
                  setState((current) => ({
                    ...current,
                    handle: event.target.value,
                  }))
                }
              />
            </label>

            <details className="calc-details">
              <summary>估算口径</summary>
              <div className="calc-body">
                <p>
                  默认按 {DEFAULT_WH_PER_THOUSAND.toFixed(2)} Wh / 1K tokens
                  换算，用来生成社交表达，不作为能耗审计。
                </p>
                <label>
                  <span>Wh / 1K tokens</span>
                  <input
                    min="0.01"
                    max="10"
                    step="0.01"
                    type="number"
                    value={state.whPerThousand}
                    onChange={(event) =>
                      setState((current) => ({
                        ...current,
                        whPerThousand: clampNumber(
                          Number(event.target.value),
                          0.01,
                          10,
                        ),
                      }))
                    }
                  />
                </label>
              </div>
            </details>

            <div className="compose-actions">
              <button
                type="button"
                className="primary-action"
                onClick={generatePoster}
              >
                生成海报
                <ArrowRight aria-hidden="true" />
              </button>
              <button type="button" className="secondary-action" onClick={useSample}>
                <RotateCcw aria-hidden="true" />
                示例
              </button>
            </div>

            <output className="notice" aria-live="polite">
              {notice}
            </output>
          </form>
        </section>
      ) : (
        <section className="result-page" aria-label="Token 海报结果">
          <div className="result-toolbar">
            <button type="button" onClick={() => setPage('compose')}>
              <ArrowLeft aria-hidden="true" />
              修改输入
            </button>
            <button type="button" onClick={rerollMetrics}>
              <RefreshCw aria-hidden="true" />
              换一组表达
            </button>
            <button type="button" onClick={copySummary}>
              <Copy aria-hidden="true" />
              复制摘要
            </button>
            <button type="button" className="primary-toolbar" onClick={downloadReport}>
              <Download aria-hidden="true" />
              导出 PNG
            </button>
          </div>

          <div className="report-poster" ref={reportRef}>
            <header className="poster-header">
              <div className="poster-brand">
                <span className="brand-mark" aria-hidden="true" />
                <span>
                  aitoken<span>weight</span>
                </span>
              </div>
              <div className="poster-meta">
                <strong>{state.reportDate.replaceAll('-', '.')}</strong>
                <span>
                  <User aria-hidden="true" />
                  {state.handle || 'susyimes'}
                </span>
              </div>
            </header>

            <div className="rank-badge">
              <Crown aria-hidden="true" />
              <div>
                <strong>算力领主</strong>
                <span>TOKEN · LV.{computed.level}</span>
              </div>
            </div>

            <section className="token-hero">
              <div className="spread-title" aria-label="今日 TOKEN 消耗">
                <span>今</span>
                <span>日</span>
                <span>T</span>
                <span>O</span>
                <span>K</span>
                <span>E</span>
                <span>N</span>
                <span>消</span>
                <span>耗</span>
              </div>
              <h1>{formatCompact.format(computed.displayMillions)}M</h1>
              <p>{formatNumber.format(computed.totalTokens)} tokens</p>
              <div
                className="progress-track"
                aria-label={`超过 ${computed.percentile.toFixed(1)}% 的开发者`}
              >
                <span style={{ width: `${computed.progress}%` }} />
              </div>
              <strong>超过 {computed.percentile.toFixed(1)}% 的开发者</strong>
              <div className="token-ledger" aria-label="Token 摘要">
                <div className="ledger-item input">
                  <span>计量口径</span>
                  <strong>今日总量</strong>
                </div>
                <div className="ledger-item output">
                  <span>估算基准</span>
                  <strong>{state.whPerThousand.toFixed(2)} Wh / 1K</strong>
                </div>
                <div className="ledger-item cache">
                  <span>结果表达</span>
                  <strong>随机 3 项</strong>
                </div>
              </div>
            </section>

            <section className="energy-block">
              <div className="spread-title compact" aria-label="等效算力电量">
                <span>等</span>
                <span>效</span>
                <span>算</span>
                <span>力</span>
                <span>电</span>
                <span>量</span>
              </div>
              <div className="energy-value">
                <Zap aria-hidden="true" />
                <strong>{computed.kwh.toFixed(1)}</strong>
                <span>度电</span>
              </div>
              <p>今天我为代码燃烧的 AI 算力</p>
            </section>

            <section className="metric-grid" aria-label="等效消耗">
              {computed.selectedMetrics.map((metric) => {
                const Icon = metricIcons[metric.icon]
                const value = formatMetricValue(computed.kwh / metric.kwhPerUnit)

                return (
                  <article className="metric-card" key={metric.id}>
                    <span className={`metric-icon ${metric.tone}`}>
                      <Icon aria-hidden="true" />
                    </span>
                    <strong>{value}</strong>
                    <span className="metric-unit">{metric.unit}</span>
                    <p>{metric.label}</p>
                  </article>
                )
              })}
            </section>

            <section className="trend-panel">
              <div className="streak">
                <Flame aria-hidden="true" />
                <span>本次权重</span>
                <strong>LV.{computed.level}</strong>
              </div>
              <div className="weekly">
                <div className="weekly-title">
                  <BarChart3 aria-hidden="true" />
                  Token 趋势
                </div>
                <div className="bars">
                  {computed.trend.map((value, index) => (
                    <div className="bar-item" key={`${trendLabels[index]}-${index}`}>
                      <span
                        className={index === 6 ? 'active' : ''}
                        style={{
                          height: `${Math.max(
                            18,
                            (value / computed.maxTrend) * 86,
                          )}px`,
                        }}
                      />
                      <small>{trendLabels[index]}</small>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <footer className="poster-footer">
              <div className="poster-brand mini">
                <span className="brand-mark" aria-hidden="true" />
                <span>
                  aitoken<span>weight</span>
                </span>
              </div>
              <p>
                电量按约 {state.whPerThousand.toFixed(2)} Wh / 1K tokens 估算，仅供娱乐
              </p>
              <strong>susyimes</strong>
            </footer>
          </div>

          <output className="notice result-notice" aria-live="polite">
            {notice}
          </output>
        </section>
      )}
    </main>
  )
}

export default App
