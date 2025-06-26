// API客户端 - 与后端API通信

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// API响应类型
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: Array<{ msg: string; param: string }>;
}

// 用户相关类型
export interface User {
  _id: string;
  username: string;
  email: string;
  isAdmin?: boolean;
  preferences: {
    theme: 'light' | 'dark' | 'system';
    language: 'en' | 'zh' | 'ja';
  };
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

// 笔记相关类型
export interface Note {
  _id: string;
  title: string;
  content: string;
  tags: string[];
  userId: string;
  isArchived: boolean;
  isPinned: boolean;
  color: string;
  createdAt: string;
  updatedAt: string;
}

// 待办事项相关类型
export interface Todo {
  _id: string;
  text: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;
  userId: string;
}

// 管理员相关类型
export interface AdminStats {
  summary: {
    totalUsers: number;
    totalNotes: number;
    totalTodos: number;
    totalSchedules: number;
    totalTagContents: number;
    totalItems: number;
  };
  users: Array<{
    _id: string;
    username: string;
    email: string;
    password: string;
    isAdmin: boolean;
    createdAt: string;
    notesCount: number;
    todosCount: number;
    schedulesCount: number;
    tagContentsCount: number;
    totalItems: number;
  }>;
}

export interface UserDetail {
  user: {
    _id: string;
    username: string;
    email: string;
    createdAt: string;
    preferences: {
      theme: string;
      language: string;
    };
  };
  recentData: {
    notes: any[];
    todos: any[];
    schedules: any[];
    tagContents: any[];
  };

  noteId?: string;
  category: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

// HTTP客户端类
class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    // 从localStorage获取token
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
  }

