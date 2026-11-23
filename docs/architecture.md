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
   *已知例外*：`utils/renderWithTerms.tsx` 是「把术语渲染成 ReactNode」的黏合层，
   本质属渲染层，但被判据层多处调用；它迁出去之前先豁免，不要新增第二例。

2. **`data/` 不得依赖任何上层。** 数据是死的，不能反过来 import 判据。

3. **`components/` 不得依赖 `pages/`。** 组件要能被任意页面复用。

4. **首屏静态闭包只允许 `pages/Home.tsx` 一个页面。**
   测试从 `main.tsx` 顺着**静态** import 走图，其余页面必须 `React.lazy`。
   `Home` 是落地页，lazy 会白屏，故唯一例外。

## 三、首屏预算

首屏 = `index.html` 实际预加载的那几个 chunk。当前基线（gzip）：

| 项 | 体积 |
|---|---|
| `index-*.js`（业务 + 首屏用到的 antd） | ~240 KB |
| `react-vendor`（react/router/framer-motion） | ~94 KB |
| `index-*.css` | ~5 KB |
| **合计** | **~340 KB** |

历史：728 KB（index 104 + antd 299 + calendar 234 + react 92 + css 5）→ 340 KB。

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

`ProfileDrawer` / `UserModal` 就是这么处理的（它们内部引了 `cn-division`）。

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
