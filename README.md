# Dr Prop

独立房产诊所的品牌、官网、App 与营销视频。设计与业务依据见 [`docs/brief.md`](docs/brief.md)；上线前待办见 [`docs/launch-checklist.md`](docs/launch-checklist.md)。

一个 npm workspaces 仓库，所有端共用同一套品牌资产：

```
brand/     品牌资产（唯一来源）：tokens、字体、Pulse Roof 线与四种形态、logo、诊金分档、3D 模型
web/       官网（Vite + TypeScript，无框架）：三语静态页、诊金计算器、WebGL 背景（流体 + 脉搏线 + 颗粒）
app/       会员 App（Expo SDK 57 + Expo Router）：首页、问诊流程、病历、会员卡、我
reels/     营销视频（Remotion 4）：R1–R8，三比例批量渲染（默认只出英文）
blender/   门店数字孪生（店屋 / 商场两种形态）、药柜与动线动画的 Blender 脚本（bpy）
twin/      门店运营孪生（three.js）：交互式 3D 门店 + 看板，六种顾客走完一个模拟营业日
supabase/  App 第二阶段后端：短信登录、顾问排班、预约、会员、Lounge 签到码与看板（行级安全 + 测试）
docs/      执行文档
```

---

## 环境要求

| 用途 | 需要 |
|---|---|
| 全部 | Node.js 22（见 `.nvmrc`）、npm 10 |
| App 真机 | Xcode / Android Studio，或 EAS 云端构建 |
| Reels 渲染 | Chrome（Remotion 首次运行会自动下载）；无 GPU 的服务器设 `REMOTION_GL=swangle` |
| Blender 脚本（可选） | Blender 4.2 LTS+，或 `pip install bpy==4.2.0`（Python 3.11） |

```bash
npm install
```

## 本地运行

| 命令 | 作用 |
|---|---|
| `npm run dev` | 官网开发服务器 → http://localhost:5173 （`/` 英文、`/zh/` 中文、`/ms/` 马来文） |
| `npm run build` | 重建品牌资产 + 官网生产构建 → `web/dist/` |
| `npm run preview` | 预览生产构建 |
| `npm run app` | App 开发服务器（Expo）。Skia 与陀螺仪需要 development build：`cd app && npx expo run:ios` 或 `run:android` |
| `npm run reels` | Remotion Studio，逐帧预览所有 Reels |
| `npm run render:all` | 渲染全部 Reels（见下文） |
| `npm run twin` | 门店运营孪生 → http://localhost:5191；`npm run twin:build` 构建到 `twin/dist/`（相对路径，任何静态主机都能放） |
| `npm test` | 单元测试（品牌、官网、App、Reels 数据、门店孪生、数据库） |
| `npm run test:e2e` | 浏览器测试（Playwright）：官网成品与 App 预览流程，含无障碍检查。先 `npm run build`，App 部分再 `cd app && npx expo export -p web` |
| `npm run typecheck` | 全部包的类型检查 |
| `npm run lint -w @drprop/app` | App 的 ESLint |
| `npm run brand:build` | 由 `brand/tokens/tokens.ts` 重新生成 `tokens.css`、logo SVG、字形数据 |
| `npm run brand:3d` | 重新导出 `brand/3d/*.glb`；`npm run 3d:preview -w @drprop/brand` 查看 |
| `npm run print -w @drprop/brand` | 印刷品 → `brand/print/out/`：诊断书 PDF（A4，三语示例）、凸版诊断卡（A6）、门口诊金铜牌（300 × 400 mm）；示例诊断书同时放到官网 `/samples/` |

App 也可在浏览器里预览（适合快速看界面）：`cd app && npm run setup-skia-web && npm run web`。

App 默认是**预览模式**（本机示例数据，不连网）。接上后端：把 `app/.env.example` 复制为 `app/.env`，设 `EXPO_PUBLIC_APP_MODE=supabase` 与项目网址、publishable key，见 [`supabase/README.md`](supabase/README.md)。后端模式不收款：预约是「申请」，由顾问确认。

---

## 部署官网

官网是纯静态站，任何静态托管都可以。

