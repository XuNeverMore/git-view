# Git View

Git View 是一个本地 Git 项目提交记录查看工具，基于 Next.js 构建。它可以接入本机多个 Git 仓库，并按日期、作者、项目维度查看提交记录，适合做每日工作回顾、提交汇总和日报整理。

## 功能

- 添加本地 Git 仓库路径，并保存到 `projects.json`
- 查看单个项目指定日期的提交记录
- 在项目详情页按时间线或作者分组查看 commit
- 显示项目当前 Git 分支
- 查看今日所有项目的作者提交汇总
- 在今日作者页按作者筛选，并按项目分组展示 commit
- 一键复制某位作者今日所有项目的提交信息

## 技术栈

- Next.js 14
- React 18
- TypeScript
- Node.js `child_process` 调用本地 `git log`

## 本地运行

安装依赖：

```bash
npm install
```

启动开发服务：

```bash
npm run dev
```

默认访问：

```text
http://localhost:3000
```

如果 `3000` 端口被占用，Next.js 会自动切换到其他端口，例如 `3001`。

## 常用命令

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## 页面说明

- `/`：项目列表页，可添加本地 Git 仓库
- `/project/[id]`：单个项目的提交记录页
- `/authors/today`：今日作者提交汇总页

## 数据说明

项目列表保存在根目录的 `projects.json` 中。添加项目时会校验目标路径是否为有效 Git 仓库。

提交记录通过本地 Git 命令读取，因此运行环境需要安装 Git，并且应用进程需要有权限访问对应仓库目录。

## 开发提示

开发服务运行时不要同时执行 `npm run build`，两者都会写入 `.next` 目录，可能导致 Next.js dev 缓存出现缺失 chunk 的错误。如果遇到类似 `Cannot find module './xxx.js'` 的错误，可以停止开发服务后删除 `.next`，再重新运行 `npm run dev`。
