# 更新日志 (Changelog)

## [1.3.0] - 2026-02-09
### 新增 / Added
- **UI 标准化**: 引入统一的 `UI` 模块 (`src/utils/ui.js`)。
- **状态圆点 (Dot)**: 在豆瓣、GYG 和 DMHY 的海报/列表上显示标准化的 Emby 状态圆点。
- **详情模态框 (Modal)**: 点击状态圆点可打开统一的详情模态框，包含 Emby 播放链接、搜索链接 (GYG, BT4G) 和执行日志。
- **文档本地化**: README 和 CHANGELOG 已翻译为中文。

### 变更 / Changed
- 重构 `dmhy.js`, `gyg.js`, `douban/*.js` 以使用共享的 UI 组件。
- 移除了豆瓣详情页的侧边栏面板，替换为海报上的状态圆点。

## [1.2.0] - 2026-02-09
### 新增 / Added
- 使用 Vite 对项目结构进行模块化重构。
- 统建构建流程。
- 将代码拆分为 Services (服务), Handlers (处理器), 和 Utils (工具) 模块。

### 变更 / Changed
- 将 `unified_script.js` 重构为多个模块。

## [1.1.0] - Previous Version
- 为豆瓣和 GYG 添加 Emby 检测。
- 添加 DMHY 支持。
- 添加设置界面。
