"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { useEffect } from "react" // Add useEffect import
import { useAuth } from "@/lib/auth-context"
import { toast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { apiClient } from "@/lib/api"

export default function LoginPage() {
  const router = useRouter()
  const { login, isAuthenticated, loading: authLoading } = useAuth() // Get isAuthenticated and authLoading
  const [isLoading, setIsLoading] = useState(false) // Local loading state for form submission
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('[LoginPage] handleSubmit called with formData:', formData);
    setIsLoading(true)

    try {
      console.log('[LoginPage] Calling authContext.login...');
      const result = await login(formData.email, formData.password) // 使用 context 中的 login 方法
      console.log('[LoginPage] authContext.login result:', result);

      if (result.success && result.user) {
        toast({
          title: "登录成功",
          description: `欢迎回来，${result.user.username}！`,
        });
        console.log('[LoginPage] Login success toast shown.');
        // router.push("/"); // Navigation will be handled by useEffect
      } else {
        console.error('[LoginPage] Login failed, result error:', result.error);
        toast({
          title: "登录失败",
          description: result.error || "未知错误",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('[LoginPage] Login handleSubmit caught exception:', error);
      toast({
        title: "登录失败",
        description: "发生错误，请重试",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      console.log('[LoginPage] handleSubmit finished.');
    }
  }

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, authLoading, router]);

  // Optional: Show loading or different UI based on auth state
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>检查认证状态...</p> {/* Or a spinner component */}
      </div>
    );
  }
  
  // If already authenticated and not loading, and somehow still on this page before useEffect redirects
  // This might be redundant if useEffect is quick, but can prevent form flash
  if (isAuthenticated) {
     return (
      <div className="flex min-h-screen items-center justify-center">
        <p>已登录，正在跳转...</p>
      </div>
    ); 
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <Toaster />
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">登录</CardTitle>
          <CardDescription className="text-center">
            输入您的账号信息登录笔记应用
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">邮箱</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="请输入邮箱"
              value={formData.email}
              onChange={handleChange}
              autoComplete="email"
              required
            />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">密码</Label>
                <Link
                  href="#"
                  className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  忘记密码？
                </Link>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="请输入密码"
                autoComplete="current-password"
                required
                value={formData.password}
                onChange={handleChange}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "登录中..." : "登录"}
            </Button>
            <div className="text-center text-sm">
              还没有账号？{" "}
              <Link
                href="/register"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                注册
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}