# 泡语 - 异世界真心话

一个匿名交流网站，核心理念是"异世界真心话"。用户通过8位交互码匿名收发消息，支持文字、图片、语音消息。

![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Prisma](https://img.shields.io/badge/Prisma-ORM-blue)
![License](https://img.shields.io/badge/License-MIT-green)

## 功能特性

### 用户功能

- 🔮 **匿名消息** - 用泡泡传递心声，对方永远不会知道你是谁
- ⏰ **时光邮件** - 给未来的某人写一封信，定时发送到邮箱
- 💬 **公共频道** - 公开的泡泡，可以评论、点赞、私聊
- 🔒 **完全匿名** - 可刷新的交互码，可自我摧毁的账户
- 📷 **多媒体消息** - 支持文字、图片、语音消息

### 管理功能

- 👨‍💼 **管理后台** - 举报管理、公共频道管理、用户管理
- 📧 **邮件配置** - 配置 SMTP 服务发送时光邮件
- 🔍 **时光邮件监管** - 三种监管模式（无监管/完全监管/关键词监管）
- 📊 **数据统计** - 用户活跃度、消息统计

## 技术栈

- **框架**: Next.js 14 (App Router)
- **语言**: TypeScript
- **数据库**: SQLite + Prisma ORM
- **样式**: Tailwind CSS
- **认证**: JWT
- **邮件**: Nodemailer

---

## 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/ping229/paoyu.git
cd paoyu
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

创建 `.env` 文件：

```bash
# 数据库连接
DATABASE_URL="file:./dev.db"

# JWT 密钥（请修改为随机字符串，至少32位）
JWT_SECRET="your-jwt-secret-change-this-to-random-string"

# 定时任务密钥（用于保护 cron 接口）
CRON_SECRET="your-cron-secret-change-this"
```

### 4. 初始化数据库

```bash
# 生成 Prisma Client
npx prisma generate

# 运行数据库迁移
npx prisma migrate dev
```

### 5. 创建管理员账号

首次部署需要手动创建管理员账号：

```bash
npx prisma db execute --stdin <<EOF
INSERT INTO Admin (id, username, passwordHash, createdAt)
VALUES (
  'admin-001',
  'admin',
  '\$2a\$10\$N9qo8uLOickgx2ZMRZoMyeIjZRGdjGj/n3.eG1H3IplTJBkMhEJ2a',
  datetime('now')
);
EOF
```

> 默认密码：`admin123`，请在首次登录后立即修改！

### 6. 启动开发服务器

```bash
npm run dev
```

访问：
- 前台：http://localhost:3000
- 管理后台：http://localhost:3000/admin/login

---

## Docker 部署（推荐）

### 1. 克隆并配置

```bash
git clone https://github.com/ping229/paoyu.git
cd paoyu

# 创建数据目录
mkdir -p data uploads

# 创建环境变量文件
cat > .env <<EOF
DATABASE_URL=file:./data/prod.db
JWT_SECRET=$(openssl rand -base64 32)
CRON_SECRET=$(openssl rand -base64 32)
EOF
```

### 2. 构建并启动

```bash
# 构建镜像
docker-compose build

# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f
```

### 3. 初始化数据库

```bash
# 进入容器
docker-compose exec app sh

# 运行迁移
npx prisma migrate deploy

# 创建管理员（默认密码：admin123）
npx prisma db execute --stdin <<EOF
INSERT INTO Admin (id, username, passwordHash, createdAt)
VALUES (
  'admin-001',
  'admin',
  '\$2a\$10\$N9qo8uLOickgx2ZMRZoMyeIjZRGdjGj/n3.eG1H3IplTJBkMhEJ2a',
  datetime('now')
);
EOF

exit
```

### 4. 访问应用

- 前台：http://localhost:3000
- 管理后台：http://localhost:3000/admin/login

---

## 生产环境部署

### 使用 Nginx 反向代理

#### 1. 安装 Nginx

```bash
sudo apt update
sudo apt install nginx certbot python3-certbot-nginx -y
```

#### 2. 创建 Nginx 配置

创建 `/etc/nginx/sites-available/paoyu`：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### 3. 启用配置并申请 SSL

```bash
# 启用配置
sudo ln -s /etc/nginx/sites-available/paoyu /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# 申请 SSL 证书
sudo certbot --nginx -d your-domain.com
```

### 配置定时任务

时光邮件需要定时任务来检查和发送到期的邮件：

```bash
crontab -e
```

添加以下内容（每5分钟执行一次）：

```cron
*/5 * * * * curl -s -H "Authorization: Bearer YOUR_CRON_SECRET" https://your-domain.com/api/cron > /dev/null 2>&1
```

> 将 `YOUR_CRON_SECRET` 替换为 `.env` 文件中配置的值

---

## 配置说明

### 邮件服务配置

在管理后台「邮件配置」页面设置 SMTP 服务：

| 配置项 | 说明 |
|--------|------|
| SMTP服务器地址 | 如 `smtp.qq.com`、`smtp.gmail.com` |
| SMTP端口 | 465 (SSL) 或 587 (TLS) |
| SMTP用户名 | 您的邮箱地址 |
| SMTP密码 | 邮箱授权码（非登录密码） |
| 发件人名称 | 显示给收件人的名称 |

#### QQ邮箱配置示例

1. 登录 QQ邮箱 → 设置 → 账户
2. 开启 POP3/SMTP 服务
3. 获取授权码
4. 填写配置：
   - 服务器：`smtp.qq.com`
   - 端口：`465`
   - 密码：授权码

### 时光邮件监管设置

在管理后台「时光邮件管理」→「监管设置」配置：

| 模式 | 说明 |
|------|------|
| 无监管 | 所有邮件直接发送 |
| 完全监管 | 所有邮件必须管理员审核 |
| 关键词监管 | 包含指定关键词的邮件需审核 |

---

## 环境变量

| 变量名 | 必填 | 说明 |
|--------|------|------|
| `DATABASE_URL` | 是 | SQLite 数据库路径，如 `file:./data/dev.db` |
| `JWT_SECRET` | 是 | JWT 签名密钥，至少32字符 |
| `CRON_SECRET` | 是 | 定时任务接口保护密钥 |

---

## 项目结构

```
paoyu/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── page.tsx           # 首页
│   │   ├── login/             # 登录页
│   │   ├── register/          # 注册页
│   │   ├── space/             # 个人空间
│   │   ├── send/              # 发送泡泡
│   │   ├── public/            # 公共频道
│   │   ├── time-mail/         # 时光邮件
│   │   ├── admin/             # 管理后台
│   │   └── api/               # API 路由
│   ├── components/            # React 组件
│   └── lib/                   # 工具函数
├── prisma/
│   └── schema.prisma          # 数据库模型
├── uploads/                   # 上传文件存储
├── public/                    # 静态资源
├── Dockerfile                 # Docker 配置
├── docker-compose.yml         # Docker Compose 配置
└── DEPLOY.md                  # 详细部署文档
```

---

## 默认账号

| 账号类型 | 地址 | 用户名 | 密码 |
|----------|------|--------|------|
| 管理员 | /admin/login | admin | admin123 |

⚠️ **安全提示**：部署后请立即修改默认密码！

---

## 常见问题

### 1. 邮件发送失败

- 检查 SMTP 配置是否正确
- 确认使用的是授权码而非登录密码
- 查看管理后台中的错误日志

### 2. 时光邮件不发送

- 确认定时任务是否配置
- 检查 CRON_SECRET 是否正确
- 查看 `/api/cron` 接口返回

### 3. 忘记管理员密码

```bash
# 重置密码为 admin123
npx prisma db execute --stdin <<EOF
UPDATE Admin SET passwordHash = '\$2a\$10\$N9qo8uLOickgx2ZMRZoMyeIjZRGdjGj/n3.eG1H3IplTJBkMhEJ2a' WHERE username = 'admin';
EOF
```

---

## 更多文档

- [详细部署方案](./DEPLOY.md)
- [Docker 部署指南](./DOCKER_DEPLOY.md)

---

## License

MIT
