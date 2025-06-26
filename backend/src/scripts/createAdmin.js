const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const createAdminUser = async () => {
  try {
    // 连接数据库
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/notepad');
    console.log('Connected to MongoDB');

    // 删除现有admin用户并重新创建
    await User.deleteOne({ username: 'admin' });
    console.log('Removed existing admin user if any');

    // 创建管理员用户
    const adminUser = new User({
      username: 'admin',
      email: 'admin@notepad.com',
      password: 'admin123',
      isAdmin: true
    });

    await adminUser.save();
    console.log('Admin user created successfully');
    console.log('Username: admin');
    console.log('Password: admin123');
    console.log('Email: admin@notepad.com');

  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

// 如果直接运行此脚本
if (require.main === module) {
  createAdminUser();
}

module.exports = createAdminUser;