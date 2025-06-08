# Notepad Backend API

这是笔记应用的后端API服务，使用Node.js + Express + MongoDB构建。

## 功能特性

- 用户认证和授权 (JWT)
- 笔记CRUD操作
- 待办事项管理
- 标签系统
- 全文搜索
- 数据分页
- 输入验证
- 错误处理
- 安全中间件

## 技术栈

- **Node.js** - 运行时环境
- **Express.js** - Web框架
- **MongoDB** - 数据库
- **Mongoose** - ODM
- **JWT** - 身份验证
- **bcryptjs** - 密码加密
- **express-validator** - 输入验证
- **helmet** - 安全中间件
- **cors** - 跨域处理

## 安装和运行

### 1. 安装依赖

```bash
cd backend
npm install
```

### 2. 环境配置

复制环境变量模板文件：

```bash
cp .env.example .env
```

编辑 `.env` 文件，配置以下变量：

```env
PORT=3001
MONGODB_URI=mongodb://localhost:27017/notepad
JWT_SECRET=your-super-secret-jwt-key
FRONTEND_URL=http://localhost:3000
```

### 3. 启动MongoDB

确保MongoDB服务正在运行：

```bash
# macOS (使用Homebrew)
brew services start mongodb-community

# 或者直接启动
mongod
```

### 4. 运行服务

开发模式（自动重启）：

```bash
npm run dev
```

生产模式：

```bash
npm start
```

服务将在 `http://localhost:3001` 启动。

## API 端点

### 认证相关

- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `GET /api/auth/me` - 获取当前用户信息
- `PUT /api/auth/profile` - 更新用户资料

### 笔记相关

- `GET /api/notes` - 获取笔记列表
- `GET /api/notes/:id` - 获取单个笔记
- `POST /api/notes` - 创建笔记
- `PUT /api/notes/:id` - 更新笔记
- `DELETE /api/notes/:id` - 删除笔记
- `GET /api/notes/tags/all` - 获取所有标签

### 待办事项相关

- `GET /api/todos` - 获取待办事项列表
- `GET /api/todos/stats` - 获取待办事项统计
- `POST /api/todos` - 创建待办事项
- `PUT /api/todos/:id` - 更新待办事项
- `PATCH /api/todos/:id/toggle` - 切换完成状态
- `DELETE /api/todos/:id` - 删除待办事项
- `GET /api/todos/categories` - 获取所有分类

### 健康检查

- `GET /api/health` - 服务健康状态

## 请求示例

### 用户注册

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123"
  }'
```

### 创建笔记

```bash
curl -X POST http://localhost:3001/api/notes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "title": "我的第一篇笔记",
    "content": "这是笔记内容",
    "tags": ["工作", "重要"]
  }'
```

## 数据模型

### User (用户)

```javascript
{
  username: String,
  email: String,
  password: String (加密),
  avatar: String,
  preferences: {
    theme: String,
    language: String
  },
  createdAt: Date,
  updatedAt: Date
}
```

### Note (笔记)

```javascript
{
  title: String,
  content: String,
  tags: [String],
  userId: ObjectId,
  isArchived: Boolean,
  isPinned: Boolean,
  color: String,
  attachments: [Object],
  createdAt: Date,
  updatedAt: Date
}
```

### Todo (待办事项)

```javascript
{
  text: String,
  completed: Boolean,
  priority: String,
  dueDate: Date,
  userId: ObjectId,
  noteId: ObjectId,
  category: String,
  tags: [String],
  reminder: Object,
  createdAt: Date,
  updatedAt: Date
}
```

## 开发说明

### 项目结构

```
backend/
├── src/
│   ├── config/
│   │   └── database.js      # 数据库配置
│   ├── middleware/
│   │   ├── auth.js          # 认证中间件
│   │   └── errorHandler.js  # 错误处理
│   ├── models/
│   │   ├── User.js          # 用户模型
│   │   ├── Note.js          # 笔记模型
│   │   └── Todo.js          # 待办事项模型
│   ├── routes/
│   │   ├── auth.js          # 认证路由
│   │   ├── notes.js         # 笔记路由
│   │   └── todos.js         # 待办事项路由
│   └── index.js             # 应用入口
├── .env.example             # 环境变量模板
├── package.json
└── README.md
```

### 安全特性

- JWT身份验证
- 密码bcrypt加密
- 请求速率限制
- CORS配置
- Helmet安全头
- 输入验证和清理
- MongoDB注入防护

### 错误处理

所有API响应都遵循统一格式：

成功响应：
```json
{
  "success": true,
  "data": { ... }
}
```

错误响应：
```json
{
  "success": false,
  "error": "错误信息"
}
```

## 部署

### 生产环境配置

1. 设置环境变量
2. 使用生产级MongoDB
3. 配置反向代理 (Nginx)
4. 启用HTTPS
5. 设置进程管理 (PM2)

### Docker部署

```dockerfile
# 可以创建Dockerfile进行容器化部署
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

## 许可证

MIT License