  // 设置认证token
  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  // 清除认证token
  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }

  // 获取请求头
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    return headers;
  }

  // 通用请求方法
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.getHeaders(),
          ...options.headers,
        },
      });

      let data;
      let textResponse;
      
      // 首先尝试获取文本响应
      try {
        textResponse = await response.text();
      } catch (textError) {
        return {
          success: false,
          error: `无法读取响应: ${textError instanceof Error ? textError.message : '未知错误'}`,
        };
      }
      
      // 然后尝试解析为 JSON
      try {
        data = JSON.parse(textResponse);
      } catch (jsonError) {
        // Handle non-JSON responses (like HTML error pages)
        if (response.status === 429) {
          return {
            success: false,
            error: '请求过于频繁，请稍后再试',
          };
        }
        return {
          success: false,
          error: `服务器错误 (${response.status}): ${textResponse.substring(0, 100)}`,
        };
      }

      if (!response.ok) {
        // 如果是401错误，清除token
        if (response.status === 401) {
          this.clearToken();
        }
        // Handle different error response formats
        const errorMessage = data.error || data.message || `HTTP ${response.status}`;
        return {
          success: false,
          error: errorMessage,
          errors: data.errors,
        };
      }

      return data;
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error); // 添加日志
      return {
        success: false,
        error: error instanceof Error ? error.message : '网络请求失败',
      };
    }
  }

  // GET请求
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  // POST请求
  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // PUT请求
  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // PATCH请求
  async patch<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // DELETE请求
  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // 认证相关API
  async register(userData: {
    username: string;
    email: string;
    password: string;
  }): Promise<ApiResponse<AuthResponse>> {
    return this.post<AuthResponse>('/auth/register', userData);
  }

  async login(credentials: {
    email: string;
    password: string;
  }): Promise<ApiResponse<AuthResponse>> {
    return this.post<AuthResponse>('/auth/login', credentials);
  }

  async getCurrentUser(): Promise<ApiResponse<{ user: User }>> {
    return this.get<{ user: User }>('/auth/me');
  }

  async updateProfile(data: {
    username?: string;
    preferences?: Partial<User['preferences']>;
  }): Promise<ApiResponse<{ user: User }>> {
    return this.put<{ user: User }>('/auth/profile', data);
  }

  // 笔记相关API
  async getNotes(params?: {
    page?: number;
    limit?: number;
    search?: string;
    tags?: string;
    archived?: boolean;
  }): Promise<ApiResponse<{ notes: Note[]; pagination: any }>> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }
    const query = searchParams.toString();
    return this.get<{ notes: Note[]; pagination: any }>(
      `/notes${query ? `?${query}` : ''}`
    );
  }

  async getNote(id: string): Promise<ApiResponse<Note>> {
    return this.get<Note>(`/notes/${id}`);
  }

  async createNote(noteData: {
    title: string;
    content: string;
    tags?: string[];
    color?: string;
    customDate?: string;
  }): Promise<ApiResponse<Note>> {
    return this.post<Note>('/notes', noteData);
  }

  async updateNote(
    id: string,
    noteData: Partial<{
      title: string;
      content: string;
      tags: string[];
      color: string;
      isPinned: boolean;
      isArchived: boolean;
    }>
  ): Promise<ApiResponse<Note>> {
    return this.put<Note>(`/notes/${id}`, noteData);
  }

  async deleteNote(id: string): Promise<ApiResponse<{ message: string }>> {
    return this.delete<{ message: string }>(`/notes/${id}`);
  }

  async getAllTags(): Promise<ApiResponse<Array<{ tag: string; count: number }>>> {
    return this.get<Array<{ tag: string; count: number }>>('/notes/tags/all');
  }

  // 标签内容相关API
  async getTagContent(tag: string): Promise<ApiResponse<{ tag: string; content: string; isDefault?: boolean; updatedAt?: string; isGoalEnabled?: boolean; targetCount?: number; currentCount?: number }>> {
    return this.get<{ tag: string; content: string; isDefault?: boolean; updatedAt?: string; isGoalEnabled?: boolean; targetCount?: number; currentCount?: number }>(`/tag-contents/${encodeURIComponent(tag)}`);
  }

  async saveTagContent(tag: string, content: string, goalSettings?: {
    isGoalEnabled?: boolean
    targetCount?: number
    currentCount?: number
  }): Promise<ApiResponse<{ tag: string; content: string; isGoalEnabled?: boolean; targetCount?: number; currentCount?: number; updatedAt: string }>> {
    console.log('🌐 [API] saveTagContent 调用开始')
    console.log('📤 [API] 请求参数:', {
      tag: tag,
      content: content,
      goalSettings: goalSettings
    })
    
    const requestBody = {
      content,
      ...goalSettings
    }
    
    console.log('📦 [API] 请求体:', requestBody)
    console.log('🔗 [API] 请求URL:', `/tag-contents/${encodeURIComponent(tag)}`)
    
    try {
      const response = await this.put<{ tag: string; content: string; isGoalEnabled?: boolean; targetCount?: number; currentCount?: number; updatedAt: string }>(`/tag-contents/${encodeURIComponent(tag)}`, requestBody)
      
      console.log('📥 [API] saveTagContent 响应:', response)
      console.log('✅ [API] saveTagContent 成功')
      
      return response
    } catch (error) {
      console.error('❌ [API] saveTagContent 失败:', error)
      throw error
    }
  }

  async getAll(): Promise<ApiResponse<Array<{ tag: string; content: string; updatedAt: string; isGoalEnabled?: boolean; targetCount?: number; currentCount?: number }>>> {
    console.log('🌐 [API] getAll 调用开始')
    console.log('🔗 [API] 请求URL: /tag-contents')
    
    try {
      const response = await this.get<Array<{ tag: string; content: string; updatedAt: string; isGoalEnabled?: boolean; targetCount?: number; currentCount?: number }>>('/tag-contents')
      console.log('📥 [API] getAll 响应:', response)
      console.log('📊 [API] getAll 数据类型:', typeof response)
      console.log('📋 [API] getAll 数据结构:', response ? Object.keys(response) : 'null')
      
      if (response && response.data) {
        console.log('📄 [API] getAll 数据详情:', {
          dataType: typeof response.data,
          isArray: Array.isArray(response.data),
          length: response.data.length,
          firstItem: response.data[0]
        })
      }
      
      console.log('✅ [API] getAll 成功')
      return response
    } catch (error) {
      console.error('❌ [API] getAll 失败:', error)
      throw error
    }
  }
  async deleteTagContent(tag: string): Promise<ApiResponse<{ message: string }>> {
    return this.delete<{ message: string }>(`/tag-contents/${encodeURIComponent(tag)}`);
  }

  async getAllTagContents(): Promise<ApiResponse<Array<{ tag: string; content: string; updatedAt: string }>>> {
    return this.get<Array<{ tag: string; content: string; updatedAt: string }>>('/tag-contents');
  }

  // 日程相关API
  async getSchedules(params?: {
    date?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<{ [date: string]: Array<{ id: string; title: string; time: string; description?: string; type?: string }> }>> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }
    const query = searchParams.toString();
    return this.get<{ [date: string]: Array<{ id: string; title: string; time: string; description?: string; type?: string }> }>(
      `/schedules${query ? `?${query}` : ''}`
    );
  }

  async createSchedule(data: {
    title: string;
    time: string;
    date: string;
    description?: string;
    type?: string;
  }): Promise<ApiResponse<{ id: string; title: string; time: string; date: string; description?: string; type?: string }>> {
    return this.post<{ id: string; title: string; time: string; date: string; description?: string; type?: string }>('/schedules', data);
  }

  async updateSchedule(id: string, data: {
    title?: string;
    time?: string;
    date?: string;
    description?: string;
    type?: string;
  }): Promise<ApiResponse<{ id: string; title: string; time: string; date: string; description?: string; type?: string }>> {
    return this.put<{ id: string; title: string; time: string; date: string; description?: string; type?: string }>(`/schedules/${id}`, data);
  }

  async deleteSchedule(id: string): Promise<ApiResponse<{ message: string }>> {
    return this.delete<{ message: string }>(`/schedules/${id}`);
  }

  // 待办事项相关API
  async getTodos(params?: {
    date?: string;
    completed?: boolean;
    category?: string;
    priority?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<{ todos: Todo[]; pagination: any }>> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }
    const query = searchParams.toString();
    return this.get<{ todos: Todo[]; pagination: any }>(
      `/todos${query ? `?${query}` : ''}`
    );
  }

  async getTodoStats(): Promise<ApiResponse<{
    total: number;
    completed: number;
    pending: number;
    overdue: number;
    dueToday: number;
  }>> {
    return this.get('/todos/stats');
  }

  async createTodo(todoData: {
    text: string;
    priority?: 'low' | 'medium' | 'high';
    dueDate?: string;
    category?: string;
    noteId?: string;
    tags?: string[];
  }): Promise<ApiResponse<Todo>> {
    return this.post<Todo>('/todos', todoData);
  }

  async updateTodo(
    id: string,
    todoData: Partial<{
      text: string;
      completed: boolean;
      priority: 'low' | 'medium' | 'high';
      dueDate: string;
      category: string;
    }>
  ): Promise<ApiResponse<Todo>> {
    return this.put<Todo>(`/todos/${id}`, todoData);
  }

  async toggleTodo(id: string): Promise<ApiResponse<Todo>> {
    return this.patch<Todo>(`/todos/${id}/toggle`);
  }

  async deleteTodo(id: string): Promise<ApiResponse<{ message: string }>> {
    return this.delete<{ message: string }>(`/todos/${id}`);
  }

  async getTodoCategories(): Promise<ApiResponse<Array<{ category: string; count: number }>>> {
    return this.get<Array<{ category: string; count: number }>>('/todos/categories');
  }

  // 管理员相关方法
  async getAdminStats(): Promise<ApiResponse<AdminStats>> {
    return this.get<AdminStats>('/admin/stats');
  }

  async getUserDetail(userId: string): Promise<ApiResponse<UserDetail>> {
    return this.get<UserDetail>(`/admin/users/${userId}`);
  }

  async deleteUser(userId: string): Promise<ApiResponse<{ message: string }>> {
    return this.delete<{ message: string }>(`/admin/users/${userId}`);
  }

  async updateUser(userId: string, data: { username?: string; email?: string; isAdmin?: boolean }): Promise<ApiResponse<any>> {
    return this.put<any>(`/admin/users/${userId}`, data);
  }

  async updateUserPassword(userId: string, password: string): Promise<ApiResponse<{ message: string }>> {
    return this.put<{ message: string }>(`/admin/users/${userId}/password`, { password });
  }
}

