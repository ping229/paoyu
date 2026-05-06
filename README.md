# 泡语 - 异世界真心话

一个匿名交流网站，核心理念是"异世界真心话"。用户通过8位交互码匿名收发消息，支持文字、图片消息。

## 功能特性

- 🔮 **匿名消息** - 用泡泡传递心声，对方永远不会知道你是谁
- ⏰ **时间胶囊** - 寄出一封未来的信，一个月后公开在公共频道
- 💬 **公共频道** - 公开的时间胶囊，可以评论、点赞、私聊
- 🔒 **完全匿名** - 可刷新的交互码，可自我摧毁的账户，无迹可寻
- 👨‍💼 **管理后台** - 举报管理、公共频道管理、用户管理

## 技术栈

- **框架**: Next.js 14 (App Router)
- **数据库**: SQLite + Prisma ORM
- **样式**: Tailwind CSS
- **认证**: JWT

## 快速开始

### 开发环境

```bash
# 克隆仓库
git clone https://github.com/ping229/paoyu.git
cd paoyu

# 安装依赖
npm install

# 创建环境变量文件
cp .env.example .env

# 生成Prisma Client
npx prisma generate

# 运行数据库迁移
npx prisma migrate dev

# 启动开发服务器
npm run dev
```

访问 http://localhost:3000

### Docker 部署

```bash
# 创建环境变量
cp .env.example .env

# 构建并启动
docker-compose up -d --build
```

详细部署指南请查看 [DOCKER_DEPLOY.md](./DOCKER_DEPLOY.md)

## 默认账号

- **管理员登录**: http://localhost:3000/admin/login
- **默认用户名**: admin
- **默认密码**: admin123456

⚠️ 部署后请立即修改默认密码！

## 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| JWT_SECRET | JWT密钥（必须修改） | - |
| ADMIN_DEFAULT_PASSWORD | 管理员默认密码 | admin123456 |
| CRON_SECRET | Cron任务密钥 | - |

## 项目结构

```
/opt/paoyu/
├── src/
│   ├── app/           # Next.js App Router 页面
│   ├── api/           # API 路由
│   ├── components/    # React 组件
│   └── lib/           # 工具函数
├── prisma/            # 数据库模型
├── uploads/           # 上传文件存储
└── public/            # 静态资源
```

## License

MIT