| 平台 | 构建命令 | 输出目录 |
|---|---|---|
| Vercel / Netlify / Cloudflare Pages | `npm run build` | `web/dist` |

- Node 版本设为 22。
- 页面路径：`/`、`/zh/`、`/ms/`；隐私页 `/privacy/`，服务条款 `/terms/`（三语同理）。条款写明零佣金与转介费披露（brief §2.4）。
- 域名确定后，在 `web/src/config/site.ts` 填 `origin`，页面会自动加上 canonical、hreflang、分享图与商家资料（schema.org）。**填了 `origin` 就是上线构建：若 WhatsApp 号码、SSM、地址或地图链接仍是占位，构建会直接失败。**
- 构建时检查 JavaScript 总量（gzip 后须小于 250 KB，brief §7.4），并生成 `/third-party-notices.txt`（字体与开源库的许可证）。
- 手机开了省流量模式时，不加载 WebGL 背景，只显示静态脉搏线。
- 中文字体在构建时按页面实际用字裁剪（约 50 KB），改了中文文案后重新构建即可，无需手动处理。

---

## 上线前要替换的资料

所有占位内容都集中在少数几个文件里：

| 内容 | 文件 | 字段 |
|---|---|---|
| WhatsApp 号码 | `web/src/config/site.ts` | `whatsapp`（只写数字，含国码，如 `60123456789`） |
| 域名 | 同上 | `origin` |
| SSM 注册号 | 同上 | `ssm` |
| 门店地址、Google Maps 链接、营业时间 | 同上 | `store.address`、`store.mapsUrl`、`store.opens` / `closes` |
| 会员名额与剩余名额 | 同上 | `store.memberCap`、`store.memberPlacesLeft`（留空就不显示，绝不填假数字） |
| 官网 §4 门店照片 / 渲染图 | 同上 | `store.image`（现为 Lounge 概念渲染图，开业后换成实拍并设 `kind: 'photo'`），图片放 `web/public/store/` |
| 服务条款更新日期 | 同上 | `termsUpdated`（改条款时一并更新） |
| 官网三语文案 | `web/src/i18n/{en,zh,ms}.json` | 三份键名必须一致（有测试把关） |
| 诊金分档、急诊加价、复诊折扣 | `brand/pricing.ts` | 官网、App、Reels 共用，改一处全部生效 |
| App 门店信息（Lounge 座位、今日咖啡） | 预览：`app/src/data/mock.ts` 的 `STORE`；后端模式：前台在 App「顾问排班」里更新 | |
| App 后端（第二阶段） | `app/.env`、`supabase/` | 见 `supabase/README.md`：开放预约前须确认诊金与营业时间 |
| App 文案 | `app/src/i18n/strings.ts` | |
| Reels 文案 | `reels/src/copy.ts` | |
| 门店平面尺寸 | `blender/store.config.json`（店屋）、`blender/store.mall.json`（商场） | 改完运行 `python blender/build_layout_plan.py --stills brand/renders` |
| 声音 Logo | `brand/audio/sound-logo.wav` | 现为合成的暂代版（`reels/scripts/sound-logo.ts`）；委托音效师制作并买断后，同名同长度（2.5 秒）替换即可 |
| 门店孪生的示例日程 | `twin/src/sim/day.ts` | `sampleDay()` 换成当天真实预约（`Visit[]`）；平面改动后运行 `python blender/export_twin.py` |

英文与马来文文案由开发时撰写，发布前请母语者审校；隐私页、服务条款（尤其改期退款与责任条款）与免责声明请律师确认（见 brief §2）。

---

## Reels

### 渲染全部

```bash
npm run render:all
# 只渲染一部分
npm run render:all -- --only FeeReveal,case-001-lease-tenure --lang zh --ratio 9x16
# 每支出一张静帧（检查排版用），可叠加安全区
npm run render:all -- --still --safe-zone
# 接着渲染中断的批次：已完成的 MP4 保留
npm run render:all -- --skip-existing
```

