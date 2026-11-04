# 图像创作工作台 · 开发者说明（0.7.2）

这份包只含源码、配置、文档与内置的小型素材目录，不含 1.1 GB 的图片与图库数据，适合交给别人改代码。

## 目录

```
dsh-handraw-style/   （仓库根目录）
  host.js            DSH Host 端 cordis 插件：注册 /api/pose-studio.* 路由
  client.js          浏览器端插件：单文件、手写 h()、无构建步骤
  import-gallery.js  把上游素材整理成 gallery/ 目录
  package.json       dsh.client.inject / dsh.bundle.patch / files 清单（包名 dsh-plugin-pose-studio）
  cordis.patch.yml   把插件插进 profile 的 patch
  assets/            styles.json / colors.json / layouts.json（画风、配色、版式库，含缩略图）
  gallery/LICENSE    图库上游许可证（本仓库不含 data/ thumbs/ img/）
  docs/preview.webp   README 里的界面截图
  README.md          用户说明（安装、升级、接口设置）
  NOTICE.md          素材来源与许可证
```

## 两条数据通道

1. **客户端 → Host**：`client.js` 的 `request(path)` 打 `/api/pose-studio.<route>`；路由在 `host.js` 的 `apply(ctx)` 里用 `ctx.connection.fetch.register` 注册，`route()` 统一把异常转成 `{ error }` + 状态码。
2. **跨卸载/刷新保留状态**：`workspaceSnapshot`（本页内）→ `localStorage`（文字，同步）→ IndexedDB `dsh-pose-studio-v2`（`projects` + `workspace`，含成图）。写入 `remember()`，读取 `readLocal()` / `projectStore('get', …, 'workspace')`，恢复在 `Studio` 顶部 `seed` 与 hydration effect。

## 关键实现点

- **面板注册**：`main` 是 keyed 槽，切走会卸载组件；`sidebar.panellist` 提供左栏入口。异步任务（出图/规划）放在模块作用域 `job`，不要依赖组件卸载时的清理。
- **规划**：`hostPlanner(ctx)` 读宿主 `llm` 服务与 `agentDefaultModel.currentSelection()`，`prepareCall()` 后流式收集 `text-delta`；失败码经 `plannerFailure()` 翻译。宿主不可用时 `gatewayPlan()` 回退到插件自己的 `chat/completions`；`POSE_STUDIO_PLANNER=gateway` 可强制回退。
- **出图**：`generate()` 按 `roles` 组装参考图（pose/face/clothes/style/style2/upload/anchor），有参考图走 multipart `images/edits`，否则 `images/generations`，要求返回 `b64_json`。
- **配置**：`$DSH_HOME/pose-studio/openai.json`（0600）。`gateway()` 校验 Base URL（本机可 HTTP，其他必须 HTTPS），`saveConfig()` 换域名时要求同时填 Key。
- **素材目录**：`assets()` 缓存 `assets/*.json` 与 `gallery/data/*-zh.json`；缺文件时对应 `catalog` 返回 404 并提示导入，画风/配色/版式不受影响。

## 本地开发

```cmd
dsh plugin --profile web add "link:C:\绝对路径\dsh-handraw-style"
dsh web
```

- 改 `client.js`/`host.js` 后需要重开 DSH 窗口（Host 侧改动要重启进程），浏览器端没有构建步骤。
- 环境变量：`POSE_STUDIO_OPENAI_BASE_URL`（出图网关）、`POSE_STUDIO_PLANNER_MODEL`（回退规划的模型）、`POSE_STUDIO_PLANNER=gateway`（强制走回退）。
- 改版本号时同步 `package.json` 与 README 标题。

## 边界

- 单项目最多 12 页；单张上传参考图 ≤ 8 MB；单次生成需返回 `b64_json`。
- 本地图库缺失时，姿势/服装/人像三类目录不可用，但规划、画风/配色/版式、上传参考图仍可工作。
- 存档按 origin 隔离：换端口或换浏览器会各存一份。

提示词由 Host 的 prompt.js 编译，预览与生图使用同一编译器。画风、图型、配色与模型能力元数据取自上游提交 2858062fd4f56fa04fbc4122d8ea5438a501bf5e。
