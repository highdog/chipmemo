"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { TabsContent } from "@/components/ui/tabs"
import { User, FileText, Calendar, CheckSquare, Target, Moon, Sun, LogOut, Settings, Eye, EyeOff } from "lucide-react"
import { useRouter } from "next/navigation"
import { ProfileTabProps } from "./types"
import { toast as showToast } from "@/components/ui/use-toast"
import { useAuth } from "@/lib/auth-context"
import { Switch } from "@/components/ui/switch"
import { useState } from "react"

// 移除了UserStats接口，不再需要统计数据

export function ProfileTab({ user, theme, toggleTheme, logout }: ProfileTabProps) {
  const toast = showToast
  const router = useRouter()
  const { updateUser } = useAuth()
  
  // 本地状态管理偏好设置
  const [preferences, setPreferences] = useState({
    hideCheckinNotes: user?.preferences?.hideCheckinNotes || false,
    hideTodoNotes: user?.preferences?.hideTodoNotes || false,
    hideGoalNotes: user?.preferences?.hideGoalNotes || false,
  })
  
  // 更新偏好设置
  const updatePreference = async (key: string, value: boolean) => {
    try {
      const newPreferences = { ...preferences, [key]: value }
      setPreferences(newPreferences)
      
      const result = await updateUser({ preferences: newPreferences })
      if (result.success) {
        toast({ title: "设置已保存" })
      } else {
        // 如果更新失败，回滚状态
        setPreferences(preferences)
        toast({ title: "保存失败", description: result.error, variant: "destructive" })
      }
    } catch (error) {
      // 如果更新失败，回滚状态
      setPreferences(preferences)
      toast({ title: "保存失败", description: "网络错误", variant: "destructive" })
    }
  }

  // 退出登录
  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    toast({ title: "已退出登录" })
    router.push('/auth')
  }

  // 移除了计算完成率的函数，不再需要这些计算

  return (
    <TabsContent value="profile" className="h-full m-0 p-4 overflow-y-auto scrollable-area">
      <div className="space-y-6">
        {/* 用户信息卡片 */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={user?.avatar} alt={user?.username} />
                <AvatarFallback className="text-lg">
                  {user?.username?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h2 className="text-xl font-semibold">{user?.username || '用户'}</h2>
                <p className="text-muted-foreground">{user?.email || '暂无邮箱'}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  加入时间: {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '未知'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 数据统计卡片 */}
        <Card className="-mt-2">
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
                {/* 笔记统计 */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950">
                  <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900">
                    <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">笔记</div>
                  </div>
                </div>

                {/* 日程统计 */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950">
                  <div className="p-2 rounded-full bg-green-100 dark:bg-green-900">
                    <Calendar className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">日程</div>
                  </div>
                </div>

                {/* 待办统计 */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-orange-50 dark:bg-orange-950">
                  <div className="p-2 rounded-full bg-orange-100 dark:bg-orange-900">
                    <CheckSquare className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">待办</div>
                  </div>
                </div>

                {/* 目标统计 */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-purple-50 dark:bg-purple-950">
                  <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900">
                    <Target className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">目标</div>
                  </div>
                </div>
              </div>
          </CardContent>
        </Card>

        {/* 设置选项 */}
        <Card className="-mt-2">
          <CardHeader>
            <CardTitle className="text-lg">个人设置</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* 主页笔记显示设置 */}
            <div className="space-y-3">
              <div className="text-sm font-medium text-muted-foreground">主页笔记显示</div>
              
              {/* 隐藏打卡笔记 */}
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <Target className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="font-medium">隐藏打卡笔记</div>
                    <div className="text-sm text-muted-foreground">
                      在主页上不显示打卡相关的笔记
                    </div>
                  </div>
                </div>
                <Switch
                  checked={preferences.hideCheckinNotes}
                  onCheckedChange={(checked) => updatePreference('hideCheckinNotes', checked)}
                />
              </div>
              
              {/* 隐藏待办笔记 */}
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <CheckSquare className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="font-medium">隐藏待办笔记</div>
                    <div className="text-sm text-muted-foreground">
                      在主页上不显示待办相关的笔记
                    </div>
                  </div>
                </div>
                <Switch
                  checked={preferences.hideTodoNotes}
                  onCheckedChange={(checked) => updatePreference('hideTodoNotes', checked)}
                />
              </div>
              
              {/* 隐藏目标笔记 */}
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <Target className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="font-medium">隐藏目标笔记</div>
                    <div className="text-sm text-muted-foreground">
                      在主页上不显示目标相关的笔记
                    </div>
                  </div>
                </div>
                <Switch
                  checked={preferences.hideGoalNotes}
                  onCheckedChange={(checked) => updatePreference('hideGoalNotes', checked)}
                />
              </div>
            </div>
            
            <div className="border-t pt-3">
              {/* 主题切换 */}
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  {theme === 'dark' ? (
                    <Moon className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <Sun className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div>
                    <div className="font-medium">主题模式</div>
                    <div className="text-sm text-muted-foreground">
                      当前: {theme === 'dark' ? '深色模式' : '浅色模式'}
                    </div>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={toggleTheme}>
                  切换
                </Button>
              </div>
            </div>

            {/* 退出登录 */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-red-200 dark:border-red-800">
              <div className="flex items-center gap-3">
                <LogOut className="h-5 w-5 text-red-500" />
                <div>
                  <div className="font-medium text-red-600 dark:text-red-400">退出登录</div>
                  <div className="text-sm text-muted-foreground">
                    退出当前账户
                  </div>
                </div>
              </div>
              <Button variant="destructive" size="sm" onClick={handleLogout}>
                退出
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 应用信息 */}
        <Card className="-mt-2">
          <CardContent className="p-4 text-center text-sm text-muted-foreground">
            <div>笔记应用 v1.0.0</div>
            <div className="mt-1">© 2024 All rights reserved</div>
          </CardContent>
        </Card>
      </div>
    </TabsContent>
  )
}