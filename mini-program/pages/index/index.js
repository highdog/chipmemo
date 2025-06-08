// pages/index/index.js
const app = getApp();
const api = require('../../utils/api.js');
const util = require('../../utils/util.js');

Page({
  data: {
    userInfo: null,
    isLoggedIn: false,
    recentNotes: [],
    todoStats: {
      total: 0,
      completed: 0,
      pending: 0
    },
    loading: true,
    refreshing: false
  },

  onLoad() {
    console.log('首页加载');
    this.checkLoginStatus();
  },

  onShow() {
    console.log('首页显示');
    if (this.data.isLoggedIn) {
      this.loadDashboardData();
    }
  },

  onPullDownRefresh() {
    this.setData({ refreshing: true });
    this.loadDashboardData().finally(() => {
      this.setData({ refreshing: false });
      wx.stopPullDownRefresh();
    });
  },

  // 检查登录状态
  checkLoginStatus() {
    const isLoggedIn = app.globalData.isLoggedIn;
    const userInfo = app.globalData.userInfo;
    
    this.setData({
      isLoggedIn,
      userInfo
    });
    
    if (isLoggedIn) {
      this.loadDashboardData();
    } else {
      // 用户未登录，跳转到登录页面
      wx.reLaunch({
        url: '/pages/login/login'
      });
      return;
    }
  },

  // 加载仪表板数据
  async loadDashboardData() {
    try {
      this.setData({ loading: true });
      
      // 并行加载数据
      const [notesResult, todoStatsResult] = await Promise.all([
        this.loadRecentNotes(),
        this.loadTodoStats()
      ]);
      
      console.log('仪表板数据加载完成');
    } catch (error) {
      console.error('加载仪表板数据失败:', error);
      util.showToast('加载数据失败');
    } finally {
      this.setData({ loading: false });
    }
  },

  // 加载最近笔记
  async loadRecentNotes() {
    try {
      const result = await api.getNotes({
        page: 1,
        limit: 5,
        sort: 'updatedAt',
        order: 'desc'
      });
      
      if (result.success) {
        const recentNotes = result.data.notes.map(note => ({
          ...note,
          formattedDate: util.getRelativeTime(note.updatedAt),
          truncatedContent: util.truncateString(note.content, 100)
        }));
        
        this.setData({ recentNotes });
        return result;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('加载最近笔记失败:', error);
      throw error;
    }
  },

  // 加载待办事项统计
  async loadTodoStats() {
    try {
      const result = await api.getTodoStats();
      
      if (result.success) {
        this.setData({
          todoStats: result.data
        });
        return result;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('加载待办事项统计失败:', error);
      // 待办事项统计失败不影响其他功能
      this.setData({
        todoStats: {
          total: 0,
          completed: 0,
          pending: 0
        }
      });
      return null;
    }
  },

  // 跳转到登录页
  goToLogin() {
    wx.navigateTo({
      url: '/pages/login/login'
    });
  },

  // 跳转到笔记列表
  goToNotes() {
    if (!this.data.isLoggedIn) {
      this.goToLogin();
      return;
    }
    
    wx.switchTab({
      url: '/pages/notes/notes'
    });
  },

  // 跳转到添加笔记
  goToAddNote() {
    if (!this.data.isLoggedIn) {
      this.goToLogin();
      return;
    }
    
    wx.switchTab({
      url: '/pages/note-edit/note-edit'
    });
  },

  // 跳转到笔记详情
  goToNoteDetail(e) {
    const { id } = e.currentTarget.dataset;
    
    wx.navigateTo({
      url: `/pages/note-detail/note-detail?id=${id}`
    });
  },

  // 跳转到个人中心
  goToProfile() {
    if (!this.data.isLoggedIn) {
      this.goToLogin();
      return;
    }
    
    // 暂时显示提示，因为个人中心页面还未实现
    wx.showToast({
      title: '个人中心功能开发中',
      icon: 'none'
    });
  },

  // 搜索笔记
  searchNotes() {
    if (!this.data.isLoggedIn) {
      this.goToLogin();
      return;
    }
    
    wx.navigateTo({
      url: '/pages/notes/notes?search=true'
    });
  },

  // 快速创建待办事项
  async quickCreateTodo() {
    if (!this.data.isLoggedIn) {
      this.goToLogin();
      return;
    }
    
    wx.showModal({
      title: '快速添加待办',
      editable: true,
      placeholderText: '请输入待办事项内容',
      success: async (res) => {
        if (res.confirm && res.content) {
          try {
            app.showLoading('添加中...');
            
            const result = await api.createTodo({
              title: res.content.trim(),
              completed: false
            });
            
            if (result.success) {
              util.showToast('添加成功', 'success');
              // 刷新统计数据
              this.loadTodoStats();
            } else {
              util.showToast(result.error);
            }
          } catch (error) {
            console.error('创建待办事项失败:', error);
            util.showToast('添加失败');
          } finally {
            app.hideLoading();
          }
        }
      }
    });
  },

  // 分享应用
  onShareAppMessage() {
    return {
      title: '笔记本 - 记录生活点滴',
      path: '/pages/index/index',
      imageUrl: '/images/share-cover.png'
    };
  },

  // 分享到朋友圈
  onShareTimeline() {
    return {
      title: '笔记本 - 记录生活点滴',
      query: '',
      imageUrl: '/images/share-cover.png'
    };
  }
});