# 模块划分与依赖组织

> 规则写在文档里没人守，三个月后必然失效。本仓已经踩过一次：14 个判据模块
> 从 `pages/Bazi.tsx` 导入 `PillarData`，直到做启动优化时才发现判据层反向依赖页面。
> 所以下面每一条边界都有一条会红的测试（`src/__tests__/architecture.test.ts`），
> 改结构时先看它，不要靠自觉。

## 一、分层

```
types/      纯类型，零依赖
  ↑
data/       静态数据（卦辞、签文、古籍、名词表），只允许依赖 types
  ↑
utils/      判据层：所有"算出结论"的地方。纯函数为主，不碰 DOM、不碰组件
  ↑
components/ 排版层：只把判据结果排成界面，不产出判据文案
  ↑
pages/      页面：组织交互与状态，调用判据层，交给排版层
```

横切（允许被上面各层使用，自己不许反向依赖 pages）：

| 目录 | 职责 | 备注 |
|---|---|---|
| `context/` | 用户档案、登录态、全局 Toast | 首屏依赖，禁止静态引重库（见下） |
| `hooks/` | 视口、每日配额等 React 胶水 | 无业务判据 |
| `lib/` | 外部服务（supabase、支付） | 只做 IO，不含命理判据 |
| `vendor/` | 厂内化的第三方副本 | 升级时必须重做等价性验证 |

## 二、四条硬边界（有测试）

1. **`utils/` 不得依赖 `pages/` 与 `components/`。**
   判据层要能脱离 React 单独跑（现在的一致性扫描、标定脚本都靠这一点）。
   **没有例外**。`utils/renderWithTerms.tsx` 曾经是唯一开口的那个（它产出 ReactNode、
   依赖 `TermPopover`，本质属渲染层），2026-11-23 已整体迁到 `components/renderWithTerms.tsx`，
   豁免一并删掉——留个空数组等于给下次开口子留后门。

2. **`data/` 不得依赖任何上层。** 数据是死的，不能反过来 import 判据。

3. **`components/` 不得依赖 `pages/`。** 组件要能被任意页面复用。

4. **首屏静态闭包只允许 `pages/Home.tsx` 一个页面。**
   测试从 `main.tsx` 顺着**静态** import 走图，其余页面必须 `React.lazy`。
   `Home` 是落地页，lazy 会白屏，故唯一例外。

## 三、首屏预算

首屏 = `index.html` 实际预加载的那几个 chunk。当前基线（gzip，**本地与线上逐字节一致**，
2026-11-23 实测）：

| 项 | gzip 字节 | ≈KB(1000) | ≈KiB(1024) |
|---|---|---|---|
| `index-*.js`（业务 + 首屏用到的 antd + supabase） | 217,436 | 217 | 212 |
| `react-vendor`（react/router/framer-motion） | 94,515 | 95 | 92 |
| `index-*.css` | 5,150 | 5 | 5 |
| **合计** | **317,101** | **317** | **310** |

> 之前这里写「~315 KB」而 react-vendor 记 92——那个 92 是 KiB、217 是 KB，两种单位混在一张表里。
> 报体积前先 `gzip -c` 数一遍字节，别照抄。**用 `gzip -9` 或 Node 的 `zlib.gzipSync`
> 会得到小几百到 1 KB 的差**，不是代码变了，是压缩级别变了——换度量方法就别拿旧基线比。
> 最近一次变化：结论卡按虚岁分档、去掉「往上走」，文案净增 129 B；之后清掉 59 处死代码，只 +2 B（那些代码本来就被 tree-shake 掉了）。

历史：728 KB（index 104 + antd 299 + calendar 234 + react 92 + css 5）→ 317 KB。

### ⚠️ 环境变量必须本地与线上同源，否则「首屏体积」和「功能」都会悄悄不同

`.env` 被 `.gitignore` 忽略。曾经因此出过一次事故：CI 检出时没有
`VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`，而 `lib/supabase.ts` 写的是

```ts
export const supabase = url && key ? createClient(url, key) : null;
```

构建期这两个值是 `undefined` → 条件恒假 → `createClient` 连同 **supabase-js 整包被
tree-shake 掉**。结果是：

- 线上 entry 502 KB、本地 738 KB，差 236 KB——看起来像"优化成果"，其实是功能没了；
- 线上 `supabase === null`，**登录与云同步一直跑在本地降级模式**，且不报任何错。

修法是把**公开**变量放进会被提交的 `.env.production`（anon key 本来就会打进浏览器包）；
`service_role` 只留在本地 `.env.local`，永不进仓库。
`docs/architecture.md` 里的首屏数字因此才可能本地、线上一致。

