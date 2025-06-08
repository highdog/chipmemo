"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getCurrentUser } from "@/lib/auth"
import { toast } from "@/hooks/use-toast"

interface UserNavProps {
  onLogout?: () => void
}

export function UserNav({ onLogout }: UserNavProps) {
  const router = useRouter()
  const [user, setUser] = useState<{ id: string; username: string; email: string } | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchUser = async () => {
      const userId = localStorage.getItem("userId")
      if (userId) {
        try {
          const result = await getCurrentUser(userId)
          if (result.success && result.user) {
            setUser(result.user)
          } else {
            // 用户信息获取失败，清除本地存储
            localStorage.removeItem("userId")
          }
        } catch (error) {
          console.error("获取用户信息失败", error)
        }
      }
      setIsLoading(false)
    }

    fetchUser()
  }, [])

  const handleLogout = () => {
    // 清除用户会话
    localStorage.removeItem("userId")
    setUser(null)
    
    toast({
      title: "已退出登录",
      description: "您已成功退出登录",
    })
    
    // 调用父组件的登出回调
    if (onLogout) {
      onLogout()
    }
    
    // 可选：跳转到登录页
    // router.push("/login")
  }

  if (isLoading) {
    return (
      <Button variant="ghost" size="sm" className="h-8 w-8 rounded-full">
        <Avatar className="h-8 w-8">
          <AvatarFallback>...</AvatarFallback>
        </Avatar>
      </Button>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href="/login">登录</Link>
        </Button>
        <Button size="sm" asChild>
          <Link href="/register">注册</Link>
        </Button>
      </div>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src="/placeholder-user.jpg" alt={user.username} />
            <AvatarFallback>{user.username.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.username}</p>
            <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          个人资料
        </DropdownMenuItem>
        <DropdownMenuItem>
          设置
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          退出登录
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}