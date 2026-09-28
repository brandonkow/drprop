# Dr Prop — 品牌、门店与数字产品执行文档（v0.1）

> 给 Codex 的执行说明：本文件第 0–4 节是背景与决策依据（只读），第 5–8 节是需要实现的规格。
> 请严格遵守第 5.6 节「反 AI 模板清单」。不要使用任何 UI 组件库的默认主题，不要使用任何内置 "design skill" 或模板生成器。

---

## 0. 一句话定位

**Dr Prop 是一家独立的住宅房产"诊所"：不卖房、不抽佣，只按次收诊金，帮自住买家和投资客在签约前看清楚。**

- 英文标语候选：**We don't sell. We tell.** / **Before you sign, see the doctor.**
- 中文标语候选：**签约之前，先来问诊。** / **我们不卖房，所以敢说真话。**

核心卖点不是"咨询"，而是**独立性**。市场上几乎所有"免费咨询"都来自代理或发展商，顾客心里知道对方有佣金动机。Dr Prop 收诊金、零佣金，这就是顾客愿意付钱的理由，也是品牌所有设计的出发点。

---

## 1. 名字评估

### 1.1 "Dr Prop" 的优点
- 好记、两音节、一听就懂"房产医生"，与"问诊"商业模式完全对应。
- SSM 公司名指南里 `DR. JOHN TRADE SDN. BHD.` 被列为可接受例子，"Dr." 本身不是禁用词。
- 可延伸出完整的隐喻体系：门诊 / 急诊 / 复诊 / 诊断书 / 处方 / 病历。

### 1.2 风险与弱点
- 英文 *prop* 也有"道具、假的"意思，母语者可能联想到 stage prop。影响不大，但字标设计要让 "PROP" 读起来是 property 的缩写（例如在字标下方小字 `PROPERTY CLINIC`）。
- "Dr" 带一点网红/草根感，与低奢调性有张力。解决方法是**写法克制**：全大写、宽字距、细衬线，而不是卡通医生形象。
- 需在 MyIPO 查商标、查 .my/.com 域名、查 SSM 是否已有相似名称后再定案。

### 1.3 建议
**保留 Dr Prop**，字标写作 `DR. PROP`，配中文名。中文名候选：
| 中文名 | 理由 |
|---|---|
| **房医** | 两字、干净、低调，最推荐 |
| 屋诊 | 更口语，粤语/福建语顾客易读 |
| 置业诊所 | 最直白，但偏长、少了高级感 |

备选英文名（如果商标查不到 Dr Prop）：`Second Opinion`（第二意见，精准对应"下定前最后一刻"场景）、`The Property Clinic`、`Prop Clinic`。

### 1.4 禁用视觉元素
不要使用十字标志（红十字/红新月标志受法律保护，且会让人误以为是医疗诊所）。医疗隐喻只用在文案和流程上，不用在符号上。

---

## 2. 合规提醒（上线前必须找律师确认）

> 以下为背景信息，不构成法律意见。开业前请咨询马来西亚律师及/或 BOVAEP。

1. **Act 242（Valuers, Appraisers, Estate Agents and Property Managers Act 1981）**：对"就房地产买卖提供意见"有监管。有资料指出只有持牌 REA 能就土地买卖、产权转移或议价提供意见，而专注尽职调查、市场资讯、可行性分析的"买家咨询"是另一种业务形态。Dr Prop 的服务边界必须设计成后者。
2. **不要使用 "Valuer / Valuation / 估价 / 估值" 这类受保护称谓**。对外一律用"分析 / 诊断 / 评估风险"。
3. **"笋盘"推荐**：如果顾问向会员介绍具体待售单位，可能构成代理行为。建议只分享市场资讯与公开数据，或与一家持牌 REA 合作并完整披露。
4. **零佣金承诺要写进服务条款**。若将来收取律师/银行转介费，必须对顾客披露，否则会摧毁品牌根基。
5. 每份诊断书附免责声明："本诊断为资讯与分析，不构成法律、税务或财务意见，最终决定由客户自行作出。"
6. 最稳妥的做法：团队里至少有一位注册 REA 或注册估价师作为合伙人/顾问，既降低合规风险，也是信任背书。

---

## 3. 收费模型

### 3.1 原方案：每次诊断 = 房产价值 × 0.1%，约 30 分钟

参考数据：马来西亚 2025 全年平均房价约 RM 502,922；超过一半住宅交易低于 RM 300,000。

