const express = require('express');
const User = require('../models/User');
const Note = require('../models/Note');
const Todo = require('../models/Todo');
const Schedule = require('../models/Schedule');
const TagContent = require('../models/TagContent');
const { adminAuth } = require('../middleware/adminAuth');

const router = express.Router();

// 获取用户统计信息
router.get('/stats', adminAuth, async (req, res) => {
  try {
    // 获取总用户数
    const totalUsers = await User.countDocuments();
    
    // 获取每个用户的数据统计
    const userStats = await User.aggregate([
      {
        $lookup: {
          from: 'notes',
          localField: '_id',
          foreignField: 'userId',
          as: 'notes'
        }
      },
      {
        $lookup: {
          from: 'todos',
          localField: '_id',
          foreignField: 'userId',
          as: 'todos'
        }
      },
      {
        $lookup: {
          from: 'schedules',
          localField: '_id',
          foreignField: 'userId',
          as: 'schedules'
        }
      },
      {
        $lookup: {
          from: 'tagcontents',
          localField: '_id',
          foreignField: 'userId',
          as: 'tagContents'
        }
      },
      {
        $project: {
          _id: 1,
          username: 1,
          email: 1,
          password: 1,
          isAdmin: 1,
          createdAt: 1,
          notesCount: { $size: '$notes' },
          todosCount: { $size: '$todos' },
          schedulesCount: { $size: '$schedules' },
          tagContentsCount: { $size: '$tagContents' },
          totalItems: {
            $add: [
              { $size: '$notes' },
              { $size: '$todos' },
              { $size: '$schedules' },
              { $size: '$tagContents' }
            ]
          }
        }
      },
      {
        $sort: { totalItems: -1 }
      }
    ]);

    // 获取总数据统计
    const totalNotes = await Note.countDocuments();
    const totalTodos = await Todo.countDocuments();
    const totalSchedules = await Schedule.countDocuments();
    const totalTagContents = await TagContent.countDocuments();

    res.json({
      success: true,
      data: {
        summary: {
          totalUsers,
          totalNotes,
          totalTodos,
          totalSchedules,
          totalTagContents,
          totalItems: totalNotes + totalTodos + totalSchedules + totalTagContents
        },
        users: userStats
      }
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ error: 'Failed to fetch admin statistics' });
  }
});

// 获取用户详细信息
router.get('/users/:userId', adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const notes = await Note.find({ userId }).sort({ createdAt: -1 }).limit(10);
    const todos = await Todo.find({ userId }).sort({ createdAt: -1 }).limit(10);
    const schedules = await Schedule.find({ userId }).sort({ createdAt: -1 }).limit(10);
    const tagContents = await TagContent.find({ userId }).sort({ createdAt: -1 }).limit(10);

    res.json({
      success: true,
      data: {
        user,
        recentData: {
          notes,
          todos,
          schedules,
          tagContents
        }
      }
    });
  } catch (error) {
    console.error('Admin user detail error:', error);
    res.status(500).json({ error: 'Failed to fetch user details' });
  }
});

// 删除用户
router.delete('/users/:userId', adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // 检查是否尝试删除自己
    if (userId === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // 删除用户相关的所有数据
    await Promise.all([
      Note.deleteMany({ userId }),
      Todo.deleteMany({ userId }),
      Schedule.deleteMany({ userId }),
      TagContent.deleteMany({ userId }),
      User.findByIdAndDelete(userId)
    ]);
    
    res.json({
      success: true,
      message: 'User and all associated data deleted successfully'
    });
  } catch (error) {
    console.error('Admin delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// 更新用户信息
router.put('/users/:userId', adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { username, email, isAdmin } = req.body;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // 检查邮箱是否已被其他用户使用
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email, _id: { $ne: userId } });
      if (existingUser) {
        return res.status(400).json({ error: 'Email already in use' });
      }
    }
    
    // 检查用户名是否已被其他用户使用
    if (username && username !== user.username) {
      const existingUser = await User.findOne({ username, _id: { $ne: userId } });
      if (existingUser) {
        return res.status(400).json({ error: 'Username already in use' });
      }
    }
    
    // 更新用户信息
    const updateData = {};
    if (username) updateData.username = username;
    if (email) updateData.email = email;
    if (typeof isAdmin === 'boolean') updateData.isAdmin = isAdmin;
    
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, select: '-password' }
    );
    
    res.json({
      success: true,
      data: updatedUser
    });
  } catch (error) {
    console.error('Admin update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// 修改用户密码
router.put('/users/:userId/password', adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { password } = req.body;
    
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // 加密新密码
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 10);
    
    await User.findByIdAndUpdate(userId, { password: hashedPassword });
    
    res.json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    console.error('Admin update password error:', error);
    res.status(500).json({ error: 'Failed to update password' });
  }
});

module.exports = router;