输出到 `reels/out/{name}-{lang}-{ratio}.mp4`：H.264 + AAC、30 fps，比例为 9:16、4:5、16:9。默认只渲染英文（业主 2026-10-08 的决定）；中文、马来文文案仍在，`--lang en,zh,ms` 可出三语。
没有 GPU 的机器：`REMOTION_GL=swangle npm run render:all`。指定浏览器：`REMOTION_BROWSER=/path/to/chrome`。
门店揭幕（R7）的 3D 在没有 GPU 时约 5 秒一帧：每个比例先把 3D 渲染成 `reels/plates/` 里的 PNG 帧，再把文字叠在上面（出多种语言时共用同一套 3D）。中断后从缺的那一帧接着渲染；该比例完成后 `plates/` 自动清掉。

| ID | 名称 | 时长 |
|---|---|---|
| R1 | `brand-pulse-7s` / `-15s` 品牌主片 | 7 s / 15 s |
| R2 | `case-*` 一分钟病例（每个 JSON 一集） | 约 27 s |
| R3 | `before-you-sign` 签约前 5 件事 | 23.5 s |
| R4 | `fee-reveal` 诊金是多少？ | 15 s |
| R5 | `market-*` 本月房市心跳（每个 JSON 一期） | 22.5 s |
| R6 | `lounge-moment` Lounge 片刻（渲染版） | 14.5 s |
| R7 | `store-reveal` 门店揭幕（读取 `brand/3d/store.glb`） | 22.5 s |
| R8 | `member-card` 会员卡 | 10.5 s |
| R9 | `visit` 到店一趟：进门、咖啡、Lounge（AI 概念影像，只出英文） | 16.5 s |
| 主片 | `hero-promo` 品牌宣传片（仅英文，16:9 与 9:16；用 `brand/renders` 的门店渲染图） | 48.5 s |
| 产品片 | `product-film` 发布会式产品片（仅英文，16:9 与 9:16）：`brand/renders/promo` 的棚拍镜头 + `brand/renders/ai` 的写实镜头；临时配乐 `brand/audio/promo-score.m4a`（`npx tsx scripts/score.ts` 生成，换成授权音乐即可） | 67.7 s |

### 新增一集病例（R2）

在 `reels/src/data/cases/` 新增一个 JSON 文件，文件名就是这一集的 ID，例如 `004-renovation-approval.json`：

```json
{
  "houseType": "terrace",
  "highlight": "structure",
  "en": { "hook": "…?", "lines": ["…", "…", "…", "…"] },
  "zh": { "hook": "…？", "lines": ["…", "…", "…", "…"] },
  "ms": { "hook": "…?", "lines": ["…", "…", "…", "…"] }
}
```

- `houseType`：`terrace` | `condo` | `bungalow`（都是通用造型，不对应真实楼盘）
- `highlight`：用古铜色脉冲高亮的部位，`roof` | `facade` | `structure` | `land`（地契类问题用 `land`）
- 三种语言的 `lines` 条数必须相同（3–6 条）

然后：

```bash
npm test                                           # 检查 JSON 是否完整
npm run render:all -- --only case-004-renovation-approval
```

病例一律匿名；不点名发展商或楼盘；片尾会自动加上「一般资讯，非个人建议。」（brief §9.7）。

### 本月房市心跳（R5）

`reels/src/data/market/` 有两份：
- `2025-selangor-residential-value.json`：**真实数据**，雪兰莪住宅交易总值 2021–2025（百万令吉），出自 NAPIC《Property Market Report 2025》中部区域图 8（PDF 第 98 页），已对照原报告核实。这是交易总值，不是房价指数或中位价。
- `2026-q2-sample.json`：**示例数据**（`"sample": true`，画面带「示例数据 · 不可发布」水印）。

新增真实数据时设 `"sample": false`，并填 `provenance`（报告名、直接链接、页码、下载日期、文件 SHA-256）；缺任何一项测试与渲染都会拒绝。

### 交付规格

每支 MP4 渲染后自动经过 `reels/scripts/deliver.ts`：BT.709 有限范围并写明色彩标签，响度 −14 LUFS、真峰值不高于 −1 dBTP（brief §9.5）。检查已交付的影片：`npm run verify:media -w @drprop/reels`。病例 JSON 须注明 `basis`：`general`（一般知识）或 `anonymised`（真实个案，已匿名，并以 `consentRef` 记录书面同意）。

