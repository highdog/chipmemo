// 创建管理员用户
db = db.getSiblingDB('admin');
db.createUser({
  user: 'admin',
  pwd: 'password123',
  roles: [
    {
      role: 'userAdminAnyDatabase',
      db: 'admin'
    },
    {
      role: 'readWriteAnyDatabase',
      db: 'admin'
    }
  ]
});

// 切换到应用数据库
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
db.createCollection('schedules');
db.createCollection('todos');
db.createCollection('goals');
db.createCollection('checkins');

print('Database initialization completed');