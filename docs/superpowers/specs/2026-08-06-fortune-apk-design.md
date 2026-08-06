# 「爻一爻」APK 化改造设计文档

- 日期：2026-08-06
- 状态：已获用户确认（2026-08-06）
- 目标产物：可安装到 Android 手机的 debug APK（包名 `com.yaoyiyao.app`，应用名「爻一爻」）

## 背景

项目已是一个功能完备的命理应用（React 18 + Vite 5 + TypeScript + antd 5 + Capacitor 8），包含：八字、紫微斗数、六爻、梅花易数、观音灵签、关帝灵签、诸葛神算、每日运势、周公解梦、风水、纳音、古籍等模块，Supabase 云端登录已配置，Android 工程目录已生成。

用户诉求（已确认）：

1. 命理解读通俗化（重点）：像「测测」那样，专业但不晦涩，结论先行、大白话讲解
2. 界面美化：更精致的视觉层级与移动端体验
3. 性能与体验优化：首屏更快、启动更顺
4. 登录改为「本地保存数据 + 保留联网能力」，不强制登录
5. 最终打包 debug APK 安装到手机

## 环境现状

- Android SDK 已安装于 `%LOCALAPPDATA%\Android\Sdk`（含 build-tools、platforms 36、platform-tools）
- JDK 未安装 → 需安装 JDK 17（Capacitor 8 / AGP 8.x 要求）
- Gradle wrapper 已存在（android/gradlew.bat）
- 工作区存在未提交改动（MobileBottomNav、CollapsibleCard、首页/八字/紫微等页面改动、wechat-miniapp 雏形），全部保留

## 第 1 节｜解读通俗化（核心）

### 1a. 「一句话结论」卡片（PlainConclusionCard 组件）

新增 `src/components/PlainConclusionCard.tsx`：通用结论卡（渐变底、大号结论字、分级图标）。

各页面接入点：

- **八字页**（src/pages/Bazi.tsx）：在排盘结果顶部新增 `BaziPlainConclusion`——基于现有分析结果（日主五行、强弱 level、用神、五行统计、大运要点）规则化拼装 2-3 句大白话总评。示例风格：
  > "你是庚金命，生在秋天，金气最旺——天生刚毅果断，像刀剑一样有锋芒。但命里火弱，做事容易急躁缺耐心。用神为火：多晒太阳、穿红橙色、往南方发展，对你最有助力。"
- **紫微页**（src/pages/Ziwei.tsx）：基于 `ziweiAnalysis` 现有总评 + 命宫主星，顶部生成「一句话命盘结论」
- **六爻页**（src/pages/Liuyao.tsx）：起卦解出后，顶部加「白话断卦」卡（结论先行：吉/凶/平 + 一句人话 + 建议）
- **每日运势**（src/pages/DailyFortune.tsx）：在结果顶部加结论式一句话开头

规则模板集中放在 `src/utils/plainConclusion.ts`，用现有分析数据驱动，**不修改核心算法**。

### 1b. 术语词典 + 高亮弹层

- 新增 `src/utils/termDictionary.ts`：60-100 条高频术语（身强/身弱/用神/喜用神/忌神/十神/正官/七杀/正财/偏财/食神/伤官/比肩/劫财/印星/桃花/驿马/文昌/贵人/羊刃/空亡/纳音/大运/流年/四柱/日主/月令/格局/命宫/身宫/三方四正/四化/禄权科忌…），每条 = 术语名 + 一句话人话解释 + 可选生活化类比
- 新增 `src/components/TermPopover.tsx`：识别文本中的术语，渲染为点线底 + 小问号的标签，点击弹出「人话解释」气泡（antd Popover）
- 渲染时对结论卡与主要解读区文本做术语匹配（词典按长度降序匹配、缓存结果避免重复计算）
- 词典数据驱动，后续可扩充

### 1c. 现有文案润色（克制范围）

只改展示文案模板、不动算法逻辑：

- 八字：十神解释、日主强弱结论段（Bazi.tsx 内既有白话解释微调为结论先行）
- 紫微：总评段开头一句话说重点
- 六爻：卦象解读开头加一句人话结论

## 第 2 节｜界面美化

- 设计令牌：在 `src/index.css` 用 CSS 变量统一品牌色（暖金 #B8860B 系 + 朱砂红点缀 + 米色底 #F7F5F0）、圆角、阴影
- 首页：模块卡片化（图标 + 一句话简介 + 渐变角标），复用现有 Home.tsx 结构调整
- 结论卡片：渐变底、大号结论字、等级图标（吉/凶/平）
- 术语标签样式：虚线底 + 问号
- 轻量动效：页面淡入 + 卡片浮起（framer-motion 已依赖，复用）
- 移动端优先（复用 MobileBottomNav，已存在于工作区未提交改动中）

## 第 3 节｜性能与体验优化

- 确认路由级懒加载完整（vite 已按页分包，构建产物 dist/assets 可见各页面独立 chunk）
- antd 组件按需引入（检查现有 import 方式，vite 下 antd 默认按需 tree-shake，需确认无全量引入）
- 检查并移除/懒加载未使用的重依赖：three.js / @react-three/*（Dream 3D 场景）、@tsparticles、canvas-confetti 的使用点
- 首屏骨架屏（Skeleton 组件已存在，接入路由级 Suspense fallback）
- PWA 缓存保留（sw.js / workbox 已配置）
- 目标：首屏 JS 明显下降，冷启动更顺

## 第 4 节｜登录改造：本地优先 + 保留联网

- `src/context/UserContext.tsx`：新增本地模式——游客可直接使用全部功能；用户档案、排盘历史存 localStorage（容量足够时升级 IndexedDB）
- Supabase 登录（AuthContext / src/pages/Auth.tsx / src/lib/supabase.ts）保留代码与联网能力，但**不再设强制门槛**：入口改为「可选云同步」
- 联网功能保留：Supabase 可选同步、天气 API（weatherApi.ts 已存在）
- 未登录用户不再被拦截跳转登录页

## 第 5 节｜APK 打包交付

1. 安装 JDK 17（本机缺失，使用 winget 或便携版安装，配置 JAVA_HOME）
2. `npm run build`（tsc + vite build）
3. `npx cap sync android`
4. `cd android && ./gradlew assembleDebug`
5. 产出 `android/app/build/outputs/apk/debug/app-debug.apk`，复制到项目根目录 `爻一爻-debug.apk`
6. 附手机安装说明（开启「允许未知来源」）

## 验收标准

- 八字/紫微/六爻/每日运势页面出现「一句话结论」卡片，内容与专业分析一致、读起来是大白话
- 术语高亮弹层可用，词典 ≥ 60 条
- 游客无需登录即可使用全部功能；登录入口保留为可选
- 界面主题统一、移动端布局无错乱
- `爻一爻-debug.apk` 生成成功，可安装到 Android 手机