### 授权

Remotion 对个人与 3 人以内公司免费（含商用），4 人以上需购买 Company License（brief §9.4）。

---

## 3D 与 Blender

- `brand/3d/*.ts`：程序化生成 3D-1 脉搏屋顶雕塑、3D-2 白模房子、3D-4 药柜、3D-5 会员卡。Reels 直接调用；`npm run brand:3d` 导出 glb。
- `blender/build_store.py`：门店数字孪生（3D-3），两种形态共用同一平面：
  - **店屋**（`store.config.json`）：五脚基、街道、对面店屋
  - **商场**（`store.mall.json`）：大堂走廊、相邻商铺、深招牌带，私人入口走后勤通道
- 材质与布置按 brief §6：石灰华、胡桃木、亚麻、拉丝古铜、灰泥墙，2700 K 暖光。另导出轻量版 `brand/3d/store.glb` 给 R7。
- `blender/build_layout_plan.py`：门店动线动画。
  - 人物关节可动，走路有步态，坐下屈膝。
  - 动线随人物行走在地面上逐步画出。
  - 剖切轴测图和平面图带区域标注。
  - 视频在街景、室内平视镜头与剖切轴测之间剪辑。
- 材质用 Poly Haven / ambientCG 的 CC0 扫描贴图与道具：先运行 `python blender/fetch_assets.py`（约 55 MB，不进 git）；没有下载时自动改用程序化材质。

```bash
pip install bpy==4.2.0      # 或使用 Blender 4.2+：blender -b -P blender/build_layout_plan.py -- …
python blender/fetch_assets.py
python blender/build_layout_plan.py --stills brand/renders --video blender/out/layout-flow.mp4
python blender/build_layout_plan.py --config blender/store.mall.json --stills brand/renders --video blender/out/layout-flow-mall.mp4 --video-end 24
```

渲染图在 `brand/renders/`：`shophouse-*.jpg`、`mall-*.jpg`、`layout-flow*.mp4`。详见 [`blender/README.md`](blender/README.md)。

- `brand/renders/ai/`：用 Higgsfield 把五张店屋渲染图做成写实照片（Nano Banana Pro）与 5 秒镜头（Kling 3.0）。人物是生成的，属于概念图，使用时须标明；来源与模型见该目录的 README。
- `blender/export_twin.py`：为 `twin/` 导出轻量 glb（每个物体带区域标签、墙体带剖切标记）和平面数据（区域、行走网络、座位）。
- `blender/build_promo.py`：宣传片的棚拍镜头（门店模型、铜字、材质、药柜抽屉、手机、会员卡），分段可续渲。

---

## 设计约束

所有界面遵守 brief §5 的视觉系统与 §5.6「反 AI 模板清单」：不用组件库默认主题、不用渐变或玻璃拟态、不用图标或 emoji 列表、不用 Inter、圆角只有 0–2px、没有假数据；强调色古铜每页不超过 3 处；全站只有一个 CTA「预约问诊」。

动效只有两类：品牌签名（Pulse Roof）与状态反馈；缓动 `cubic-bezier(0.22, 1, 0.36, 1)`，时长 600–1200 ms；尊重 `prefers-reduced-motion`。

## 授权与来源

- 字体：Instrument Serif、Geist、Geist Mono、Noto Serif SC、Noto Sans SC，均为 SIL OFL。
- 官网流体移植自 [PavelDoGreat/WebGL-Fluid-Simulation](https://github.com/PavelDoGreat/WebGL-Fluid-Simulation)（MIT，许可证见 `web/src/scene/fluid/LICENSE`）。
- three.js、GSAP、Lenis、Remotion、Expo 等依赖各自的许可证见 `node_modules`；官网实际发布的部分在构建时汇总为 `/third-party-notices.txt`。
- 后端的数据库设计参考了 Codex 分支（`feat/brand-static-landing`）的方案，并按 brief 调整（急诊回电、整数令吉诊金、三语、饮品、会员、笔记、Lounge 看板）。
