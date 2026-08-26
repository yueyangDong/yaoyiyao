# 全国县区级定位设计文档

> **日期：** 2026-08-26
> **状态：** 已确认（用户批准）

## 1. 背景与目标

当前 `reverseGeocode(lat, lng)`（`src/utils/weatherApi.ts`）仅内置 **23 个主要城市**的近似坐标（曼哈顿距离 + 3 度阈值），县区级完全缺失，多数位置返回「未知」。

**目标：** 将定位反查提升到**全国县区级**——任意国内坐标可匹配到具体区县（约 2933 个），显示为「市·区县」格式。

**非目标：**
- 不做街道级定位（需地图 SDK + API key，超出本次范围）
- 不引入运行时网络依赖（数据内置，离线可用）
- 不改动 `getPositionNative()` 定位链路与天气 API（仍用 GPS 原始 WGS-84 坐标）
- 不改动 `getCityLng()` 真太阳时校正（出生地选择路径，与定位无关）

## 2. 数据来源与生成

**数据源：** 阿里云 DataV.GeoAtlas 行政区划接口（免费、无需 key、民政部区划代码）

- 省级列表：`https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json`
- 省级详情：`https://geo.datav.aliyun.com/areas_v3/bound/{adcode}_full.json`（adcode 如 `110000`），返回该省全部区县 GeoJSON，每个 feature 的 `properties` 含 `adcode / name / center: [lng, lat] / level`

**生成脚本：** `scripts/generate-county-geo.ts`（与既有 `generate-city-lng.ts` 并列）

1. 拉取 `100000_full.json` 获取 34 个省级 adcode 列表
2. 逐个拉取 `{adcode}_full.json`，收集 `level === 'district'` 的条目
3. 对齐 cn-division 区划层级（`node_modules/cn-division/dist/code/pca.json`），保证键名「省,市,区县」与现有 `cityLng.ts` / 表单 Cascader 命名一致
4. 输出 `src/data/countyGeo.ts`：

```ts
// 中国区县级中心坐标库（GCJ-02，自动生成）
// 键：'省,市,区县'；值：[经度, 纬度]
export const COUNTY_GEO: Record<string, [number, number]> = {
  '北京市,北京市,东城区': [116.418757, 39.917544],
  // ...约 2933 条
};
```

**体积：** 约 100-150KB TS 源文件（2933 条 × 中文键名 + 坐标），gzip 后更小，可接受。

**坐标系说明：** DataV 为 GCJ-02（火星坐标），GPS 为 WGS-84，偏差约数百米，远小于区县尺度（数十公里），对县区级判定无影响，**不做坐标转换**。

## 3. 运行时反查（`src/utils/weatherApi.ts`）

### 3.1 `reverseGeocode(lat, lng): Promise<string>`

- 删除现有 23 城市硬编码表与曼哈顿距离逻辑
- 对 `COUNTY_GEO` 全部条目计算 **Haversine 距离**，取最近邻（2933 次循环，微秒级）
- **距离阈值 30km**：最近邻距离超过阈值返回 `'未知'`（海外/极端情况防误配；国内所有区县中心 30km 覆盖绝大多数人口区）
- 返回键名格式 `'省,市,区县'`（如 `'河北省,石家庄市,正定县'`）

### 3.2 `formatCountyName(key: string): string`

- 输入 `'省,市,区县'`，输出紧凑显示名：`市名(去后缀) · 区县名(去后缀)`
- 示例：`'河北省,石家庄市,正定县'` → `'石家庄·正定'`；`'北京市,北京市,朝阳区'` → `'北京·朝阳'`；`'江苏省,苏州市,昆山市'` → `'苏州·昆山'`
- 后缀清理规则：市名去掉 `市/自治州/地区/盟` 结尾；区县名去掉 `市辖区/市/县/区/自治县/旗/自治旗` 结尾；清理后为空则保留原名

### 3.3 清理死代码

- `getUserPosition()` 中未使用的 `geoUrl` 变量（open-meteo 不支持反向，注释已说明）删除

## 4. UI 接入（`src/pages/DailyFortune.tsx`）

- 定位成功消息：`已定位到 ${formatCountyName(pos.city)}`（`pos.city` 为 `'省,市,区县'`）
- 页面城市显示（第 181 行 `{city}`）：`city` 状态存 `formatCountyName` 的结果（如 `'石家庄·正定'`）
- 天气数据仍用精确 GPS 坐标请求 open-meteo，不受影响

## 5. 测试（`src/utils/__tests__/reverseGeocode.test.ts`）

| 用例 | 输入 | 期望 |
|---|---|---|
| 北京天安门 | (39.9087, 116.3975) | 返回含 `'东城区'` 或 `'西城区'`（交界，以最近中心为准，实现时以实际数据断言） |
| 上海外滩 | (31.2400, 121.4900) | 返回含 `'黄浦区'` |
| 成都天府广场 | (30.6575, 104.0661) | 返回含 `'青羊区'` 或 `'锦江区'` |
| 海外坐标 | (40.7128, -74.0060)（纽约） | 返回 `'未知'` |
| 直辖市 | `'北京市,北京市,朝阳区'` | `formatCountyName` → `'北京·朝阳'` |
| 普通地级市 | `'河北省,石家庄市,正定县'` | `formatCountyName` → `'石家庄·正定'` |
| 县级市 | `'江苏省,苏州市,昆山市'` | `formatCountyName` → `'苏州·昆山'` |

> 具体断言值以生成后的真实数据为准（实现时先跑一次断言核对，若个别区县中心坐标偏差导致匹配到相邻区县，调整断言到实际匹配结果，保持测试确定性）。

## 6. 验收标准

- [ ] `npm test` 全绿（新增 reverseGeocode 测试 + 既有 30+ 个测试）
- [ ] `npm run build` 无类型错误
- [ ] 手动验证：`npm run dev` 定位后显示「市·区县」格式；消息提示含区县名；非中国坐标显示未知/当前位置
- [ ] `COUNTY_GEO` 数据条数 ≥ 2900（打印统计验证）
- [ ] 海外坐标不误配到国内区县

## 7. 范围外（后续可选）

- 街道级定位（需高德/腾讯 API key）
- 坐标转换（GCJ-02 ↔ WGS-84，当前县区级判定不需要）
- 数据定期更新机制（民政部区划调整时重跑生成脚本）
