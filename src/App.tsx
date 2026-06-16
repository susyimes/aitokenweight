import { useEffect, useMemo, useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import {
  BarChart3,
  CalendarDays,
  Car,
  Copy,
  Crown,
  Download,
  Flame,
  Gauge,
  RotateCcw,
  Save,
  SlidersHorizontal,
  Smartphone,
  User,
  Zap,
} from 'lucide-react'
import './App.css'

type ModelPreset = {
  id: string
  label: string
  multiplier: number
}

type CalculatorState = {
  handle: string
  reportDate: string
  inputTokens: number
  outputTokens: number
  cachedTokens: number
  whPerThousand: number
  streakDays: number
  modelId: string
  history: number[]
}

const STORAGE_KEY = 'aitokenweight-state'

const modelPresets: ModelPreset[] = [
  { id: 'agent', label: '代码智能体', multiplier: 1 },
  { id: 'reasoning', label: '长上下文推理', multiplier: 1.35 },
  { id: 'chat', label: '轻量问答', multiplier: 0.55 },
  { id: 'custom', label: '自定义估算', multiplier: 1 },
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

function defaultState(): CalculatorState {
  const total = 8_620_000

  return {
    handle: 'susyimes',
    reportDate: todayIso(),
    inputTokens: 4_180_000,
    outputTokens: 3_820_000,
    cachedTokens: 620_000,
    whPerThousand: 0.4,
    streakDays: 37,
    modelId: 'agent',
    history: seedHistory(total),
  }
}

function readSavedState(): CalculatorState {
  if (typeof window === 'undefined') {
    return defaultState()
  }

  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (!saved) {
      return defaultState()
    }

    const parsed = JSON.parse(saved) as Partial<CalculatorState>
    const merged = { ...defaultState(), ...parsed }

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

function getLevel(totalTokens: number) {
  if (totalTokens >= 10_000_000) return '7'
  if (totalTokens >= 6_000_000) return '6'
  if (totalTokens >= 2_000_000) return '5'
  if (totalTokens >= 750_000) return '4'
  return '3'
}

function App() {
  const [state, setState] = useState<CalculatorState>(readSavedState)
  const [notice, setNotice] = useState('')
  const reportRef = useRef<HTMLDivElement>(null)

  const selectedModel =
    modelPresets.find((model) => model.id === state.modelId) ?? modelPresets[0]

  const totalTokens = useMemo(
    () => state.inputTokens + state.outputTokens + state.cachedTokens,
    [state.cachedTokens, state.inputTokens, state.outputTokens],
  )

  const computed = useMemo(() => {
    const kwh =
      (totalTokens / 1_000) *
      state.whPerThousand *
      selectedModel.multiplier *
      0.001
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

    return {
      displayMillions: totalTokens / 1_000_000,
      kwh,
      percentile,
      progress: Math.min(100, Math.max(8, percentile)),
      phoneCharges: Math.round(kwh / 0.015),
      evKilometers: Math.round(kwh / 0.15),
      boiledWater: Math.round(kwh / 0.111),
      trend,
      maxTrend: Math.max(...trend, 1),
      level: getLevel(totalTokens),
    }
  }, [selectedModel.multiplier, state.history, state.whPerThousand, totalTokens])

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  useEffect(() => {
    if (!notice) return

    const timer = window.setTimeout(() => setNotice(''), 1800)
    return () => window.clearTimeout(timer)
  }, [notice])

  const setField = <Key extends keyof CalculatorState>(
    key: Key,
    value: CalculatorState[Key],
  ) => {
    setState((current) => ({ ...current, [key]: value }))
  }

  const setTokenField = (
    key: 'inputTokens' | 'outputTokens' | 'cachedTokens',
    value: string,
  ) => {
    setField(key, Math.round(clampNumber(Number(value))))
  }

  const copySummary = async () => {
    const summary = [
      `今日 Token 消耗：${formatNumber.format(totalTokens)} tokens`,
      `等效电量：${computed.kwh.toFixed(1)} 度电`,
      `超过 ${computed.percentile.toFixed(1)}% 的开发者`,
      `约等于手机充电 ${computed.phoneCharges} 次，电动车续航 ${computed.evKilometers} 公里，烧开水 ${computed.boiledWater} 壶。`,
    ].join('\n')

    await navigator.clipboard.writeText(summary)
    setNotice('摘要已复制')
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

  const saveToday = () => {
    setState((current) => ({
      ...current,
      history: [...computed.trend.slice(1), totalTokens],
    }))
    setNotice('今日数据已保存')
  }

  const resetDemo = () => {
    setState(defaultState())
    setNotice('已恢复示例')
  }

  const tokenBreakdown = [
    { label: '输入', value: state.inputTokens, tone: 'input' },
    { label: '输出', value: state.outputTokens, tone: 'output' },
    { label: '缓存', value: state.cachedTokens, tone: 'cache' },
  ]

  const metricItems = [
    {
      icon: <Smartphone aria-hidden="true" />,
      value: computed.phoneCharges,
      unit: '次',
      label: '充满手机',
      tone: 'cyan',
    },
    {
      icon: <Car aria-hidden="true" />,
      value: computed.evKilometers,
      unit: '公里',
      label: '电动车续航',
      tone: 'green',
    },
    {
      icon: <Gauge aria-hidden="true" />,
      value: computed.boiledWater,
      unit: '壶',
      label: '烧开水',
      tone: 'orange',
    },
  ]

  return (
    <main className="app-shell">
      <aside className="control-panel" aria-label="Token 消耗参数">
        <div className="panel-brand">
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-word">
            aitoken<span>weight</span>
          </span>
        </div>

        <section className="control-section">
          <h2>
            <SlidersHorizontal aria-hidden="true" />
            今日消耗
          </h2>
          <label>
            输入 tokens
            <input
              min="0"
              step="1000"
              type="number"
              value={state.inputTokens}
              onChange={(event) =>
                setTokenField('inputTokens', event.target.value)
              }
            />
          </label>
          <label>
            输出 tokens
            <input
              min="0"
              step="1000"
              type="number"
              value={state.outputTokens}
              onChange={(event) =>
                setTokenField('outputTokens', event.target.value)
              }
            />
          </label>
          <label>
            缓存 tokens
            <input
              min="0"
              step="1000"
              type="number"
              value={state.cachedTokens}
              onChange={(event) =>
                setTokenField('cachedTokens', event.target.value)
              }
            />
          </label>
        </section>

        <section className="control-section">
          <h2>
            <CalendarDays aria-hidden="true" />
            报告信息
          </h2>
          <label>
            日期
            <input
              type="date"
              value={state.reportDate}
              onChange={(event) => setField('reportDate', event.target.value)}
            />
          </label>
          <label>
            开发者
            <input
              type="text"
              value={state.handle}
              onChange={(event) => setField('handle', event.target.value)}
            />
          </label>
          <label>
            连续打卡
            <input
              min="0"
              type="number"
              value={state.streakDays}
              onChange={(event) =>
                setField('streakDays', Math.round(clampNumber(Number(event.target.value))))
              }
            />
          </label>
        </section>

        <section className="control-section">
          <h2>
            <Zap aria-hidden="true" />
            算力参数
          </h2>
          <label>
            算力档位
            <select
              value={state.modelId}
              onChange={(event) => setField('modelId', event.target.value)}
            >
              {modelPresets.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Wh / 1K tokens
            <input
              min="0.05"
              max="3"
              step="0.05"
              type="number"
              value={state.whPerThousand}
              onChange={(event) =>
                setField(
                  'whPerThousand',
                  clampNumber(Number(event.target.value), 0.05, 3),
                )
              }
            />
          </label>
        </section>

        <div className="actions">
          <button type="button" onClick={saveToday}>
            <Save aria-hidden="true" />
            保存今日
          </button>
          <button type="button" onClick={downloadReport}>
            <Download aria-hidden="true" />
            导出 PNG
          </button>
          <button type="button" onClick={copySummary}>
            <Copy aria-hidden="true" />
            复制摘要
          </button>
          <button type="button" className="ghost" onClick={resetDemo}>
            <RotateCcw aria-hidden="true" />
            示例
          </button>
        </div>

        <output className="notice" aria-live="polite">
          {notice}
        </output>
      </aside>

      <section className="preview-stage" aria-label="Token 消耗海报预览">
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
            <p>{formatNumber.format(totalTokens)} tokens</p>
            <div
              className="progress-track"
              aria-label={`超过 ${computed.percentile.toFixed(1)}% 的开发者`}
            >
              <span style={{ width: `${computed.progress}%` }} />
            </div>
            <strong>超过 {computed.percentile.toFixed(1)}% 的开发者</strong>
            <div className="token-ledger" aria-label="Token 分布">
              {tokenBreakdown.map((item) => (
                <div className={`ledger-item ${item.tone}`} key={item.label}>
                  <span>{item.label}</span>
                  <strong>{formatNumber.format(item.value)}</strong>
                </div>
              ))}
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
            {metricItems.map((item) => (
              <article className="metric-card" key={item.label}>
                <span className={`metric-icon ${item.tone}`}>{item.icon}</span>
                <strong>{item.value}</strong>
                <span className="metric-unit">{item.unit}</span>
                <p>{item.label}</p>
              </article>
            ))}
          </section>

          <section className="trend-panel">
            <div className="streak">
              <Flame aria-hidden="true" />
              <span>连续打卡</span>
              <strong>{state.streakDays}</strong>
            </div>
            <div className="weekly">
              <div className="weekly-title">
                <BarChart3 aria-hidden="true" />
                本周 Token 趋势
              </div>
              <div className="bars">
                {computed.trend.map((value, index) => (
                  <div className="bar-item" key={`${trendLabels[index]}-${index}`}>
                    <span
                      className={index === 6 ? 'active' : ''}
                      style={{
                        height: `${Math.max(18, (value / computed.maxTrend) * 86)}px`,
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
            <strong>{selectedModel.label}</strong>
          </footer>
        </div>
      </section>
    </main>
  )
}

export default App
