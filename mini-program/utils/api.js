// utils/api.js
// API 工具类

const app = getApp();

class ApiClient {
  constructor() {
    this.baseUrl = 'http://localhost:3001/api'; // 开发环境
    this.timeout = 10000;
  }

  // 通用请求方法
  request(options) {
    return new Promise((resolve, reject) => {
      const { url, method = 'GET', data = {}, headers = {} } = options;
      
      // 添加认证头
      const token = wx.getStorageSync('auth_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      // 设置默认头部
      headers['Content-Type'] = headers['Content-Type'] || 'application/json';
      
      wx.request({
        url: `${this.baseUrl}${url}`,
        method,
        data,
        header: headers,
        timeout: this.timeout,
        success: (res) => {
          console.log(`API请求成功: ${method} ${url}`, res.data);
          
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({
              success: true,
              data: res.data,
              statusCode: res.statusCode
            });
          } else {
            console.error(`API请求失败: ${method} ${url}`, res);
            resolve({
              success: false,
              error: res.data?.message || `请求失败 (${res.statusCode})`,
              statusCode: res.statusCode
            });
          }
        },
        fail: (error) => {
          console.error(`API请求异常: ${method} ${url}`, error);
          
          let errorMessage = '网络错误';
          if (error.errMsg) {
            if (error.errMsg.includes('timeout')) {
              errorMessage = '请求超时';
            } else if (error.errMsg.includes('fail')) {
              errorMessage = '网络连接失败';
            }
          }
          
          reject({
            success: false,
            error: errorMessage,
            originalError: error
          });
        }
      });
    });
  }

  // GET 请求
  get(url, params = {}) {
    const queryString = Object.keys(params)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      .join('&');
    
    const fullUrl = queryString ? `${url}?${queryString}` : url;
    
    return this.request({
      url: fullUrl,
      method: 'GET'
    });
  }

  // POST 请求
  post(url, data = {}) {
    return this.request({
      url,
      method: 'POST',
      data
    });
  }

  // PUT 请求
  put(url, data = {}) {
    return this.request({
      url,
      method: 'PUT',
      data
    });
  }

  // PATCH 请求
  patch(url, data = {}) {
    return this.request({
      url,
      method: 'PATCH',
      data
    });
  }

  // DELETE 请求
  delete(url) {
    return this.request({
      url,
      method: 'DELETE'
    });
  }
}

const apiClient = new ApiClient();

// 认证相关API
const authApi = {
  // 用户登录
  login: (credentials) => {
    return apiClient.post('/auth/login', credentials);
  },

  // 用户注册
  register: (userData) => {
    return apiClient.post('/auth/register', userData);
  },

  // 获取当前用户信息
  getCurrentUser: () => {
    return apiClient.get('/auth/me');
  },

  // 更新用户资料
  updateProfile: (userData) => {
    return apiClient.put('/auth/profile', userData);
  }
};

// 笔记相关API
const notesApi = {
  // 获取笔记列表
  getNotes: (params = {}) => {
    return apiClient.get('/notes', params);
  },

  // 获取单个笔记
  getNote: (id) => {
    return apiClient.get(`/notes/${id}`);
  },

  // 创建笔记
  createNote: (noteData) => {
    return apiClient.post('/notes', noteData);
  },

  // 更新笔记
  updateNote: (id, noteData) => {
    return apiClient.put(`/notes/${id}`, noteData);
  },

  // 删除笔记
  deleteNote: (id) => {
    return apiClient.delete(`/notes/${id}`);
  },

  // 搜索笔记
  searchNotes: (query, params = {}) => {
    return apiClient.get('/notes', { search: query, ...params });
  },

  // 获取所有标签
  getTags: () => {
    return apiClient.get('/notes/tags/all');
  }
};

// 待办事项相关API
const todosApi = {
  // 获取待办事项列表
  getTodos: (params = {}) => {
    return apiClient.get('/todos', params);
  },

  // 创建待办事项
  createTodo: (todoData) => {
    return apiClient.post('/todos', todoData);
  },

  // 更新待办事项
  updateTodo: (id, todoData) => {
    return apiClient.put(`/todos/${id}`, todoData);
  },

  // 切换待办事项完成状态
  toggleTodo: (id) => {
    return apiClient.patch(`/todos/${id}/toggle`);
  },

  // 删除待办事项
  deleteTodo: (id) => {
    return apiClient.delete(`/todos/${id}`);
  },

  // 获取待办事项统计
  getTodoStats: () => {
    return apiClient.get('/todos/stats');
  },

  // 获取所有分类
  getCategories: () => {
    return apiClient.get('/todos/categories');
  }
};

// 导出API方法
module.exports = {
  // 基础方法
  request: apiClient.request.bind(apiClient),
  get: apiClient.get.bind(apiClient),
  post: apiClient.post.bind(apiClient),
  put: apiClient.put.bind(apiClient),
  patch: apiClient.patch.bind(apiClient),
  delete: apiClient.delete.bind(apiClient),
  
  // 认证API
  login: authApi.login,
  register: authApi.register,
  getCurrentUser: authApi.getCurrentUser,
  updateProfile: authApi.updateProfile,
  
  // 笔记API
  getNotes: notesApi.getNotes,
  getNote: notesApi.getNote,
  createNote: notesApi.createNote,
  updateNote: notesApi.updateNote,
  deleteNote: notesApi.deleteNote,
  searchNotes: notesApi.searchNotes,
  getTags: notesApi.getTags,
  
  // 待办事项API
  getTodos: todosApi.getTodos,
  createTodo: todosApi.createTodo,
  updateTodo: todosApi.updateTodo,
  toggleTodo: todosApi.toggleTodo,
  deleteTodo: todosApi.deleteTodo,
  getTodoStats: todosApi.getTodoStats,
  getCategories: todosApi.getCategories
};