// 创建API客户端实例
export const apiClient = new ApiClient(API_BASE_URL);

// 导出便捷方法
export const authApi = {
  register: (data: { username: string; email: string; password: string }) =>
    apiClient.register(data),
  login: (data: { email: string; password: string }) => apiClient.login(data),
  getCurrentUser: () => apiClient.getCurrentUser(),
  updateProfile: (data: { username?: string; preferences?: Partial<User['preferences']> }) =>
    apiClient.updateProfile(data),
  logout: () => apiClient.clearToken(),
};

export const notesApi = {
  getAll: (params?: Parameters<typeof apiClient.getNotes>[0]) => apiClient.getNotes(params),
  getById: (id: string) => apiClient.getNote(id),
  create: (data: Parameters<typeof apiClient.createNote>[0]) => apiClient.createNote(data),
  update: (id: string, data: Parameters<typeof apiClient.updateNote>[1]) =>
    apiClient.updateNote(id, data),
  delete: (id: string) => apiClient.deleteNote(id),
  getTags: () => apiClient.getAllTags(),
};

export const todosApi = {
  getAll: (params?: Parameters<typeof apiClient.getTodos>[0]) => apiClient.getTodos(params),
  getStats: () => apiClient.getTodoStats(),
  create: (data: Parameters<typeof apiClient.createTodo>[0]) => apiClient.createTodo(data),
  update: (id: string, data: Parameters<typeof apiClient.updateTodo>[1]) =>
    apiClient.updateTodo(id, data),
  toggle: (id: string) => apiClient.toggleTodo(id),
  delete: (id: string) => apiClient.deleteTodo(id),
  getCategories: () => apiClient.getTodoCategories(),
};

