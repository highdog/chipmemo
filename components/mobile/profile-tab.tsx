"use client"

import React, { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { TabsContent } from "@/components/ui/tabs"
import { User, FileText, Calendar, CheckSquare, Target, Moon, Sun, LogOut, Settings } from "lucide-react"
import { useRouter } from "next/navigation"
import { notesApi, schedulesApi, todosApi, tagContentsApi } from "@/lib/api"
import { ProfileTabProps } from "./types"
import { toast as showToast } from "@/components/ui/use-toast"

interface UserStats {
  notesCount: number
  schedulesCount: number
  todosCount: number
  completedTodosCount: number
  goalsCount: number
  completedGoalsCount: number
}

export function ProfileTab({ user, theme, toggleTheme, logout }: ProfileTabProps) {
  const toast = showToast
  const router = useRouter()
  const [stats, setStats] = useState<UserStats>({
    notesCount: 0,
    schedulesCount: 0,
    todosCount: 0,
    completedTodosCount: 0,
    goalsCount: 0,
    completedGoalsCount: 0
  })
  const [isLoading, setIsLoading] = useState(true)

  // 加载用户统计数据
  const loadUserStats = useCallback(async () => {
    if (!user) return
    
    setIsLoading(true)
    try {
      const [notesRes, schedulesRes, todosRes, goalsRes] = await Promise.all([
      notesApi.getAll().catch(() => ({ data: [] })),
      schedulesApi.getAll().catch(() => ({ data: [] })),
      todosApi.getAll().catch(() => ({ data: [] })),
      tagContentsApi.getAll().catch(() => ({ data: [] }))
    ])

      // 处理笔记数据
      const notesData = Array.isArray(notesRes.data) ? notesRes.data : 
        (notesRes.data && typeof notesRes.data === 'object' ? Object.values(notesRes.data).flat() : [])
      
      // 处理日程数据
      const schedulesData = Array.isArray(schedulesRes.data) ? schedulesRes.data : 
        (schedulesRes.data && typeof schedulesRes.data === 'object' ? Object.values(schedulesRes.data).flat() : [])
      
      // 处理待办数据
      const todosData = Array.isArray(todosRes.data) ? todosRes.data : 
        (todosRes.data && typeof todosRes.data === 'object' ? Object.values(todosRes.data).flat() : [])
      const completedTodos = todosData.filter((todo: any) => todo.completed)
      
      // 处理目标数据
    const goalsData = Array.isArray(goalsRes.data) ? goalsRes.data :
      (goalsRes.data && typeof goalsRes.data === 'object' ? Object.values(goalsRes.data).flat() : [])
    const enabledGoals = goalsData.filter((item: any) => item.isGoalEnabled)
    const completedGoals = enabledGoals.filter((item: any) => (item.currentCount || 0) >= (item.targetCount || 1))

      setStats({
        notesCount: notesData.length,
        schedulesCount: schedulesData.length,
        todosCount: todosData.length,
        completedTodosCount: completedTodos.length,
        goalsCount: enabledGoals.length,
        completedGoalsCount: completedGoals.length
      })
    } catch (error) {
      console.error('Error loading user stats:', error)
      toast({ title: "加载统计数据失败", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }, [user, toast])

  useEffect(() => {
    loadUserStats()
  }, [loadUserStats])

  // 退出登录
  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    toast({ title: "已退出登录" })
    router.push('/auth')
  }

  // 计算完成率
  const getTodoCompletionRate = () => {
    if (stats.todosCount === 0) return 0
    return Math.round((stats.completedTodosCount / stats.todosCount) * 100)
  }

  const getGoalCompletionRate = () => {
    if (stats.goalsCount === 0) return 0
    return Math.round((stats.completedGoalsCount / stats.goalsCount) * 100)
  }

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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              数据统计
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center text-muted-foreground py-4">
                加载中...
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {/* 笔记统计 */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950">
                  <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900">
                    <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <div className="text-lg font-semibold">{stats.notesCount}</div>
                    <div className="text-xs text-muted-foreground">笔记</div>
                  </div>
                </div>

                {/* 日程统计 */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950">
                  <div className="p-2 rounded-full bg-green-100 dark:bg-green-900">
                    <Calendar className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <div className="text-lg font-semibold">{stats.schedulesCount}</div>
                    <div className="text-xs text-muted-foreground">日程</div>
                  </div>
                </div>

                {/* 待办统计 */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-orange-50 dark:bg-orange-950">
                  <div className="p-2 rounded-full bg-orange-100 dark:bg-orange-900">
                    <CheckSquare className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <div className="text-lg font-semibold">
                      {stats.completedTodosCount}/{stats.todosCount}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      待办 ({getTodoCompletionRate()}%)
                    </div>
                  </div>
                </div>

                {/* 目标统计 */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-purple-50 dark:bg-purple-950">
                  <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900">
                    <Target className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <div className="text-lg font-semibold">
                      {stats.completedGoalsCount}/{stats.goalsCount}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      目标 ({getGoalCompletionRate()}%)
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 设置选项 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              设置
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
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
        <Card>
          <CardContent className="p-4 text-center text-sm text-muted-foreground">
            <div>笔记应用 v1.0.0</div>
            <div className="mt-1">© 2024 All rights reserved</div>
          </CardContent>
        </Card>
      </div>
    </TabsContent>
  )
}