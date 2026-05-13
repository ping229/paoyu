# 泡语 - 完整部署方案

## 目录

1. [环境要求](#环境要求)
2. [本地开发部署](#本地开发部署)
3. [Docker 部署（推荐）](#docker-部署推荐)
4. [生产环境部署](#生产环境部署)
5. [配置说明](#配置说明)
6. [定时任务配置](#定时任务配置)
7. [常见问题](#常见问题)

---

## 环境要求

- Node.js 18.x 或更高版本
- npm 9.x 或更高版本
- SQLite 3
- Docker & Docker Compose（可选，用于容器化部署）

---

## 本地开发部署

### 1. 克隆项目

```bash
git clone git@github.com:ping229/paoyu.git
cd paoyu
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

创建 `.env` 文件：

```bash
# 数据库
DATABASE_URL="file:./dev.db"

# JWT 密钥（请修改为随机字符串）
JWT_SECRET="your-jwt-secret-change-this"

# 定时任务密钥（用于保护 cron 接口）
CRON_SECRET="your-cron-secret-change-this"
```

### 4. 初始化数据库

```bash
npx prisma generate
npx prisma migrate dev
```

### 5. 创建管理员账号

```bash
npx prisma db execute --stdin <<EOF
INSERT INTO Admin (id, username, passwordHash, createdAt)
VALUES (
  'admin-001',
  'admin',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZRGdjGj/n3.eG1H3IplTJBkMhEJ2a',
  datetime('now')
);
EOF
```

> 默认密码：`admin123`，请在首次登录后立即修改！

### 6. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

---

## Docker 部署（推荐）

### 1. 克隆项目

```bash
git clone git@github.com:ping229/paoyu.git
cd paoyu
```

### 2. 配置环境变量

创建 `.env` 文件：

```bash
# 数据库
DATABASE_URL="file:./data/dev.db"

# JWT 密钥
JWT_SECRET="your-secure-jwt-secret-at-least-32-chars"

# 定时任务密钥
CRON_SECRET="your-secure-cron-secret"
```

### 3. 构建并启动

```bash
# 构建镜像
docker-compose build

# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f
```

### 4. 初始化数据库

```bash
# 进入容器
docker-compose exec app sh

# 运行迁移
npx prisma migrate deploy

# 创建管理员账号
npx prisma db execute --stdin <<EOF
INSERT INTO Admin (id, username, passwordHash, createdAt)
VALUES (
  'admin-001',
  'admin',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZRGdjGj/n3.eG1H3IplTJBkMhEJ2a',
  datetime('now')
);
EOF

# 退出容器
exit
```

### 5. 访问应用

- 前台：http://localhost:3000
- 管理后台：http://localhost:3000/admin/login

### Docker Compose 配置说明

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/prisma/data  # 数据持久化
      - ./uploads:/app/public/uploads  # 上传文件持久化
    environment:
      - DATABASE_URL=file:./data/dev.db
      - JWT_SECRET=${JWT_SECRET}
      - CRON_SECRET=${CRON_SECRET}
    restart: unless-stopped
```

---

## 生产环境部署

### 方案一：VPS 服务器部署

#### 1. 服务器准备

推荐配置：
- CPU: 2核
- 内存: 2GB
- 硬盘: 20GB SSD
- 系统: Ubuntu 22.04

#### 2. 安装 Docker

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装 Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# 安装 Docker Compose
sudo apt install docker-compose-plugin -y
```

#### 3. 部署应用

```bash
# 创建应用目录
mkdir -p /opt/paoyu
cd /opt/paoyu

# 克隆代码
git clone git@github.com:ping229/paoyu.git .

# 创建数据目录
mkdir -p data uploads

# 配置环境变量
cat > .env <<EOF
DATABASE_URL=file:./data/prod.db
JWT_SECRET=$(openssl rand -base64 32)
CRON_SECRET=$(openssl rand -base64 32)
EOF

# 构建并启动
docker compose up -d --build

# 初始化数据库
docker compose exec app npx prisma migrate deploy
```

#### 4. 配置 Nginx 反向代理

```bash
sudo apt install nginx certbot python3-certbot-nginx -y
```

创建 Nginx 配置 `/etc/nginx/sites-available/paoyu`：

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

```bash
# 启用配置
sudo ln -s /etc/nginx/sites-available/paoyu /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# 配置 HTTPS
sudo certbot --nginx -d your-domain.com
```

#### 5. 配置定时任务（发送时光邮件）

添加 cron 任务：

```bash
crontab -e
```

添加以下内容：

```cron
# 每5分钟检查一次定时任务
*/5 * * * * curl -s -H "Authorization: Bearer YOUR_CRON_SECRET" https://your-domain.com/api/cron > /dev/null 2>&1
```

将 `YOUR_CRON_SECRET` 替换为 `.env` 文件中的 `CRON_SECRET` 值。

---

### 方案二：云平台部署（Vercel + PlanetScale）

#### 1. 数据库准备

使用 PlanetScale 作为 MySQL 数据库：

1. 注册 PlanetScale 账号
2. 创建数据库
3. 获取连接字符串

修改 `prisma/schema.prisma`：

```prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
  relationMode = "prisma"
}
```

#### 2. 部署到 Vercel

```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录
vercel login

# 部署
vercel --prod
```

#### 3. 配置环境变量

在 Vercel 项目设置中添加环境变量：

- `DATABASE_URL`: PlanetScale 连接字符串
- `JWT_SECRET`: JWT 密钥
- `CRON_SECRET`: 定时任务密钥

#### 4. 配置 Vercel Cron

创建 `vercel.json`：

```json
{
  "crons": [
    {
      "path": "/api/cron",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

---

## 配置说明

### 环境变量

| 变量名 | 必填 | 说明 |
|--------|------|------|
| `DATABASE_URL` | 是 | SQLite 数据库路径，如 `file:./data/dev.db` |
| `JWT_SECRET` | 是 | JWT 签名密钥，至少32字符 |
| `CRON_SECRET` | 是 | 定时任务接口保护密钥 |

### 邮件服务配置

在管理后台「邮件配置」页面设置：

1. **SMTP服务器地址**：如 `smtp.qq.com`、`smtp.gmail.com`
2. **SMTP端口**：通常为 `465`（SSL）或 `587`（TLS）
3. **SMTP用户名**：您的邮箱地址
4. **SMTP密码**：邮箱授权码（非登录密码）
5. **发件人名称**：显示给收件人的名称
6. **发件人邮箱**：收件人看到的发件人地址

#### 常见邮箱配置

**QQ邮箱**：
- 服务器：`smtp.qq.com`
- 端口：`465`
- 密码：需要在 QQ邮箱设置中获取授权码

**Gmail**：
- 服务器：`smtp.gmail.com`
- 端口：`587`
- 密码：需要启用两步验证后创建应用专用密码

**阿里云邮件**：
- 服务器：`smtpdm.aliyun.com`
- 端口：`465`

### 时光邮件监管设置

在管理后台「时光邮件管理」→「监管设置」中配置：

1. **无监管**：所有邮件直接发送，无需审核
2. **完全监管**：所有邮件必须管理员审核后才能发送
3. **关键词监管**：包含指定关键词的邮件需要审核

---

## 定时任务配置

时光邮件需要定时任务来检查和发送到期的邮件。

### 方式一：系统 Cron（推荐）

```bash
# 编辑 crontab
crontab -e

# 添加任务（每5分钟执行一次）
*/5 * * * * curl -s -H "Authorization: Bearer YOUR_CRON_SECRET" http://localhost:3000/api/cron > /dev/null 2>&1
```

### 方式二：外部定时服务

使用外部服务如 cron-job.org、EasyCron 等定期调用：

```
URL: https://your-domain.com/api/cron
Method: GET
Headers: Authorization: Bearer YOUR_CRON_SECRET
Schedule: 每5分钟
```

---

## 常见问题

### 1. 数据库迁移失败

```bash
# 重置数据库（会丢失数据）
npx prisma migrate reset

# 重新生成客户端
npx prisma generate
```

### 2. 无法发送邮件

检查以下项目：
1. SMTP 配置是否正确
2. 是否使用了授权码而非登录密码
3. 服务器是否允许出站 SMTP 连接
4. 检查管理后台中的错误日志

### 3. 定时任务不执行

1. 确认 CRON_SECRET 配置正确
2. 检查 cron 服务是否运行
3. 查看 `/api/cron` 接口返回结果

### 4. 忘记管理员密码

重置密码：

```bash
# 进入项目目录
cd /opt/paoyu

# 使用 Prisma Studio 修改
npx prisma studio

# 或直接执行 SQL
npx prisma db execute --stdin <<EOF
UPDATE Admin SET passwordHash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZRGdjGj/n3.eG1H3IplTJBkMhEJ2a' WHERE username = 'admin';
EOF
```

重置后密码为 `admin123`，请立即修改。

### 5. 文件上传失败

1. 确保 `public/uploads` 目录存在且可写
2. 检查文件大小限制（默认最大 10MB）
3. Docker 部署时确保 volumes 正确挂载

---

## 维护命令

### Docker 部署

```bash
# 查看日志
docker compose logs -f

# 重启服务
docker compose restart

# 更新代码
git pull
docker compose up -d --build

# 备份数据
tar -czf backup-$(date +%Y%m%d).tar.gz data/ uploads/

# 查看容器状态
docker compose ps
```

### 数据备份

```bash
# 备份 SQLite 数据库
cp data/dev.db backups/dev-$(date +%Y%m%d).db

# 备份上传文件
tar -czf uploads-$(date +%Y%m%d).tar.gz uploads/
```

---

## 安全建议

1. **修改默认密码**：首次部署后立即修改管理员密码
2. **使用强密钥**：JWT_SECRET 和 CRON_SECRET 使用至少32位随机字符
3. **启用 HTTPS**：生产环境必须使用 HTTPS
4. **定期备份**：设置自动备份任务
5. **监控日志**：定期检查错误日志和异常访问
6. **限制访问**：管理后台建议限制 IP 访问或添加二次验证

---

## 技术支持

- GitHub Issues: https://github.com/ping229/paoyu/issues
- 项目地址: https://github.com/ping229/paoyu
