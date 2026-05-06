# 泡语 - Docker 部署指南

## 快速部署

### 1. 克隆代码
```bash
git clone <your-repo-url>
cd paoyu
```

### 2. 创建环境变量文件
```bash
cp .env.example .env
```

编辑 `.env` 文件，修改以下关键配置：
```env
# JWT密钥（必须修改！使用 openssl rand -base64 32 生成）
JWT_SECRET="your-strong-secret-key-here"

# 管理员默认密码（部署后请立即修改）
ADMIN_DEFAULT_PASSWORD="your-secure-password"

# Cron任务密钥
CRON_SECRET="your-cron-secret-key"
```

### 3. 构建并启动
```bash
# 构建并启动
docker-compose up -d --build

# 查看日志
docker-compose logs -f
```

### 4. 访问应用
- 网站地址: http://localhost:3000
- 管理后台: http://localhost:3000/admin/login

## 数据持久化

以下目录会自动挂载到宿主机，确保数据不会丢失：
- `./data` - SQLite 数据库文件
- `./uploads` - 用户上传的图片文件

## 常用命令

```bash
# 启动服务
docker-compose up -d

# 停止服务
docker-compose down

# 重启服务
docker-compose restart

# 查看日志
docker-compose logs -f

# 进入容器
docker exec -it paoyu sh

# 数据库迁移
docker exec -it paoyu npx prisma migrate deploy
```

## 更新部署

```bash
# 拉取最新代码
git pull

# 重新构建并启动
docker-compose up -d --build
```

## 安全建议

1. **修改默认密码**：首次部署后立即登录管理后台修改密码
2. **设置强密钥**：使用 `openssl rand -base64 32` 生成 JWT_SECRET
3. **配置防火墙**：仅开放必要端口（默认3000）
4. **启用HTTPS**：建议使用 Nginx 反向代理配置 SSL

## 使用 Nginx 反向代理（推荐）

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/your/cert.pem;
    ssl_certificate_key /path/to/your/key.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /uploads {
        alias /path/to/paoyu/uploads;
        expires max;
        add_header Cache-Control "public, immutable";
    }
}
```

## 故障排除

### 容器无法启动
```bash
# 查看详细日志
docker-compose logs

# 检查端口占用
netstat -tlnp | grep 3000
```

### 数据库问题
```bash
# 进入容器重置数据库
docker exec -it paoyu sh
npx prisma migrate reset
```

### 权限问题
```bash
# 修复上传目录权限
chmod -R 755 ./uploads
```
