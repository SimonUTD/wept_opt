# wept_opt

原始 `wept` 项目长期无人维护。  
这个仓库是一个最小维护分支，主要就是修复可用性问题。

当前维护内容只针对以下问题：

1. 修复旧编译链不支持现代语法（`?.`、`...`）。
2. 修复命令体验：`wept` 无参数默认等价 `wept web`。
3. 修复浏览器空白页问题（`/script/build.js` 404）。

## 安装（Git）

```bash
git clone https://github.com/SimonUTD/wept_opt.git
cd wept_opt
pnpm install
pnpm add -g .
```

## 使用

在小程序项目根目录执行：

```bash
wept
```

启动后按日志里的地址访问浏览器（端口从 `3000` 起自动选择，可不是固定 `3000`）。

## 说明

当前以 `web` 路径为主；`ios` 命令仍未实现。
