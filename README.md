# 扭蛋抽奖系统 (Gashapon Lottery)

基于 Tauri + Vue 3 + TypeScript 开发的桌面应用程序。

## 环境要求

- Node.js >= 18
- Rust (安装 Tauri CLI 时会自动检测)
- 推荐 IDE: [VS Code](https://code.visualstudio.com/) + [Vue - Official](https://marketplace.visualstudio.com/items?itemName=Vue.volar) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

## 安装依赖

```bash
npm install
```

## 开发模式

启动开发服务器（支持局域网访问）：

```bash
npm run dev
```

或者使用 Tauri 开发模式（会启动桌面应用窗口）：

```bash
npm run tauri dev
```

开发服务器将在以下地址启动：
- 本地访问: http://localhost:1420
- 局域网访问: http://[你的IP地址]:1420

## 构建生产版本

### 仅构建前端

```bash
npm run build
```

构建产物将输出到 `dist` 目录。

### 构建 Tauri 应用

构建桌面应用安装包：

```bash
npm run tauri build
```

构建产物将输出到 `src-tauri/target/release/bundle/` 目录，包含：
- Windows: `.msi` 安装包和 `.exe` 可执行文件
- macOS: `.dmg` 安装包和 `.app` 应用
- Linux: `.deb` 和 `.AppImage` 等格式

## 预览生产构建

预览构建后的前端应用：

```bash
npm run preview
```

## 项目结构

```
gashapon-lottery-vue3/
├── src/              # Vue 前端源码
├── src-tauri/        # Tauri Rust 后端源码
├── public/           # 静态资源
└── dist/             # 构建输出目录
```