| 房产价值 | 0.1% 诊金 | 观感 |
|---|---|---|
| RM 250,000 | RM 250 | 对 B40/M40 首购族偏贵，但对比损失可接受 |
| RM 500,000 | RM 500 | 等于每小时 RM 1,000，需要"诊断书"等可带走的成果来支撑 |
| RM 1,500,000 | RM 1,500 | 富人可接受 |
| RM 5,000,000 | RM 5,000 | 30 分钟收 5 千，富人反而会质疑 |

### 3.2 建议调整：分档 + 保底 + 封顶

纯百分比有两个问题：顾客要披露准确房价（富人不愿意、穷人会少报），以及两端价格失真。改为**价格区间分档**，大致维持 0.1% 的精神：

| 区间 | 诊金（建议） |
|---|---|
| ≤ RM 300k | RM 199 |
| RM 300k – 600k | RM 399 |
| RM 600k – 1M | RM 699 |
| RM 1M – 2M | RM 1,199 |
| > RM 2M | RM 1,999（封顶） |

- **急诊**（当天 / 2 小时内视频）：+50%。
- **签约前复诊**（已有诊断记录，下定前 15 分钟快速复核）：半价。
- 每次诊断交付：一份**诊断书**（PDF + 印刷卡片），列出风险点、问题清单、下一步建议。这是顾客"带走的东西"，也是收费合理性的关键。
- 价格必须**公开透明地贴在门口和官网**。这是让预算有限的人敢走进来的最重要设计。

### 3.3 会员（Lounge）

- 建议价：RM 49–69 / 月，或年费 RM 490–690（待定）。
- 权益：门店 Lounge 免费饮品零食、与顾问闲聊、每月市场简报、诊断折扣。
- 成本假设：会员每月来 4 次、每次饮品零食成本 RM 8 → 每月 RM 32。定价低于 RM 49 会很薄。
- **Exclusive 的来源不是价格，而是名额**：每家店会员名额封顶（例如 300 位），额满候补。人人付同样价钱、享受同样待遇，但"进得来"本身就是尊贵感。这样穷人不会被价格挡在门外，富人也不会觉得跟大众挤。
- Lounge 是获客成本，不是主要营收。目标是会员 → 付费诊断的转化。

---

## 4. 品牌体验原则："小钱，至尊待遇"

1. **记住名字与饮品**。第二次到访，前台直接说"陈先生，还是 kopi-o kosong？"系统（App）要支持这一点。
2. **冷毛巾**。马来西亚天气热，进门递一条冰镇毛巾，成本极低，体验极高。
3. **药柜式零食墙**。零食饮品放在木制"药柜"抽屉里，每格贴处方式标签（`Rx · Kopi Tarik`、`Rx · Kuih Seri Muka`）。选本地好品牌（本地精品咖啡、传统糕点），不要放大路货。
4. **诊断书用厚卡纸凸版印刷**，附顾问手写一句话。
5. **没有销售压力承诺**：进门可以只喝咖啡，不会被推销。
6. **私密动线**：富人可预约后从侧门/私人诊室进出，不必在 Lounge 露面。
7. **同一待遇**：前台对 RM 200k 和 RM 5M 的顾客用同样的礼仪、同样的杯子。

---

## 5. 视觉识别系统（Design Tokens）

### 5.1 风格关键词
Quiet luxury / 低奢 · 建筑感 · 纸与石 · 克制 · 温暖而非冰冷 · 诊所的干净 + 私人会所的温度

### 5.2 色彩
| Token | Hex | 用途 |
|---|---|---|
| `--bone` | `#F4F1EA` | 主背景（骨白） |
| `--paper` | `#FBFAF7` | 次级背景、卡片 |
| `--ink` | `#1C1B19` | 主文字（墨色，不用纯黑） |
| `--stone` | `#8A857C` | 次要文字、细线 |
| `--travertine` | `#D9CFBF` | 大面积辅色、分隔区块 |
| `--bronze` | `#8C6A43` | 唯一强调色，全页面使用不超过 3 处 |
| `--night` | `#141412` | 深色模式背景 |
| `--night-text` | `#EDE9E1` | 深色模式文字 |

禁止：紫色/蓝紫渐变、霓虹色、纯黑 `#000`、纯白 `#FFF` 大面积使用、金色闪光。

### 5.3 字体
| 角色 | 拉丁 | 中文 |
|---|---|---|
| 标题 | **Instrument Serif**（Google Fonts, OFL） | **Noto Serif SC** Light/Regular（思源宋体） |
| 正文 | **Geist Sans** 或 **Satoshi**（Fontshare） | **Noto Sans SC** Regular |
| 数字 | Geist Mono（诊金、日期、会员号） | — |

规则：每屏最多 1 个标题字号 + 2 个正文字号。标题大（clamp 48–120px），正文小（15–17px），用对比制造张力，而不是用颜色。

