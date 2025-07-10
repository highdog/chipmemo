"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { toast } from "@/hooks/use-toast"
import { ArrowLeft, Target, CheckSquare, FileText } from "lucide-react"
import { Toaster } from "@/components/ui/toaster"

export default function SettingsPage() {
  const router = useRouter()
  const { user, updateUser, loading: authLoading, isAuthenticated } = useAuth()
  
  // 本地状态管理偏好设置
  const [preferences, setPreferences] = useState({
    hideCheckinNotes: false,
    hideTodoNotes: false,
    hideGoalNotes: false,
  })
  
  // 初始化偏好设置
  useEffect(() => {
    if (user?.preferences) {
      setPreferences({
        hideCheckinNotes: user.preferences.hideCheckinNotes || false,
        hideTodoNotes: user.preferences.hideTodoNotes || false,
        hideGoalNotes: user.preferences.hideGoalNotes || false,
      })
    }
  }, [user])
  
  // 检查认证状态
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [authLoading, isAuthenticated, router])
  
  // 更新偏好设置
  const updatePreference = async (key: string, value: boolean) => {
    try {
      const newPreferences = { ...preferences, [key]: value }
      setPreferences(newPreferences)
      
      const result = await updateUser({ preferences: newPreferences })
      if (result.success) {
        toast({ 
          title: "设置已保存",
          description: "您的偏好设置已成功更新"
        })
      } else {
        // 如果更新失败，回滚状态
        setPreferences(preferences)
        toast({ 
          title: "保存失败", 
          description: result.error, 
          variant: "destructive" 
        })
      }
    } catch (error) {
      // 如果更新失败，回滚状态
      setPreferences(preferences)
      toast({ 
        title: "保存失败", 
        description: "网络错误，请稍后重试", 
        variant: "destructive" 
      })
    }
  }
  
  // 如果正在检查认证状态，显示加载界面
  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">正在验证登录状态...</p>
        </div>
      </div>
    )
  }
  
  // 如果未登录，不渲染主界面
  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <Toaster />
      
      {/* 顶部导航 */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto py-4 px-4 max-w-4xl">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => router.back()}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              返回
            </Button>
            <h1 className="text-2xl font-bold">个人设置</h1>
          </div>
        </div>
      </header>
      
      {/* 主内容 */}
      <main className="container mx-auto py-8 px-4 max-w-4xl">
        <div className="space-y-6">
          {/* 用户信息卡片 */}
          <Card>
            <CardHeader>
              <CardTitle>用户信息</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">用户名:</span>
                  <span className="font-medium">{user?.username || '未知'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">邮箱:</span>
                  <span className="font-medium">{user?.email || '暂无邮箱'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">加入时间:</span>
                  <span className="font-medium">
                    {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '未知'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* 笔记显示设置 */}
          <Card>
            <CardHeader>
              <CardTitle>主页笔记显示设置</CardTitle>
              <p className="text-sm text-muted-foreground">
                控制在主页上显示哪些类型的笔记。隐藏的笔记仍可通过搜索功能找到。
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 隐藏打卡笔记 */}
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900">
                    <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <div className="font-medium">隐藏打卡笔记</div>
                    <div className="text-sm text-muted-foreground">
                      在主页上不显示包含 #打卡 标签的笔记
                    </div>
                  </div>
                </div>
                <Switch
                  checked={preferences.hideCheckinNotes}
                  onCheckedChange={(checked) => updatePreference('hideCheckinNotes', checked)}
                />
              </div>
              
              {/* 隐藏待办笔记 */}
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-orange-100 dark:bg-orange-900">
                    <CheckSquare className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <div className="font-medium">隐藏待办笔记</div>
                    <div className="text-sm text-muted-foreground">
                      在主页上不显示包含 #todo 标签的笔记
                    </div>
                  </div>
                </div>
                <Switch
                  checked={preferences.hideTodoNotes}
                  onCheckedChange={(checked) => updatePreference('hideTodoNotes', checked)}
                />
              </div>
              
              {/* 隐藏目标笔记 */}
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900">
                    <Target className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <div className="font-medium">隐藏目标笔记</div>
                    <div className="text-sm text-muted-foreground">
                      在主页上不显示包含 #目标 标签的笔记
                    </div>
                  </div>
                </div>
                <Switch
                  checked={preferences.hideGoalNotes}
                  onCheckedChange={(checked) => updatePreference('hideGoalNotes', checked)}
                />
              </div>
            </CardContent>
          </Card>
          
          {/* 说明信息 */}
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground space-y-2">
                <p><strong>注意事项：</strong></p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>这些设置只影响主页的笔记显示，不会删除您的笔记</li>
                  <li>隐藏的笔记仍可通过搜索功能或标签页面访问</li>
                  <li>设置会实时生效，无需刷新页面</li>
                  <li>您的偏好设置会自动保存到云端</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}