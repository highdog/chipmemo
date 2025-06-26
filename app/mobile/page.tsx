"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Head from "next/head"
import { useAuth } from "@/lib/auth-context"
import { useTheme } from "next-themes"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { 
  FileText, 
  Calendar as CalendarIcon, 
  CheckSquare, 
  Target, 
  User
} from "lucide-react"
import { Toaster } from "@/components/ui/toaster"
import { NotesTab } from "@/components/mobile/notes-tab"
import { ScheduleTab } from "@/components/mobile/schedule-tab"
import { TodoTab } from "@/components/mobile/todo-tab"
import { GoalsTab } from "@/components/mobile/goals-tab"
import { ProfileTab } from "@/components/mobile/profile-tab"

export default function MobilePage() {
  const { user, logout, loading } = useAuth()
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("notes")

  // 主题切换函数
  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  // 检查用户认证
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])



  // 如果正在加载认证状态，显示加载界面
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <div className="flex items-center justify-center min-h-screen">加载中...</div>
  }

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      </Head>
      <div className="flex flex-col h-screen bg-background mobile-container">
        {/* 主内容区域 */}
        <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          {/* Tab内容 */}
          <div className="flex-1 overflow-hidden">
            <TabsContent value="notes" className="h-full m-0">
              <NotesTab user={user} theme={theme} />
            </TabsContent>

            <TabsContent value="schedule" className="h-full m-0">
              <ScheduleTab user={user} theme={theme} />
            </TabsContent>

            <TabsContent value="todo" className="h-full m-0">
              <TodoTab user={user} theme={theme} />
            </TabsContent>

            <TabsContent value="goals" className="h-full m-0">
              <GoalsTab user={user} theme={theme} />
            </TabsContent>

            <TabsContent value="profile" className="h-full m-0">
          <ProfileTab user={user} theme={theme || 'light'} toggleTheme={toggleTheme} logout={logout} />
        </TabsContent>
          </div>

          {/* 底部Tab导航 */}
          <TabsList className="grid w-full grid-cols-5 h-16 bg-background border-t">
            <TabsTrigger value="notes" className="flex flex-col gap-1 h-full">
              <FileText className="h-5 w-5" />
              <span className="text-xs">笔记</span>
            </TabsTrigger>
            <TabsTrigger value="schedule" className="flex flex-col gap-1 h-full">
              <CalendarIcon className="h-5 w-5" />
              <span className="text-xs">日程</span>
            </TabsTrigger>
            <TabsTrigger value="todo" className="flex flex-col gap-1 h-full">
              <CheckSquare className="h-5 w-5" />
              <span className="text-xs">待办</span>
            </TabsTrigger>
            <TabsTrigger value="goals" className="flex flex-col gap-1 h-full">
              <Target className="h-5 w-5" />
              <span className="text-xs">目标</span>
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex flex-col gap-1 h-full">
              <User className="h-5 w-5" />
              <span className="text-xs">我的</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
        </div>

        <Toaster />
      </div>
    </>
  )
}