### 为什么这些包必须在首屏之外

| 包 | 单包 gzip | 何时才需要 |
|---|---|---|
| `antd`（整包） | ~300 KB | 不要整包进首屏，见下方"manualChunks 的坑" |
| `lunar-typescript` | ~104 KB | 首页只要一行"农历X月X日"；排盘页才全量用 |
| `cn-division` | ~54 KB | 只在保存出生地、选行政区划时 |
| `tyme4ts` | ~70 KB | 排盘内核 |
| `iching-shifa`（剥离版） | ~223 KB | 只在六爻页 |

### ⚠️ manualChunks 的坑

**对象式 `manualChunks: { 'antd-vendor': ['antd'] }` 会把 antd 的整个模块图塞进一个
chunk**，不管它有没有被首屏引用。而这个 chunk 被首屏静态依赖 → 只有懒加载页面才用的
组件（Table/DatePicker/Upload…）全被提前到首屏。

现在用函数式，只锁 `react` 一层，其余交给 rollup 按引用关系拆：首屏只背实际用到的部分。
实测这一项就把首屏从 489 KB 压到 340 KB。

### ⚠️ `lazy()` 不等于不加载

`<X open={false} />` 仍然会被渲染，chunk 照样在首屏请求。要让某个组件彻底离开首屏，
必须「首次打开才挂载」：

```tsx
{mounted && <Suspense fallback={null}><X open={open} /></Suspense>}
```

`ProfileDrawer` / `UserModal` 原本就是这么处理的（它们内部引了 `cn-division`）。
**后来查清这两块 UI 根本打不开**（Layout 里没有任何入口置 `open=true`），
功能已由 `pages/Profile.tsx` 覆盖，于是连组件一起删了——首屏再省 17.4 KB
（`Layout` 为它们调的 `Form.useForm()` 把 antd Form 与 rc-field-form 也钉在了首屏）。

## 四、判据的唯一出口

同一个判据有第二份实现，就是两份口径，迟早分叉。现行出口清单：

| 判据 | 唯一出口 |
|---|---|
| 四柱 | `utils/personChart.buildRawChart` |
| 五行/十神关系 | `utils/wuXingRelations` |
| 地支冲合刑害 | `utils/diZhiRelations` |
| 忌神 | `PersonChart.jiShen`（`deriveJiShen` 只是兜底，不认从格） |
| 从格 | `utils/congGe` |
| 官杀混杂 | `utils/guanShaHunZa` |
| 五行→脏腑/养生 | `utils/wuxingHealth` |
| 六亲星 | `utils/kinStars` |
| 太岁干支 | `liunianReading.ganZhiOfYear` |
| 当前大运 | `personChart.currentDayunOf` |
| 六爻/梅花/灵签/大六壬 | `divinationCore` + 各自的 `*Reading` |
| 命盘旁参（展示层） | `utils/mingPanAside` |

页面里出现第二份判据即视为 bug——它会静默偏离，而且**不报错**。

## 五、文案与判据的分界

- 判据层产出**结构化结论**（含 score / level / 依据），文案可以在这里组装。
- 页面组件**只排版**：不做 `if (score > x)` 这种二次判断，也不写解读句子。
- 神煞是**修饰**不是主判：领域解读里神煞段必须排在该领域末段、`role: 'modifier'`、
  标题带「不单独定吉凶」，页面默认折叠。出口兜底在 `baziDomainDeep.normalizeSections`。

## 六、构建必须可复现（本地产物 = 线上产物，逐字节）

排查「线上和本地不一样」时，唯一可信的判据是**逐字节比对**——因为一次坏的 base
就能让 43 个 chunk 的 hash 集体变化，靠肉眼看体积、看 hash「差不多」是排不出来的。
所以这条链路上的每个不确定性都必须压掉，压到 `diff -r` 无输出为止。

### 验收命令（改完构建配置后必跑）

```bash
# 1) 本机构建（务必用脚本，别手敲 vite，原因见下）
npm run build:gh

# 2) 拉一份线上镜像，逐个 cmp
for f in $(find dist -type f | sed 's|^dist/||'); do
  mkdir -p "/tmp/mirror/$(dirname "$f")"
  curl -sfL -o "/tmp/mirror/$f" "https://yueyangdong.github.io/yaoyiyao/$f"
  cmp -s "dist/$f" "/tmp/mirror/$f" || echo "不同: $f"
done
```

期望输出：**只有 `不同: sw.js` 且仅当上次部署还没带 `sort-sw` 那一步**。其余任何一行都是真问题。
（2026-11-23 实测：84 个文件全部一致，0 缺失。）

