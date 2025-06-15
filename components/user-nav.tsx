"use client"

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
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/lib/auth-context"
import { toast } from "@/hooks/use-toast"
import { useTheme } from "next-themes"
import { Download, Upload, Loader2, Sun, Moon } from "lucide-react"

interface UserNavProps {
  onLogout?: () => void
  onExport?: () => void
  onImport?: () => void
  isExporting?: boolean
  isImporting?: boolean
}

export function UserNav({ 
  onLogout, 
  onExport, 
  onImport, 
  isExporting = false, 
  isImporting = false 
}: UserNavProps) {
  const router = useRouter()
  const { user, loading: isLoading, logout } = useAuth()
  const { theme, setTheme } = useTheme()

  const handleLogout = () => {
    logout()
    
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
        <DropdownMenuItem onClick={onExport} disabled={isExporting}>
          {isExporting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          {isExporting ? '导出中...' : '导出全部数据'}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onImport} disabled={isImporting}>
          {isImporting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Upload className="h-4 w-4 mr-2" />
          )}
          {isImporting ? '导入中...' : '导入MD'}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
          {theme === 'dark' ? (
            <Sun className="h-4 w-4 mr-2" />
          ) : (
            <Moon className="h-4 w-4 mr-2" />
          )}
          {theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
        </DropdownMenuItem>
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