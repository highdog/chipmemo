// MongoDB 初始化脚本
// 创建应用数据库和用户

db = db.getSiblingDB('notepad');

// 创建应用用户
db.createUser({
  user: 'notepad_user',
  pwd: 'notepad_password',
  roles: [
    {
      role: 'readWrite',
      db: 'notepad'
    }
  ]
});

// 创建基础集合
db.createCollection('users');
db.createCollection('notes');
db.createCollection('tags');

// 插入一些示例数据（可选）
db.users.insertOne({
  username: 'demo',
  email: 'demo@example.com',
  password: '$2a$10$example.hash.here', // 这里应该是加密后的密码
  createdAt: new Date(),
  updatedAt: new Date()
});

print('Database initialized successfully!');