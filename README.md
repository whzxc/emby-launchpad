# Emby & Douban Unified Script (Emby & 豆瓣 统一脚本)

增强豆瓣、GYG 和 DMHY 的 Userscript，整合了 Emby 媒体库检测、TMDB/IMDb 评分以及资源搜索链接功能。

## 功能特性

- **豆瓣 (电影/电视剧/探索/排行榜)**
    - 检测条目是否存在于你的 Emby 媒体库中。
    - 显示 IMDb 评分。
    - 提供 GYG 和 BT4G 的快速搜索链接。
    - 一键复制影片信息以便分享。

- **GYG (列表/详情页)**
    - 显示 TMDB 评分和元数据。
    - 检测 Emby 媒体库状态。
    - 在海报上显示 Emby 状态圆点 (Dot)，点击查看详情。

- **DMHY (动漫花园 列表)**
    - 解析动漫标题并检测 Emby 库存。
    - 利用 Bangumi 数据优化搜索结果。
    - 在列表项前显示 Emby 状态圆点 (Dot)，点击查看详细日志和搜索链接。

## 安装指南

1. 安装 [Violentmonkey](https://violentmonkey.github.io/) (推荐) 或 [Tampermonkey](https://www.tampermonkey.net/)。
2. 通过 [UserScript 链接] 安装脚本 (或在本地加载 `dist/tampermonkey-scripts.user.js`)。

## 配置说明

在 Tampermonkey 菜单中点击 "Settings / 设置" 进行配置：

- **TMDB API Key**: 必填，用于获取元数据和评分。
- **Emby Server URL**: 必填，你的 Emby 服务器地址 (例如 `https://emby.example.com`)。
- **Emby API Key**: 必填，在 Emby 控制台 > 高级 > 安全 中生成。
- **Bangumi Token**: 选填，用于更精准的动漫标题解析。

## 开发指南

### 前置要求
- Node.js
- npm

### 构建项目

```bash
npm install
npm run build
```

编译后的脚本位于 `dist/tampermonkey-scripts.user.js`。

### 开发模式

```bash
npm run dev
```