### 三个必须压掉的不确定性

**1. 依赖装的是 lock 里的版本，不是 `package.json` 的浮动范围**

`npm ci` 按 lock 装；日常 `npm install` 会把 `^` 拉满。两者不一致时，**本地构建产物
和 CI 产物不是同一份代码的产物**。2026-11-23 实测漂移 182 个顶层/传递包
（supabase-js 2.119.0 vs lock 2.110.2、Babel 全家、@ant-design/icons-svg…），
光是把 supabase-js 对齐就消掉 14.5 KB 体积差。

> 本机 `npm ci` 会被安全守卫拦（要删 `node_modules/.bin` 下的 161 项）。绕法是先把
> `node_modules` 整个移开再 `npm ci`：目录不存在，它就没有要删的东西。
> 对齐后的自检（应输出 `非可选包漂移 0`）：

```bash
node -e "const fs=require('fs');const lock=JSON.parse(fs.readFileSync('package-lock.json','utf8'));let bad=[];for(const [k,v] of Object.entries(lock.packages)){if(!k.startsWith('node_modules/')||v.version===undefined||v.optional)continue;let iv=null;try{iv=JSON.parse(fs.readFileSync(k+'/package.json','utf8')).version}catch(e){}if(v.version!==iv)bad.push(k)}console.log('非可选包漂移',bad.length)"
```

剩下的「缺失」只应该是别的平台的 `@esbuild/*` 二进制、`@rollup/rollup-*` 这类可选包——正常。

**2. 行尾：`.gitattributes` 强制 LF，且是**检出时**转**

`core.autocrlf=true`（Windows 默认）会把检出文件改成 CRLF。绝大多数源码无所谓（编译后
不体现），但 `public/` 下的文件是**原样拷进 dist** 的，`index.html` 也是直接被 PWA 算 md5：

| 文件 | CRLF 时 | LF 时 |
|---|---|---|
| `index.html` | 2754 B（58 处 CRLF） | 2696 B |
| `public/yao-sync.js` | 4283 B（148 处） | 4135 B |
| 后果 | sw.js 里两条 revision 都对不上（`c23b528a…` / `1064b01a…`） | 与线上一致（`c58389f1…` / `7ab1f167…`） |

`.gitattributes` 只在**下次检出**时生效。已有的工作区要重新检出一次：

```bash
git rm -q --cached -r . && git reset --hard     # 会丢弃未提交改动，先备份
```

**3. `sw.js` 的 precache 顺序：`scripts/sort-sw.mjs`**

workbox 扫 dist 用的是文件系统 `readdir` 顺序，Linux（CI）与 Windows（本机）不同。
实测两边都是 82 条、80 个唯一 URL、revision 逐条相同，只有排列不同 → sw.js 字节不同。
功能无影响（precache 是待抓取 URL 列表），但它会污染逐字节比对。
`npm run build:*` 在 `vite build` 之后串了这个脚本，按 URL 代码点排序。

> 为什么不写在 `vite.config.ts` 的 `closeBundle` 里：vite-plugin-pwa 把 sw.js 的生成放在
> **它自己注入的末端插件**里，配置里的 `closeBundle` 一定会先执行——实测那一刻
> `dist/sw.js` 还不存在，于是静默什么都不做。

### ⚠️ 不要在 Windows 的 Git Bash 里给 vite 传 `--base=/…`

MSYS2 会把**以 `/` 开头的命令行参数**当成 POSIX 路径自动改写。`npx vite build --base=/yaoyiyao/`
到 vite 手里会变成 `/workbuddy/resources/vendor/PortableGit/yaoyiyao/`
（标准安装下是 `C:/Program Files/Git/yaoyiyao/`）。后果：

- `index.html` 里**每一条**资源引用、`import.meta.env.BASE_URL`、PWA manifest 全部指向不存在的位置；
- 所有 chunk 的名字集体变化（43/69 个 hash 不同），线上图片 404；
- 构建过程**一句错都不报**。

CI 在 Linux 上、`npm run` 在 Windows 上走 cmd.exe，都不触发；只有「在本机用 Git Bash
直接敲 vite」才会踩——而那恰好是排查线上问题时最常做的事。

`vite.config.ts` 里的 `assertBuildBase()` 把这条堵成了构建失败：base 只允许
`/yaoyiyao/`、`/`、`./` 三种，其余直接抛错。真要在 Git Bash 里传，加 `MSYS_NO_PATHCONV=1`。
`build:gh` 里那个冗余的 `--base=/yaoyiyao/` 已经删掉（`base` 的默认值本来就是它）。

