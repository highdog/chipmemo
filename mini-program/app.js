// app.js
const api = require('./utils/api.js');

App({
  globalData: {
    userInfo: null,
    token: null,
    apiBaseUrl: 'http://localhost:3001/api', // 开发环境API地址
    isLoggedIn: false
  },

  onLaunch() {
    console.log('小程序启动');
    
    // 检查登录状态
    this.checkLoginStatus();
    
    // 获取系统信息
    this.getSystemInfo();
  },

  onShow() {
    console.log('小程序显示');
  },

  onHide() {
    console.log('小程序隐藏');
  },

  // 检查登录状态
  checkLoginStatus() {
    const token = wx.getStorageSync('auth_token');
    if (token) {
      this.globalData.token = token;
      this.globalData.isLoggedIn = true;
      
      // 验证token有效性
      this.validateToken();
    }
  },

  // 验证token有效性
  async validateToken() {
    try {
      const result = await api.getCurrentUser();
      if (result.success) {
        this.globalData.userInfo = result.data.user;
        this.globalData.isLoggedIn = true;
      } else {
        // token无效，清除登录状态
        this.logout();
      }
    } catch (error) {
      console.error('验证token失败:', error);
      this.logout();
    }
  },

  // 获取系统信息
  getSystemInfo() {
    wx.getSystemInfo({
      success: (res) => {
        this.globalData.systemInfo = res;
        console.log('系统信息:', res);
      },
      fail: (error) => {
        console.error('获取系统信息失败:', error);
      }
    });
  },

  // 登录
  async login(email, password) {
    try {
      const result = await api.login({ email, password });
      
      if (result.success) {
        const { token, user } = result.data;
        
        // 保存到本地存储
        wx.setStorageSync('auth_token', token);
        wx.setStorageSync('user_info', user);
        
        // 更新全局状态
        this.globalData.token = token;
        this.globalData.userInfo = user;
        this.globalData.isLoggedIn = true;
        
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('登录失败:', error);
      return { success: false, error: '网络错误，请重试' };
    }
  },

  // 注册
  async register(username, email, password) {
    try {
      const result = await api.register({ username, email, password });
      
      if (result.success) {
        const { token, user } = result.data;
        
        // 保存到本地存储
        wx.setStorageSync('auth_token', token);
        wx.setStorageSync('user_info', user);
        
        // 更新全局状态
        this.globalData.token = token;
        this.globalData.userInfo = user;
        this.globalData.isLoggedIn = true;
        
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('注册失败:', error);
      return { success: false, error: '网络错误，请重试' };
    }
  },

  // 登出
  logout() {
    // 清除本地存储
    wx.removeStorageSync('auth_token');
    wx.removeStorageSync('user_info');
    
    // 清除全局状态
    this.globalData.token = null;
    this.globalData.userInfo = null;
    this.globalData.isLoggedIn = false;
    
    // 跳转到登录页
    wx.reLaunch({
      url: '/pages/login/login'
    });
  },

  // 显示错误提示
  showError(message) {
    wx.showToast({
      title: message || '操作失败',
      icon: 'none',
      duration: 2000
    });
  },

  // 显示成功提示
  showSuccess(message) {
    wx.showToast({
      title: message || '操作成功',
      icon: 'success',
      duration: 2000
    });
  },

  // 显示加载提示
  showLoading(message) {
    wx.showLoading({
      title: message || '加载中...',
      mask: true
    });
  },

  // 隐藏加载提示
  hideLoading() {
    wx.hideLoading();
  },

  // 检查网络状态
  checkNetworkStatus() {
    return new Promise((resolve) => {
      wx.getNetworkType({
        success: (res) => {
          if (res.networkType === 'none') {
            this.showError('网络连接不可用');
            resolve(false);
          } else {
            resolve(true);
          }
        },
        fail: () => {
          this.showError('网络检查失败');
          resolve(false);
        }
      });
    });
  },

  // 格式化日期
  formatDate(date, format = 'YYYY-MM-DD') {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hour = String(d.getHours()).padStart(2, '0');
    const minute = String(d.getMinutes()).padStart(2, '0');
    const second = String(d.getSeconds()).padStart(2, '0');
    
    return format
      .replace('YYYY', year)
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hour)
      .replace('mm', minute)
      .replace('ss', second);
  },

  // 防抖函数
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
});