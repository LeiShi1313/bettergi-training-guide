# BetterGI Training Guide Reader

独立、只读的 BetterGI「提升指南」读取器。它完整保留 OCR、结构覆盖、滚动连续性、来源行和快照 provenance，返回中立的培养目标读数；它不读取背包，不计算材料需求，不配置调度，也不执行或领取任何树脂任务。

## 使用独立脚本

```bash
pnpm build
```

把 `dist/BetterGI-Training-Guide/` 复制到 BetterGI 的 `User/JsScript/` 下，再加入配置组运行。已验证运行边界是 BetterGI 0.64.0、简体中文界面和 1920×1080；代码会缩放 16:9 坐标，但其他 BetterGI 版本和分辨率尚未实机验证。

一次成功读取会保存：

- `collection.json`：本轮首页、逐角色原始 OCR、结构覆盖和快照 provenance。
- `preview.json`：中立的角色等级、当前武器和天赋读数，以及是否可供下游消费。
- `raw/`：逐页 OCR 与必要的局部诊断证据。

启用角色为零是有效结果：`collection.characters` 和 `preview.characterProgress` 都为空。读取失败或任一页面不完整时，当前输出会被标记为失败并抛出清晰错误；脚本仍尝试调用 `genshin.ReturnMainUi()`。独立入口只显示摘要，不弹窗，不扫描背包，也没有计划器或执行器。

2026-09-18 已用本仓库的独立构建产物在上述环境完成两轮零树脂实机验证，覆盖梦见月瑞希、哥伦比娅（100 级无需提升）和阿罗夏的等级、武器、加成天赋与长页滚动；保存结果与游戏界面对照一致。同轮新鲜结果另经隔离测试包交给 GCP 既有目标适配器和真实角色档案，验证了目标换算及原目标优先。BetterGI 原生档案曾将哥伦比娅上限读为 `10`；适配器保留原始 `100/10` 证据，并仅在指南明确无需提升时按普通等级已完成处理。有效空指南、缺页、过期、批次混合和身份歧义使用保存证据回放验证。测试未扫描背包或调用执行器。

## 作为可复用模块

消费者把整个 `guide-reader/` 放在自身脚本根目录，并直接导入唯一公共接口：

```js
import { readTrainingGuideSnapshot } from "./guide-reader/index.js";

const { collection, preview } = await readTrainingGuideSnapshot();
```

`collection` 保留原始证据；`preview.characterProgress` 是经过身份和完整性检查的中立读数。角色/武器需求换算、95/100 级投影、合并策略、材料目录、库存和执行都属于消费者，不能移入读取器。

## 同步到消费者

从本仓库运行：

```bash
pnpm sync:consumer -- /absolute/path/to/consumer-root
```

命令只覆盖 `consumer-root/guide-reader/` 中 `SOURCE.json` 明确列出的读取器文件，以及生成的 `SOURCE.json`／`RECEIPT.json`；不会删除额外文件，也不会接触消费者的结果、设置或其他目录。符号链接目标会被拒绝。重复运行产生相同内容，不使用 submodule，也不需要 BGI 用户安装 npm 包或联网。

`SOURCE.json` 记录 payload 最初提取自哪个 GCP commit；`RECEIPT.json` 记录本次 build/sync 所用 `bettergi-training-guide` 仓库的精确 Git commit、payload manifest 哈希和 dirty 状态。`pnpm build` 允许 dirty 工作树用于本地检查，并在 receipt 中明确写入 `"dirty": true`；`pnpm sync:consumer` 拒绝 dirty 或含未提交文件的源仓库，避免把未提交字节错误归因到 `commit`。因此正式同步应先提交，再重新构建或同步。

## 固定来源与更新

运行时 payload 从 `LeiShi1313/GenshinCultivationPlanner` commit `1177e821f8d3b1fffe354acfbe703361c94ec4e4` 的 `guide-reader/` 原样提取。`guide-reader/index.js` SHA-256 为 `1aba90fe7e62599e1a506f1f8bc92406c652034c76aa4b4c47b05ab37f38a03e`，身份表为 `b07f67af01814e10804529dd457b157be10c90b302988aba236ef48c5e7168c8`；全部 payload 哈希见 `guide-reader/SOURCE.json`。

身份表由 `tools/build-guide-identities.mjs` 从固定 `genshin-db@5.2.13`（Genshin 7.0，ChineseSimplified，source commit `8b15995fa220c88a4d0d7ffe1e21b041d0b32588`）显式生成：

```bash
pnpm install --frozen-lockfile
pnpm build:guide-identities
```

生成不是构建步骤，也不会在 BGI 运行时联网。这里的生成器只比原 GCP 工具多写固定 `genshin-db` source commit，身份映射语义不变，并在当前锁定版本上逐字节复现已提交的身份表。

身份数据更新必须显式复核：先运行生成命令，再检查 `git diff -- guide-reader/data/guide-identities.json`。无 diff 时不要改哈希；有预期 diff 时，逐项复核依赖版本、来源 commit、角色/武器身份与许可 provenance，再在同一评审变更中手动更新 `guide-reader/SOURCE.json` 的身份表 SHA-256、generator SHA-256 和版本字段。build/sync 在清单哈希更新前拒绝新字节是预期的审查门；工具不会静默刷新清单。不要手改身份表或用模糊名称扩展其语义。

七个 `guide_*` PNG 裁自本项目采集的原生游戏截图，只作为对应 UI 行与滚动状态的结构证据。`genshin-db`、BetterGI 和项目许可原文分别保存在 `THIRD_PARTY_NOTICES.md`、`guide-reader/data/LICENSE.*` 与 `LICENSE`。

## 构建产物

`pnpm build` 每次重建两个内容确定的目录：

- `dist/BetterGI-Training-Guide/`：可安装的独立 BetterGI 只读脚本。
- `dist/vendor/guide-reader/`：供其他仓库 vendoring 的完整读取器目录。

构建会先校验 `SOURCE.json` 中每个 payload 和身份生成器的 SHA-256，并生成 canonical receipt；任何未审阅的读取器或生成器漂移都会直接失败。
