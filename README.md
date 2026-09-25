# 校园二手书交易平台

面向高校学生的校园二手书交易平台，支持书籍发布、搜索、求购、消息沟通、交易评价等完整功能。

## 快速启动

### Docker Compose 一键部署（推荐）

```bash
# 1. 复制环境变量配置
cp .env.example .env

# 2. 启动全部服务
docker compose up -d

# 3. 查看服务状态
docker compose ps
```

### 本地开发

```bash
# 后端
cd backend
npm install
npm run dev

# 前端（新终端）
cd frontend
npm install
npm run dev
```

## 访问地址

| 服务 | 地址 |
|------|------|
| 前端 | http://localhost:8011 |
| 后端 API | http://localhost:3011 |
| MinIO 控制台 | http://localhost:9008 |
| MySQL | localhost:3404 |
| Redis | localhost:6411 |

## 主要功能

### 用户系统
- 学号 + 学校邮箱注册，邮箱验证码验证
- JWT 登录认证
- 个人信息完善（姓名、院系、联系方式、头像）
- 好评率统计与风险提示

### 书籍交易
- 发布闲置书籍（书名、作者、ISBN、价格、新旧程度、图片等）
- 按书名/作者/ISBN搜索，支持全文索引
- 按学科分类（理工、文史、经管、艺术等）筛选
- 按价格区间、新旧程度筛选
- 按价格、发布时间排序
- 书籍状态管理（可购买/已预约/已售出）

### 求购系统
- 发布求购需求
- 按学科分类浏览
- 卖家主动联系买家

### 消息系统
- 平台内置消息功能
- 支持文字和图片消息
- 消息阅读状态

### 评价系统
- 交易完成后互相评价
- 好评/中评/差评 + 文字评价
- 用户主页展示好评率和历史评价
- 好评率低于 60% 标记风险提示

### 个性化功能
- 书籍收藏
- 浏览历史记录
- 同院系书籍推荐

## 技术栈

| 类别 | 技术 |
|------|------|
| 前端框架 | Vue 3 + TypeScript |
| 前端 UI | Vant 4 |
| 前端构建 | Vite |
| 状态管理 | Pinia |
| 路由 | Vue Router 4 |
| 后端框架 | Node.js + Express |
| 数据库 | MySQL 8.0 |
| ORM | TypeORM |
| 缓存 | Redis |
| 文件存储 | MinIO |
| 认证 | JWT + 邮箱验证码 |
| 部署 | Docker Compose |
| Web 服务器 | Nginx |

## 项目目录结构

```
校园二手书交易平台/
├── backend/                    # 后端项目
│   ├── src/
│   │   ├── config/             # 配置文件
│   │   ├── controllers/        # 控制器
│   │   ├── entities/           # 数据实体
│   │   ├── middlewares/        # 中间件
│   │   ├── routes/             # 路由
│   │   ├── services/           # 服务层
│   │   └── index.ts            # 入口文件
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
├── frontend/                   # 前端项目
│   ├── src/
│   │   ├── api/                # API 请求封装
│   │   ├── components/         # 公共组件
│   │   ├── pages/              # 页面组件
│   │   ├── router/             # 路由配置
│   │   ├── store/              # Pinia 状态管理
│   │   ├── styles/             # 样式文件
│   │   ├── types/              # 类型定义
│   │   ├── App.vue
│   │   └── main.ts
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── database/                   # 数据库脚本
│   └── init.sql
├── docker-compose.yml
├── .env.example
└── README.md
```

## 环境变量说明

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| MYSQL_ROOT_PASSWORD | MySQL root 密码 | root_password_123 |
| MYSQL_DATABASE | 数据库名 | campus_bookstore |
| MYSQL_USER | 数据库用户名 | campus_user |
| MYSQL_PASSWORD | 数据库密码 | campus_password_123 |
| REDIS_PASSWORD | Redis 密码 | redis_password_123 |
| MINIO_ROOT_USER | MinIO 管理员账号 | minioadmin |
| MINIO_ROOT_PASSWORD | MinIO 管理员密码 | minioadmin123 |
| MINIO_BUCKET | 存储桶名称 | books |
| JWT_SECRET | JWT 密钥 | 请修改 |
| JWT_EXPIRES_IN | JWT 过期时间 | 7d |
| SMTP_HOST | SMTP 服务器地址 | smtp.example.com |
| SMTP_PORT | SMTP 端口 | 587 |
| SMTP_USER | SMTP 用户名 | your_email@example.com |
| SMTP_PASSWORD | SMTP 密码 | your_email_password |
| SMTP_FROM | 发件人邮箱 | noreply@campus-bookstore.com |

## Docker 部署说明

### 端口映射

```yaml
frontend: 8011 → 80
backend:  3011 → 3000
mysql:    3404 → 3306
redis:    6411 → 6379
minio:    9007 → 9000 (API)
          9008 → 9001 (控制台)
```

### 数据持久化

- MySQL 数据：`campus_bookstore_mysql_data` 命名卷
- Redis 数据：`campus_bookstore_redis_data` 命名卷
- MinIO 文件：`campus_bookstore_minio_data` 命名卷

### 服务依赖

- backend 服务依赖 mysql、redis、minio 的 healthcheck 通过后才启动
- frontend 服务反向代理 backend 服务（通过 Docker 内部网络）

### 常用命令

```bash
# 启动服务
docker compose up -d

# 查看日志
docker compose logs -f backend
docker compose logs -f frontend

# 停止服务
docker compose down

# 停止服务并删除数据卷（慎用）
docker compose down -v

# 重新构建镜像
docker compose build --no-cache
docker compose up -d
```

## 常见问题

### 1. MinIO 上传失败

确保 MinIO 桶已创建且权限正确。首次启动时会自动创建桶并设置公开读取权限。

### 2. 邮箱验证码收不到

检查 SMTP 配置是否正确。开发环境可查看后端日志，验证码会通过 mock 方式显示在控制台。

### 3. 数据库连接失败

等待 MySQL 健康检查通过（约 30-60 秒）。查看状态：

```bash
docker compose ps
```

### 4. 前端无法访问后端 API

确保所有服务都在 `campus_bookstore_network` 网络中，且 nginx.conf 中的 `proxy_pass` 指向正确的服务名。

## License

MIT License
