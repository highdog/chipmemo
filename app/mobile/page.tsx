"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Head from "next/head"
import { useAuth } from "@/lib/auth-context"
import { useTheme } from "next-themes"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { 
  FileText, 
  Calendar as CalendarIcon, 
  CheckSquare, 
  Target, 
  User,
  Plus
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
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [triggerNoteAdd, setTriggerNoteAdd] = useState(false)
  const [triggerScheduleAdd, setTriggerScheduleAdd] = useState(false)
  const [triggerTodoAdd, setTriggerTodoAdd] = useState(false)

  // 主题切换函数
  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  // 处理添加选项
  const handleAddOption = (type: 'note' | 'schedule' | 'todo') => {
    setShowAddDialog(false)
    // 根据类型切换到对应的tab并触发添加操作
    switch (type) {
      case 'note':
        setActiveTab('notes')
        setTriggerNoteAdd(true)
        break
      case 'schedule':
        setActiveTab('schedule')
        setTriggerScheduleAdd(true)
        break
      case 'todo':
        setActiveTab('todo')
        setTriggerTodoAdd(true)
        break
    }
  }

  // 重置触发状态的回调函数
  const handleNoteAddTriggered = () => setTriggerNoteAdd(false)
  const handleScheduleAddTriggered = () => setTriggerScheduleAdd(false)
  const handleTodoAddTriggered = () => setTriggerTodoAdd(false)

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
              <NotesTab 
                user={user} 
                theme={theme}
                triggerAdd={triggerNoteAdd}
                onAddTriggered={handleNoteAddTriggered}
              />
            </TabsContent>

            <TabsContent value="schedule" className="h-full m-0">
              <ScheduleTab 
                user={user} 
                theme={theme}
                activeTab={activeTab}
                triggerAdd={triggerScheduleAdd}
                onAddTriggered={handleScheduleAddTriggered}
              />
            </TabsContent>

            <TabsContent value="todo" className="h-full m-0">
              <TodoTab 
                user={user}
                theme={theme}
                triggerAdd={triggerTodoAdd}
                onAddTriggered={handleTodoAddTriggered}
              />
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

        {/* 浮动添加按钮 */}
        <div className="fixed bottom-20 right-4 z-50">
          <Button
            size="lg"
            className="h-14 w-14 rounded-full shadow-lg bg-black hover:bg-gray-800 text-white border-0"
            onClick={() => setShowAddDialog(true)}
          >
            <Plus className="h-6 w-6" />
          </Button>
        </div>

        {/* 添加选项对话框 */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>选择要添加的内容</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 py-4">
              <Button
                variant="outline"
                className="flex items-center gap-3 h-12 justify-start"
                onClick={() => handleAddOption('note')}
              >
                <FileText className="h-5 w-5 text-blue-600" />
                <span>添加笔记</span>
              </Button>
              <Button
                variant="outline"
                className="flex items-center gap-3 h-12 justify-start"
                onClick={() => handleAddOption('schedule')}
              >
                <CalendarIcon className="h-5 w-5 text-green-600" />
                <span>添加日程</span>
              </Button>
              <Button
                variant="outline"
                className="flex items-center gap-3 h-12 justify-start"
                onClick={() => handleAddOption('todo')}
              >
                <CheckSquare className="h-5 w-5 text-orange-600" />
                <span>添加待办</span>
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Toaster />
      </div>
    </>
  )
}