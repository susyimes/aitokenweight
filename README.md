# aitokenweight Token 消耗计算器

一个两页式 Token 能耗海报生成器。第一页只输入 Token 总量和开发者名称，第二页生成可分享的结果海报，并支持随机切换常见能源表达方式、复制摘要和导出 PNG。

## 快速开始（三选一）

**① 把这段话发给你的 AI**——指令自带降级方案，任何 agent 都能走通，收到后它会回你一张填好的海报链接：

```text
读取 https://susyimes.github.io/aitokenweight/agent.md 并按其执行，帮我生成今日 token 消耗海报；优先用你运行时能看到的 token 用量，拿不到全天数据就用当前会话消耗（scope 设为 session）并向我说明；最后直接回复填好的海报链接，不要生成图片。
```

（网页首页也有一键复制这段指令的卡片；只发裸链接 `https://susyimes.github.io/aitokenweight/` 也可以，页面里埋了同样的指令，但部分 agent 会先反问一句。）

**② 一条命令直接生成**（读取本地 Claude Code 记录，无需 agent）：

```bash
npx aitokenweight
```

**③ 装成 Claude Code 技能**（回头客，之后每天说一句"今日海报"即可）：

```text
/plugin marketplace add susyimes/aitokenweight
```

## 功能

- 极简输入页：Token 总量、开发者名称
- 结果海报页：Token 总量、等效电量、开发者百分位、趋势
- 随机能源表达：手机充电、电动车续航、空调运行、LED 点亮、冰箱运行等
- 根据 token 总量生成开发者百分位、等级和本周趋势
- 本地保存数据，支持复制摘要、换一组表达、导出 PNG
- Agent Skill URL：通过 ANP-style `.well-known` 入口暴露 skill manifest、MCP-style action schema 和海报模板 URL

## 本地运行

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
```

## Agent Skill URL

本项目把 ANP 用作通用 agent skill 的协议外壳：agent 读取 `/.well-known/agent-descriptions`，发现 Daily Token Poster 的 Agent Description，再读取 MCP-style structured interface。ANP 负责发现、身份和调用描述；当日 token 统计与 PNG 渲染仍由上层 skill action / host runtime 实现。

远程仓库入口：

```text
https://github.com/susyimes/aitokenweight
https://raw.githubusercontent.com/susyimes/aitokenweight/main/public/.well-known/agent-descriptions
```

本地校验：

```bash
npm run validate:skill
```

本地生成海报 PNG：

```bash
npm run render:poster -- --usage usage.json --out dist/aitokenweight-poster.png
```

其它电脑上的 agent 可以按 manifest 中的 `remoteExecution.freshMachineFlow` 执行：

```bash
git clone https://github.com/susyimes/aitokenweight.git
cd aitokenweight
npm ci
npx playwright install chromium
# First read public/.well-known/prompts/current-token-usage.md.
# Render only if exact current token usage is available.
npm run render:poster -- --usage usage.json --out dist/aitokenweight-poster.png
```

如果 agent 拿不到当前 run/session 的准确 token usage，应返回 `usage_unavailable`，不要使用默认值、示例值或估算值生成海报。

详细说明见 [`docs/AGENT_SKILL_URL.md`](docs/AGENT_SKILL_URL.md)。

## 产品化与部署

- 产品化计划见 [`docs/PRODUCTIZATION.md`](docs/PRODUCTIZATION.md)
- 阿里云 ECS 静态部署见 [`docs/DEPLOY_ALIYUN_ECS.md`](docs/DEPLOY_ALIYUN_ECS.md)
- 可选 Docker/Nginx 部署文件：[`Dockerfile`](Dockerfile)、[`deploy/nginx.conf`](deploy/nginx.conf)
