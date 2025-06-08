"use server"

import { revalidatePath } from "next/cache"

export interface User {
  id: string
  username: string
  email: string
  password: string // 实际项目中应该存储哈希后的密码
  createdAt: string
}

// 模拟用户数据存储
const usersStorage: User[] = []

// 注册新用户
export async function registerUser(username: string, email: string, password: string): Promise<{ success: boolean; error?: string; userId?: string }> {
  try {
    await new Promise((resolve) => setTimeout(resolve, 500))

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

    // 检查用户名和邮箱是否已存在
    const existingUser = usersStorage.find(
      (user) => user.username === username || user.email === email
    )

    if (existingUser) {
      if (existingUser.username === username) {
        return { success: false, error: "用户名已被使用" }
      }
      if (existingUser.email === email) {
        return { success: false, error: "邮箱已被注册" }
      }
    }

    // 创建新用户
    const newUser: User = {
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      username,
      email,
      password, // 实际项目中应该存储哈希后的密码
      createdAt: new Date().toISOString(),
    }

    usersStorage.push(newUser)
    revalidatePath("/")

    return { success: true, userId: newUser.id }
  } catch (error) {
    return { success: false, error: "注册失败，请重试" }
  }
}

// 用户登录
export async function loginUser(usernameOrEmail: string, password: string): Promise<{ success: boolean; error?: string; user?: Omit<User, "password"> }> {
  try {
    await new Promise((resolve) => setTimeout(resolve, 500))

    // 验证输入
    if (!usernameOrEmail.trim()) {
      return { success: false, error: "用户名或邮箱不能为空" }
    }
    if (!password) {
      return { success: false, error: "密码不能为空" }
    }

    // 查找用户
    const user = usersStorage.find(
      (user) => (user.username === usernameOrEmail || user.email === usernameOrEmail) && user.password === password
    )

    if (!user) {
      return { success: false, error: "用户名/邮箱或密码不正确" }
    }

    // 返回用户信息（不包含密码）
    const { password: _, ...userWithoutPassword } = user
    return { success: true, user: userWithoutPassword }
  } catch (error) {
    return { success: false, error: "登录失败，请重试" }
  }
}

// 获取当前用户信息（模拟）
export async function getCurrentUser(userId: string): Promise<{ success: boolean; error?: string; user?: Omit<User, "password"> }> {
  try {
    await new Promise((resolve) => setTimeout(resolve, 300))

    const user = usersStorage.find((user) => user.id === userId)

    if (!user) {
      return { success: false, error: "用户不存在" }
    }

    // 返回用户信息（不包含密码）
    const { password: _, ...userWithoutPassword } = user
    return { success: true, user: userWithoutPassword }
  } catch (error) {
    return { success: false, error: "获取用户信息失败" }
  }
}