export const tagContentsApi = {
  get: (tag: string) => apiClient.getTagContent(tag),
  save: (tag: string, content: string, goalSettings?: { isGoalEnabled?: boolean; targetCount?: number; currentCount?: number }) => apiClient.saveTagContent(tag, content, goalSettings),
  delete: (tag: string) => apiClient.deleteTagContent(tag),
  getAll: () => apiClient.getAllTagContents(),
};

export const schedulesApi = {
  getAll: (params?: Parameters<typeof apiClient.getSchedules>[0]) => apiClient.getSchedules(params),
  create: (data: Parameters<typeof apiClient.createSchedule>[0]) => apiClient.createSchedule(data),
  update: (id: string, data: Parameters<typeof apiClient.updateSchedule>[1]) =>
    apiClient.updateSchedule(id, data),
  delete: (id: string) => apiClient.deleteSchedule(id),
};

export const adminApi = {
  getStats: () => apiClient.getAdminStats(),
  getUserDetail: (userId: string) => apiClient.getUserDetail(userId),
  deleteUser: (userId: string) => apiClient.deleteUser(userId),
  updateUser: (userId: string, data: { username?: string; email?: string; isAdmin?: boolean }) => apiClient.updateUser(userId, data),
  updateUserPassword: (userId: string, password: string) => apiClient.updateUserPassword(userId, password),
};

export default apiClient;