### 5.4 形状与间距
- 圆角：`0` 或 `2px`。建筑感、利落。**不要** 12–24px 大圆角。
- 线条：1px `--stone` 细线做分隔，替代卡片阴影。
- 间距：8pt 网格，区块间距至少 160px（桌面）/ 96px（手机）。
- 按钮：文字 + 下划线，或 1px 描边矩形。唯一实心按钮是主 CTA「预约问诊」。

### 5.5 动效
- 缓动：`cubic-bezier(0.22, 1, 0.36, 1)`；时长 600–1200ms。
- 禁止弹跳（bounce/spring overshoot）、禁止旋转进场、禁止每个元素都 fade-up。
- 动效只服务两件事：**品牌签名动画**（见 5.7）和**状态反馈**。

### 5.6 反 AI 模板清单（Codex 必读）
以下任何一项出现，视为不合格：
- ❌ Hero 大标题 + 副标题 + 两个按钮 + 下方三张功能卡片的套路
- ❌ 玻璃拟态（glassmorphism）卡片网格
- ❌ 紫蓝渐变、发光边框、渐变文字
- ❌ Emoji 或 Lucide/Heroicons 图标堆叠在功能列表前
- ❌ Inter 字体全站
- ❌ `rounded-2xl` + `shadow-lg` 的卡片
- ❌ "Trusted by 10,000+ customers" 假数据
- ❌ 客户评价轮播、FAQ 手风琴、Newsletter 订阅框
- ❌ 聊天机器人浮动按钮
- ✅ 用排版、留白、一条会呼吸的线来建立高级感

### 5.7 品牌签名："The Pulse Roof"（脉搏屋顶）
整个品牌只有一个图形母题：**一条心电图脉搏线，在峰值处折成屋顶轮廓**。

```
──────╱╲──────        ← 心电图的峰
──────╱  ╲─────       ← 同一个峰 = 屋顶
```

- Logo：`DR. PROP` 字标 + 左侧一段脉搏屋顶线（单线、1.5px、无填充）。
- 招牌、名片、诊断书、网站 Hero、App 启动画面都用同一条线，保证一致。
- 网站上这条线是活的：随滚动从平直 → 心跳 → 屋顶 → 天际线。

---

## 6. 门店与招牌

### 6.1 招牌
- **反光槽（halo-lit）背光拉丝古铜字**，安装在石灰华（travertine）或灰泥（limewash）墙面上。光从字后面打到墙上，不用灯箱。
- 字高克制（门面宽度的 1/4 以内）。低奢的核心是"不喊"。
- 门口侧边一块小铜牌：诊金价目（见 3.2）+ 营业时间。**透明价格 = 让所有人敢推门。**
- 橱窗：不要贴满海报。只放一张桌子、一盏灯、一个药柜局部，让路人看到里面安静、有人在喝咖啡。

### 6.2 空间分区（参考 80–120 m² 店铺）
| 区域 | 设计要点 |
|---|---|
| 入口 / 接待 | 不设高柜台。一张实木长桌，前台站在桌旁迎接，递冷毛巾 |
| Lounge（候诊厅） | 低沙发 + 单椅，暖光（2700K），药柜零食墙，一张大桌放当期市场简报 |
| 诊室 × 2–3 | 磨砂玻璃门，圆桌（不是面对面谈判桌），一面墙挂屏幕显示分析 |
| 急诊电话亭 | 1 m² 隔音亭，用于视频急诊 |
| 私人入口（可选） | 预约制，直通诊室 |

### 6.3 材质
石灰华、胡桃木、亚麻布、拉丝古铜、灰泥墙。**不要** 大理石+金色（太"暴发户"）、**不要** 白瓷砖+日光灯（太像真诊所）。

### 6.4 让穷人不排斥、富人不失面子的平衡点
- 门口价格透明 + 橱窗可见内部 → 降低心理门槛
- 本地饮品零食（kopi、kuih）→ 亲切，不装腔
- 材质与安静 → 富人觉得体面
- 名额制会员 + 私人诊室 → exclusive 感

---

## 7. Landing Page 规格（Codex 实现）

### 7.1 技术栈
- **Vite + TypeScript + vanilla three.js**（不用 React，保持首屏轻量）
- **GSAP + ScrollTrigger**（滚动驱动动画）
- **Lenis**（平滑滚动，与 GSAP ticker 同步）
- 多语言：EN / 中文 / BM（简单 JSON 字典，无需 i18n 框架）
- 部署：静态站（Vercel / Netlify / Cloudflare Pages）

### 7.2 页面结构（整页只有 5 个区块）

