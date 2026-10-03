# Dr Prop

独立房产诊所的品牌、官网、App 与营销视频。设计与业务依据见 [`docs/brief.md`](docs/brief.md)。

一个 npm workspaces 仓库，所有端共用同一套品牌资产：

```
brand/     品牌资产（唯一来源）：tokens、字体、Pulse Roof 线与四种形态、logo、诊金分档、3D 模型
web/       官网（Vite + TypeScript，无框架）：三语静态页、诊金计算器、WebGL 背景（流体 + 脉搏线 + 颗粒）
app/       会员 App（Expo SDK 57 + Expo Router）：首页、问诊流程、病历、会员卡、我
reels/     营销视频（Remotion 4）：R1–R8，三语 × 三比例批量渲染
blender/   门店数字孪生（店屋 / 商场两种形态）、药柜与动线动画的 Blender 脚本（bpy）
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
| `npm test` | 单元测试（品牌、官网、Reels 数据） |
| `npm run typecheck` | 四个包的类型检查 |
| `npm run lint -w @drprop/app` | App 的 ESLint |
| `npm run brand:build` | 由 `brand/tokens/tokens.ts` 重新生成 `tokens.css`、logo SVG、字形数据 |
| `npm run brand:3d` | 重新导出 `brand/3d/*.glb`；`npm run 3d:preview -w @drprop/brand` 查看 |

App 也可在浏览器里预览（适合快速看界面）：`cd app && npm run setup-skia-web && npm run web`。

---

## 部署官网

官网是纯静态站，任何静态托管都可以。

| 平台 | 构建命令 | 输出目录 |
|---|---|---|
| Vercel / Netlify / Cloudflare Pages | `npm run build` | `web/dist` |

- Node 版本设为 22。
- 页面路径：`/`、`/zh/`、`/ms/`，隐私页 `/privacy/`、`/zh/privacy/`、`/ms/privacy/`。
- 域名确定后，在 `web/src/config/site.ts` 填 `origin`，页面会自动加上 canonical 与 hreflang。
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
| 官网 §4 门店照片 / 渲染图 | 同上 | `store.image`，图片放 `web/public/` |
| 官网三语文案 | `web/src/i18n/{en,zh,ms}.json` | 三份键名必须一致（有测试把关） |
| 诊金分档、急诊加价、复诊折扣 | `brand/pricing.ts` | 官网、App、Reels 共用，改一处全部生效 |
| App 门店信息（Lounge 座位、今日咖啡） | `app/src/data/mock.ts` | `STORE`（第二阶段接 Supabase 后改为读后端） |
| App 文案 | `app/src/i18n/strings.ts` | |
| Reels 文案 | `reels/src/copy.ts` | |
| 门店平面尺寸 | `blender/store.config.json`（店屋）、`blender/store.mall.json`（商场） | 改完运行 `python blender/build_layout_plan.py --stills brand/renders` |
| 声音 Logo | `brand/audio/sound-logo.wav` | 放入后每支 Reel 片尾自动使用 |

英文与马来文文案由开发时撰写，发布前请母语者审校；隐私页与免责声明请律师确认（见 brief §2）。

---

## Reels

### 渲染全部

```bash
npm run render:all
# 只渲染一部分
npm run render:all -- --only FeeReveal,case-001-lease-tenure --lang zh --ratio 9x16
# 每支出一张静帧（检查排版用），可叠加安全区
npm run render:all -- --still --safe-zone
```

输出到 `reels/out/{name}-{lang}-{ratio}.mp4`：H.264 + AAC、30 fps，三语分开渲染，比例为 9:16、4:5、16:9。
没有 GPU 的机器：`REMOTION_GL=swangle npm run render:all`。指定浏览器：`REMOTION_BROWSER=/path/to/chrome`。

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

`reels/src/data/market/` 里现在是一份**示例数据**（`"sample": true`，画面带「示例数据 · 不可发布」水印）。
用 NAPIC 公布的数字新建一个文件（如 `2026-q3.json`），填好 `source` 与 `date`，并设 `"sample": false`。

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

---

## 设计约束

所有界面遵守 brief §5 的视觉系统与 §5.6「反 AI 模板清单」：不用组件库默认主题、不用渐变或玻璃拟态、不用图标或 emoji 列表、不用 Inter、圆角只有 0–2px、没有假数据；强调色古铜每页不超过 3 处；全站只有一个 CTA「预约问诊」。

动效只有两类：品牌签名（Pulse Roof）与状态反馈；缓动 `cubic-bezier(0.22, 1, 0.36, 1)`，时长 600–1200 ms；尊重 `prefers-reduced-motion`。

## 授权与来源

- 字体：Instrument Serif、Geist、Geist Mono、Noto Serif SC、Noto Sans SC，均为 SIL OFL。
- 官网流体移植自 [PavelDoGreat/WebGL-Fluid-Simulation](https://github.com/PavelDoGreat/WebGL-Fluid-Simulation)（MIT，许可证见 `web/src/scene/fluid/LICENSE`）。
- three.js、GSAP、Lenis、Remotion、Expo 等依赖各自的许可证见 `node_modules`。
