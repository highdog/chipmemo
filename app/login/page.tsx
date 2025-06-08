"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { loginUser } from "@/lib/auth"
import { toast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"

export default function LoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    usernameOrEmail: "",
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
    setIsLoading(true)

    try {
      const result = await loginUser(formData.usernameOrEmail, formData.password)

      if (result.success) {
        // 在实际应用中，这里应该存储用户会话信息
        // 例如使用 cookies 或 localStorage
        localStorage.setItem("userId", result.user?.id || "")
        
        toast({
          title: "登录成功",
          description: `欢迎回来，${result.user?.username}！`,
        })
        
        // 登录成功后跳转到主页
        router.push("/")
      } else {
        toast({
          title: "登录失败",
          description: result.error || "未知错误",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "登录失败",
        description: "发生错误，请重试",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
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
              <Label htmlFor="usernameOrEmail">用户名或邮箱</Label>
              <Input
                id="usernameOrEmail"
                name="usernameOrEmail"
                type="text"
                placeholder="请输入用户名或邮箱"
                required
                value={formData.usernameOrEmail}
                onChange={handleChange}
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