```
[Header] DR. PROP (左)                     EN 中 BM   预约问诊 (右)

§1 Hero        签约之前，先来问诊。
               独立房产诊断 · 不卖房 · 零佣金
               （背景：流体 + 脉搏线）

§2 三种问诊     门诊 · 急诊 · 签约前复诊
               纯文字排版，大号序号 01 02 03，无卡片

§3 诊金         [ 输入房价 RM ______ ] → 诊金 RM 399
               （全站唯一的交互工具）

§4 Lounge      一张门店照片 + 会员说明 + "本店名额 300 · 余 42"

§5 到访         地址 · 营业时间 · Google Maps 链接（外链，不嵌入）

[Footer] 免责声明 · SSM 号 · 隐私
```

- **全站只有一个 CTA：「预约问诊」**，链接到 WhatsApp（`https://wa.me/60XXXXXXXXX?text=...`）。马来西亚用户最习惯 WhatsApp，摩擦最低。
- 无导航菜单、无 FAQ、无博客、无登录。

### 7.3 WebGL 场景设计

一个全屏 `<canvas>` 固定在背景，三层叠加：

**Layer A — 墨水流体（Ink Fluid）**
- 移植 [PavelDoGreat/WebGL-Fluid-Simulation](https://github.com/PavelDoGreat/WebGL-Fluid-Simulation)（MIT，需保留 LICENSE）。
- 修改点：
  - 调色板锁定为 `--travertine`、`--stone`、`--bronze` 的低饱和版本，在 `--bone` 背景上像**墨水滴进宣纸/牛奶里的咖啡**，而不是原版的彩虹霓虹。
  - `DENSITY_DISSIPATION` 调高（颜色快速淡出），`SPLAT_RADIUS` 调小，关闭 bloom 和 sunrays。
  - 只在鼠标/手指移动时注入颜料；静止 3 秒后画面回归干净。
  - 分辨率：`SIM_RESOLUTION 64`，`DYE_RESOLUTION 512`（手机降为 256）。

**Layer B — 脉搏屋顶线（The Pulse Roof）**
- 用 three.js `Line2` + `LineMaterial`（`three/examples/jsm/lines`）画一条横贯屏幕的线，1.5px，`--ink` 色。
- 顶点数 ~512，在 vertex shader 里根据 `uProgress`（0→1，由 ScrollTrigger 驱动）在四种形态间插值：
  1. `0.00` 平直线（静止的心电图）
  2. `0.25` 规律心跳波形（Hero 区域，每 1.2 秒跳一次）
  3. `0.50` 心跳的峰折成单一屋顶 ⌂
  4. `1.00` 展开成一段抽象天际线（排屋、公寓、独立屋的剪影，**不要**画可辨识的真实建筑）
- 在 §3 诊金计算器，用户输入房价时，线的振幅随数字增加轻微上升，数字停止后回落——"心跳"反馈。

**Layer C — 纸张颗粒（Grain）**
- 全屏后处理 pass，加 3–5% 胶片颗粒噪声，让画面有印刷品的触感，去掉"数码感"。

### 7.4 性能与降级（重要：马来西亚大量用户用中端 Android）
- `renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5))`
- `document.hidden` 时暂停渲染循环
- `prefers-reduced-motion: reduce` → 不加载流体，脉搏线静态显示屋顶形态
- WebGL 不可用 → CSS 背景 `--bone` + SVG 版脉搏线
- 设备内存 < 4GB（`navigator.deviceMemory`）→ 关闭 Layer A
- 目标：移动端 LCP < 2.5s；首屏文字**先于** canvas 渲染（canvas 异步初始化，淡入）
- JS 预算：three.js 按需 import（只引入用到的模块），总 JS gzip < 250KB

### 7.5 文案（中文主稿）

```
§1  签约之前，先来问诊。
    独立房产诊断。不卖房，不抽佣，只站在你这边。

§2  01 门诊    预约 30 分钟，带着你的问题来。
    02 急诊    今天就要决定？两小时内视频问诊。
    03 复诊    下定前最后一刻，15 分钟快速复核。

§3  诊金按房产价值计算，透明、封顶。
    [RM ________]  →  诊金 RM ___
    每次诊断附书面诊断书。

§4  Lounge
    会员随时来坐。咖啡、糕点、最新市场消息，都在这里。
    本店名额 300 位。

§5  Petaling Jaya · 周二至周日 10:00–20:00
```

免责声明（Footer）：`Dr Prop 提供房产资讯与分析服务，不从事房地产买卖、代理或估价，不收取任何交易佣金。诊断内容不构成法律、税务或财务意见。`

### 7.6 参考开源项目
| 项目 | 用途 | 授权 |
|---|---|---|
| [PavelDoGreat/WebGL-Fluid-Simulation](https://github.com/PavelDoGreat/WebGL-Fluid-Simulation) | Layer A 流体核心 | MIT |
| [mrdoob/three.js](https://github.com/mrdoob/three.js) | 渲染引擎、`Line2` | MIT |
| [darkroomengineering/lenis](https://github.com/darkroomengineering/lenis) | 平滑滚动 + WebGL 同步；自动尊重 reduced-motion | MIT |
| [ruucm/shadergradient](https://github.com/ruucm/shadergradient) | 参考其 noise 渐变 shader 做 Lounge 区块的缓慢流动底色（只参考算法，不直接用 React 组件） | 查阅仓库 |
| [JosephASG/codrops-cinematic-scroll-animations](https://github.com/JosephASG/codrops-cinematic-scroll-animations) | GSAP + three.js 滚动驱动镜头的结构参考 | MIT |
| [aqro/gooey-hover-codrops](https://github.com/aqro/gooey-hover-codrops) | §4 门店照片 hover 时的噪声显影效果参考 | Codrops 授权：可用于商业项目，不可原样转售 |
| [codrops/LiquidDistortion](https://github.com/codrops/LiquidDistortion) | 液态扭曲转场的思路参考 | 同上 |
| [oframe/ogl](https://github.com/oframe/ogl) | 若 three.js 太重，可作为轻量替代 | Unlicense |

---

## 8. Mobile App 规格（Codex 实现）

### 8.1 技术栈
- **Expo（React Native）+ Expo Router + TypeScript**
- **@shopify/react-native-skia**：脉搏线动画、会员卡光泽 shader
- **react-native-reanimated**：手势与过渡
- **expo-haptics**：关键操作触感反馈
- **expo-sensors**（Gyroscope）：会员卡光泽随手机倾斜
- 第一阶段：纯前端 + mock 数据；后端（建议 Supabase）第二阶段接入
- 付款（第二阶段）：FPX、Touch 'n Go eWallet、GrabPay、信用卡（经本地支付网关如 Billplz / iPay88 / Stripe MY）

### 8.2 信息架构：只有 3 个 Tab
```
首页  ·  病历  ·  我
```

### 8.3 屏幕规格

**S0 启动画面**
- `--bone` 背景，脉搏线从左画到右（800ms），峰值折成屋顶，`DR. PROP` 字标淡入。

**S1 登录**（首次）
- 只要手机号 + OTP。无密码、无社交登录、无长表单。
- 登录后只问一题：「怎么称呼你？」（陈先生 / Aisyah / Mr. Raj）——之后全 App 都用这个称呼。

**S2 首页**
```
晚安，陈先生。                    ← 按时段问候，Serif 大字

[ 开始问诊 ]                      ← 唯一实心按钮

────────────
Lounge 此刻：安静 · 3 个座位
今日咖啡：Kopi Tarik（Ipoh 豆）   ← 让会员有"想去坐坐"的理由
────────────
你的会员卡  →                      ← 点开 S5
```
没有 banner、没有推荐列表、没有通知红点轰炸。

**S3 问诊流程**（最多 4 步，每步一屏）
1. 类型：门诊 / 急诊 / 复诊（三行大字，点选）
2. 房产：区间选择（沿用 3.2 分档，不要求填准确价格）+ 可选上传 SPA / 宣传册 / 截图
3. 时间：门诊选日期时段；急诊显示"2 小时内顾问会致电"
4. 确认：显示诊金，一键付款 → 成功时 `Haptics.notificationAsync(Success)` + 脉搏线跳一次

**S4 病历（Tab 2）**
- 按时间排列的诊断记录，每条：日期、房产简称、类型、状态
- 点开：诊断书 PDF、顾问笔记、问题清单、「预约复诊」按钮
- 空状态文案：「还没有病历。健康是好事。」

**S5 会员卡（从首页或 Tab 3 进入）**
- 全屏竖向卡片，`--night` 底 + 细线脉搏屋顶 + 会员号（Geist Mono）+ 会员姓名
- Skia shader 做一层**极淡的拉丝金属光泽**，随陀螺仪倾斜移动（强度很低，像真的金属卡在灯下）
- 卡片下方：到店签到 QR code
- 这是整个 App 里"被捧上天"感觉最强的一屏，要做得最精细

**S6 我（Tab 3）**
- 称呼、饮品偏好（前台看得到）、会员状态与续费、语言、登出
- 饮品偏好是关键：顾客在 App 设一次，每次到店前台直接准备好

### 8.4 数据模型（第一阶段 mock）
```ts
type User = { id; phone; displayName; drinkPreference?; language: 'en'|'zh'|'ms' }
type Membership = { userId; storeId; memberNo; status: 'active'|'waitlist'|'expired'; renewsAt }
type Consultation = {
  id; userId; type: 'clinic'|'urgent'|'review';
  priceBand: 'lt300k'|'300k-600k'|'600k-1m'|'1m-2m'|'gt2m';
  fee: number; scheduledAt?; status: 'booked'|'done'|'cancelled';
  reportUrl?; advisorNote?; attachments: string[]
}
type Store = { id; name; address; hours; memberCap; memberCount; loungeSeatsFree; todaysCoffee }
```

### 8.5 App 设计规则
- 沿用第 5 节全部 tokens（色彩、字体、圆角 0–2px、细线分隔）
- 支持深色模式（`--night` / `--night-text`）
- 所有文字可三语切换
- 最小触控区域 44×44pt
- 无底部弹窗广告、无评分弹窗、无推送营销

---

## 9. 营销用 Motion Reels 与 3D 场景

### 9.1 总原则
- **同一套资产，四处使用**：Pulse Roof 线、3D 模型、tokens 在网站、App、Reels 和门店屏幕上共用。3D 模型统一放在 `/brand/3d/*.glb`，不要各做各的。
- **内容策略是"说真话"，不是"卖房"**。Reels 以教育和透明为主（常见陷阱、签约前检查、诊金透明），这直接体现品牌的独立性，也比广告更能建立信任。
- **低奢的节奏**：安静开场、慢镜头、留白。钩子靠一句好问题，不靠大字和音效轰炸。

### 9.2 Reels 系列规划

| # | 系列 | 时长 | 形式 | 目的 |
|---|---|---|---|---|
| R1 | **品牌主片 "The Pulse"** | 7s / 15s | 3D：脉搏线在石灰华台上跳动 → 折成屋顶 → `DR. PROP` 字标 | 品牌识别、所有 Reel 的片尾 |
| R2 | **一分钟病例**（每周） | 30–45s | 3D 白模房子 + 文字排版。例：「SPA 里这一条你看过吗？」「Leasehold 剩几年才算危险？」「Sinking fund 是什么？」 | 教育、建立专业信任 |
| R3 | **签约前 5 件事** | 15–30s | 纯排版 + 脉搏线逐条"跳"出清单 | 对应"复诊"服务，引导下定前来问诊 |
| R4 | **诊金是多少？** | 15s | 房价数字滚动 → 诊金数字跟着变，结尾"价目公开，贴在门口" | 降低心理门槛，吸引预算有限的顾客 |
| R5 | **本月房市心跳**（每月） | 20–30s | 数据驱动：用公开数据（如 NAPIC 房价指数）画成心电图 | 专业形象、可自动化量产 |
| R6 | **Lounge 片刻** | 10–15s | 开业前用 3D 渲染，开业后用实拍：冷毛巾、药柜抽屉、kopi 倒入杯中 | 会员招募、"被珍惜"的感觉 |
| R7 | **开业倒数：门店揭幕** | 20s | 3D 门店数字孪生，镜头从门外推进穿过 Lounge 进入诊室 | 开业前预热 + 会员候补名单 |
| R8 | **会员卡** | 7–10s | 3D 金属卡在灯下缓慢翻转，刻上会员号 | 限额会员发售 |

### 9.3 3D 场景清单

| ID | 场景 | 材质 / 光 | 用途 |
|---|---|---|---|
| 3D-1 | **Pulse Roof 雕塑**：脉搏屋顶线挤出成拉丝古铜实体，立在石灰华台上 | 拉丝古铜、石灰华、柔和侧光、浅景深 | R1、网站 OG 图、App 启动画面静帧 |
| 3D-2 | **白模房子**：通用排屋 / 公寓单位 / 独立屋，全白陶土材质 | 陶土白 + `--bronze` 细线高亮"问题部位"并脉冲闪烁 | R2 病例、R3 清单 |
| 3D-3 | **门店数字孪生**：按真实平面图建模 | 石灰华、胡桃木、亚麻、2700K 暖光 | R7、网站 §4（实拍前替代）、装修前给设计师沟通 |
| 3D-4 | **药柜**：抽屉逐个拉出，露出处方标签 | 胡桃木、黄铜拉手、纸标签 | R6、Lounge 宣传 |
| 3D-5 | **会员卡**：金属卡、刻字会员号 | 深色拉丝金属、单一顶光扫过 | R8、App S5 视觉参考 |
| 3D-6 | **门店屏幕环境片**：3D-1 慢速循环 + 当月市场心跳 | 同上 | Lounge 屏幕无声循环播放 |

白模房子**一律通用造型**，不做可辨识的真实楼盘，避免被认为在评价特定发展商或推荐特定项目。

### 9.4 制作管线

**管线 A｜程序化量产（Codex 主要实现）**
- **Remotion + `@remotion/three`**：用 React 写视频，`<ThreeCanvas />` 内可直接用 React Three Fiber，动画由帧号驱动，可渲染成 MP4。
- 适合 R1–R5、R8：模板化、数据驱动、三语批量输出（改 JSON 就出新一集）。
- ⚠️ 授权：Remotion 是 source-available 而非开源。个人及 3 人以内公司免费（含商用），4 人以上需购买 Company License。团队扩大后要付费。
- 纯 2D 排版类（R3、R4）如想完全开源，可用 **Motion Canvas**（MIT），但它只做 2D 矢量，3D 场景仍需管线 A 或 B。

**管线 B｜精修大片**
- **Blender**（开源；渲染出来的作品可商用）+ Cycles 渲染，用于 R6、R7 和 3D-3 门店孪生这类需要真实光影的画面。
- Codex 可以写 **Blender Python（bpy）脚本**，按门店尺寸程序化生成基础模型（墙、家具块体、药柜），然后由 3D 设计师精修材质和灯光。
- 从 Blender 导出 `.glb` → 放入 `/brand/3d/`，供网站与管线 A 复用。

### 9.5 输出规格

| 用途 | 尺寸 | 帧率 | 备注 |
|---|---|---|---|
| IG Reels / TikTok / 小红书 / FB / YT Shorts | 1080×1920（9:16） | 30fps（3D 慢镜可 60fps） | 主格式 |
| IG / FB 动态 | 1080×1350（4:5） | 30fps | 由 9:16 重新构图，不是直接裁切 |
| 门店屏幕 / YouTube | 1920×1080（16:9） | 30fps | 3D-6 环境片 |

- 编码：H.264 MP4，AAC 音频，母带响度约 -14 LUFS。
- **安全区**（按 Meta 较保守的标准）：顶部 14%（约 270px）、底部 35%（约 670px）不放字；右下方约 230px 宽的区域有点赞/分享按钮；左右各留约 65px。实际可用中心区约 950×980px。**所有字幕、Logo、诊金数字都放在这个区域内。**
- Remotion 里做一个 `showSafeZone` 调试开关，叠加半透明遮罩检查。
- 三语**分开渲染**（EN / 中文 / BM 各一个文件），不要在同一画面叠三种字幕。

### 9.6 Reels 视觉与声音规则
- 字幕：`Noto Serif SC` / `Instrument Serif`，静态出现、淡入淡出，**不要**逐字弹跳、不要黄色描边大字、不要 emoji 贴纸。
- 转场：只用淡入淡出和镜头推移，**不要** whoosh 甩镜、闪白、故障特效。
- 色彩：沿用第 5.2 节 tokens，3D 场景背景用 `--bone` 或 `--night`。
- **声音 Logo**：一声柔和心跳 + 一记木质敲击（或单个钢琴音），出现在每支 Reel 片尾 R1 的位置。委托音效师制作并买断版权。
- 背景音乐：用商用授权曲库，或委托原创。品牌/商业账号通常不能随意使用热门流行歌，要用平台的商用曲库。
- 不用 AI 配音的"激动推销腔"。如需旁白，用顾问本人的平静声音。
- 不用素材库里的握手、钥匙交接、西装笑脸画面。

### 9.7 内容合规
- **病例一律匿名化**，遵守 PDPA 2010。真实顾客出镜需书面同意。
- 不点名批评特定发展商或楼盘（诽谤风险），也不在 Reels 里推荐具体单位（Act 242 风险，见第 2 节）。
- 市场数据注明来源（如 NAPIC）和日期。
- 每支教育类 Reel 结尾小字："一般资讯，非个人建议。"

### 9.8 Codex 实现规格（`/reels` 目录）

```
/reels
  remotion.config.ts            # setChromiumOpenGlRenderer('angle')
  src/
    tokens.ts                   # 从 /brand 引入
    components/
      PulseLine.tsx             # 2D 版脉搏线（SVG path，按帧插值 flat→beat→roof→skyline）
      PulseRoof3D.tsx           # 3D-1，R3F，古铜材质
      ClayHouse.tsx             # 3D-2，程序化白模（props: type = terrace|condo|bungalow, highlight = roof|title|facade|...）
      Apothecary.tsx            # 3D-4，程序化药柜
      MemberCard3D.tsx          # 3D-5
      SafeZoneOverlay.tsx
      Caption.tsx               # 三语字幕组件
    compositions/
      BrandPulse.tsx            # R1
      CaseOfWeek.tsx            # R2，props: { lang, hook, lines[], houseType, highlight }
      BeforeYouSign.tsx         # R3
      FeeReveal.tsx             # R4，沿用第 3.2 节分档
      MarketPulse.tsx           # R5，props: { lang, series: {label, value}[], source, date }
      LoungeMoment.tsx          # R6（渲染版）
      StoreReveal.tsx           # R7，加载 /brand/3d/store.glb，缺失时用程序化占位
      MemberCardReveal.tsx      # R8
    data/
      cases/*.json              # 每集病例文案（三语）
      market/*.json             # 每月数据
  scripts/
    render-all.ts               # 输出 /out/{composition}-{lang}-{ratio}.mp4
/blender
  build_store.py                # bpy：按尺寸生成门店基础模型并导出 store.glb
  build_apothecary.py
```

验收标准：
- `npm run render:all` 一次输出全部 Reels 的三语、三比例版本
- 新增一集病例只需新增一个 JSON 文件
- 所有文字在安全区内（开启 `showSafeZone` 检查）
- 3D 模型缺失时有程序化占位，渲染不中断
- 对照第 5.6 节与 9.6 节，零模板化违规

---

## 10. 执行顺序（给 Codex）

1. 建立 `/brand` 目录：tokens（CSS variables + TS 常量）、字体加载、Pulse Roof SVG 路径（logo 用）
2. Landing page 静态版（无 WebGL）：排版、三语、响应式、WhatsApp CTA、诊金计算器
3. 加入 Layer B 脉搏线 + ScrollTrigger + Lenis
4. 加入 Layer A 流体（移植并改色）+ Layer C 颗粒
5. 性能降级逻辑 + Lighthouse 移动端测试
6. Expo App 骨架：3 Tab + 路由 + tokens
7. S0 启动动画、S2 首页、S3 问诊流程（mock）
8. S5 会员卡（Skia + 陀螺仪）
9. S4 病历、S6 我
10. `/brand/3d`：程序化生成 3D-1、3D-2、3D-4、3D-5 的 glb（或 R3F 组件），网站与 Reels 共用
11. `/reels` Remotion 项目：先做 R1 品牌主片与 `SafeZoneOverlay`，再做 R2、R4、R5 模板
12. `/blender` bpy 脚本：门店基础模型 → 导出 `store.glb` → 接入 R7 与网站 §4
13. `render-all` 批量渲染脚本（三语 × 三比例）
14. 交付：README（本地运行、部署、替换 WhatsApp 号码与门店资料的位置、如何新增一集 Reel）

### 验收标准
- 对照 5.6 反模板清单逐项检查，零违规
- 中端 Android（例如 4GB RAM 机型）上 landing page 滚动流畅、无掉帧卡顿
- 关闭 WebGL 时页面仍完整可用、仍好看
- App 从打开到完成一次问诊预约 ≤ 4 屏

---

## 11. 待创办人决定的事项
- [ ] 最终品牌名与中文名（完成 MyIPO / SSM / 域名查询）
- [ ] 律师确认 Act 242 服务边界；是否引入注册 REA / 估价师合伙人
- [ ] 诊金分档最终数字、急诊加价比例
- [ ] 会员月费与每店名额
- [ ] 首店地址与营业时间
- [ ] WhatsApp Business 号码
- [ ] 门店照片（开业前可先用空间渲染图）
- [ ] 门店平面图与尺寸（用于 3D 门店数字孪生）
- [ ] 团队人数是否超过 3 人（决定 Remotion 是否需付费授权）
- [ ] 声音 Logo 与背景音乐的委托制作
- [ ] 社媒平台优先级（IG / TikTok / 小红书 / FB）

---

### 资料来源
- SSM Guidelines on Company Names（含 "DR." 可接受例子）：https://www.ssm.com.my/Pages/Legal_Framework/Document/GARIS%20PANDUAN%20NAMA%20SYARIKAT%20(BI)_140726.pdf
- Act 242 与买家咨询业务边界：https://emerhub.com/malaysia/real-estate-agency-setup-malaysia/
- BOVAEP 收费表：https://lpeph.gov.my/fees
- 马来西亚 2025 平均房价：https://www.vyrox.com/analysis/ai_impacted_residences_property_market
- 2025 上半年住宅交易结构：https://www.myrumahbaru.com/blog/napic-1h-2025-report-malaysia-s-property-market-at-a-crossroads
- Remotion 授权：https://www.remotion.dev/docs/license-pricing-compliance/faq
- `@remotion/three`：https://remotion.dev/docs/three
- Motion Canvas（MIT）：https://github.com/motion-canvas/motion-canvas
- Meta Reels 安全区换算：https://www.hopperhq.com/blog/instagram-reel-size/
