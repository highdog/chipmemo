export interface User {
  id: string
  username: string
  email: string
  preferences?: any
}

export interface AuthResponse {
  success: boolean
  token?: string
  user?: User
  error?: string
  errors?: Array<{ msg: string; param: string }>
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

// 注册新用户
export async function registerUser(username: string, email: string, password: string): Promise<AuthResponse> {
  try {
    // 验证输入
    if (!username.trim()) {
      return { success: false, error: "用户名不能为空" }
    }
    if (!email.trim()) {
      return { success: false, error: "邮箱不能为空" }
    }
    if (!password || password.length < 6) {
      return { success: false, error: "密码不能少于6个字符" }
    }

    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, email, password }),
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data.error || data.errors?.[0]?.msg || '注册失败'
      }
    }

    return {
      success: true,
      token: data.token,
      user: data.user
    }
  } catch (error) {
    return { success: false, error: "网络错误，请重试" }
  }
}

// 用户登录
export async function loginUser(email: string, password: string): Promise<AuthResponse> {
  try {
    // 验证输入
    if (!email.trim()) {
      return { success: false, error: "邮箱不能为空" }
    }
    if (!password) {
      return { success: false, error: "密码不能为空" }
    }

    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data.error || data.errors?.[0]?.msg || '登录失败'
      }
    }

    return {
      success: true,
      token: data.token,
      user: data.user
    }
  } catch (error) {
    return { success: false, error: "网络错误，请重试" }
  }
}

// 获取当前用户信息
export async function getCurrentUser(token: string): Promise<{ success: boolean; error?: string; user?: User }> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data.error || '获取用户信息失败'
      }
    }

    return {
      success: true,
      user: data.user
    }
  } catch (error) {
    return { success: false, error: "网络错误，请重试" }
  }
}