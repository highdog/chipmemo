"use client"

import React, { useState, useEffect, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TabsContent } from "@/components/ui/tabs"
import { Plus, Clock } from "lucide-react"
import { schedulesApi } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Schedule, ScheduleTabProps } from "./types"
import { toast as showToast } from "@/components/ui/use-toast"

export function ScheduleTab({ user }: ScheduleTabProps) {
  const toast = showToast
  // 日程相关状态
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [newSchedule, setNewSchedule] = useState({ title: "", time: "", description: "" })
  const [isAddingSchedule, setIsAddingSchedule] = useState(false)
  const [showScheduleInput, setShowScheduleInput] = useState(false)

  // 加载日程数据
  const loadSchedules = useCallback(async () => {
    try {
      const response = await schedulesApi.getAll()
      // 转换数据格式以匹配Schedule类型
      const schedulesData = Array.isArray(response.data) ? response.data : 
        (response.data && typeof response.data === 'object' ? Object.values(response.data).flat() : [])
      const schedules = schedulesData.map((item: any) => ({
        _id: item._id || item.id,
        id: item.id,
        title: item.title,
        time: item.time,
        description: item.description,
        type: item.type,
        date: item.date || new Date().toISOString().split('T')[0],
        userId: item.userId || user?.id || '',
        createdAt: item.createdAt || new Date().toISOString(),
        updatedAt: item.updatedAt || new Date().toISOString()
      }))
      setSchedules(schedules)
    } catch (error) {
      console.error('Error loading schedules:', error)
      toast({ title: "加载日程失败", variant: "destructive" })
    }
  }, [user, toast])

  useEffect(() => {
    if (user) {
      loadSchedules()
    }
  }, [user, loadSchedules])

  // 计算即将到来的日程
  const upcomingSchedules = useMemo(() => {
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    
    return schedules
      .filter(schedule => schedule.date >= todayStr) // 只显示今天及以后的日程
      .map(schedule => {
        const scheduleDate = new Date(schedule.date)
        const diffTime = scheduleDate.getTime() - today.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        
        let displayDate: string
        if (diffDays === 0) {
          displayDate = '今天'
        } else if (diffDays === 1) {
          displayDate = '明天'
        } else {
          displayDate = `还剩${diffDays}天`
        }
        
        return {
          ...schedule,
          daysLeft: diffDays,
          displayDate,
          isToday: diffDays === 0
        }
      })
      .sort((a, b) => {
        // 今天的日程优先
        if (a.isToday && !b.isToday) return -1
        if (!a.isToday && b.isToday) return 1
        
        // 按剩余天数排序
        if (a.daysLeft !== b.daysLeft) {
          return a.daysLeft - b.daysLeft
        }
        
        // 剩余天数相同，按时间排序
        return a.time.localeCompare(b.time)
      })
  }, [schedules])

  // 添加日程
  const handleAddSchedule = async () => {
    if (!newSchedule.title.trim() || !newSchedule.time.trim()) return
    
    setIsAddingSchedule(true)
    try {
      await schedulesApi.create({
        title: newSchedule.title,
        time: newSchedule.time,
        date: selectedDate.toISOString().split('T')[0],
        description: newSchedule.description
      })
      setNewSchedule({ title: "", time: "", description: "" })
      setShowScheduleInput(false)
      await loadSchedules()
      toast({ title: "日程添加成功" })
    } catch (error) {
      console.error('Error adding schedule:', error)
      toast({ title: "添加日程失败", variant: "destructive" })
    } finally {
      setIsAddingSchedule(false)
    }
  }

  return (
    <TabsContent value="schedule" className="h-full m-0 p-4 overflow-y-auto">
      <div className="space-y-4">
        {/* 顶部操作栏 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-medium">我的日程</h2>
            <span className="text-sm text-muted-foreground">({schedules.length})</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowScheduleInput(!showScheduleInput)}
            className="shrink-0"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* 日历选择器 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">选择日期</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              className="rounded-md border"
            />
          </CardContent>
        </Card>

        {/* 添加日程输入区域 */}
        {showScheduleInput && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">添加日程</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="日程标题"
                value={newSchedule.title}
                onChange={(e) => setNewSchedule(prev => ({ ...prev, title: e.target.value }))}
              />
              <Input
                type="time"
                value={newSchedule.time}
                onChange={(e) => setNewSchedule(prev => ({ ...prev, time: e.target.value }))}
              />
              <Textarea
                placeholder="描述（可选）"
                value={newSchedule.description}
                onChange={(e) => setNewSchedule(prev => ({ ...prev, description: e.target.value }))}
                className="min-h-[80px]"
              />
              <div className="flex gap-2">
                <Button 
                  onClick={handleAddSchedule} 
                  disabled={isAddingSchedule || !newSchedule.title.trim() || !newSchedule.time.trim()}
                  className="flex-1"
                >
                  {isAddingSchedule ? "添加中..." : "添加日程"}
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setShowScheduleInput(false)
                    setNewSchedule({ title: "", time: "", description: "" })
                  }}
                >
                  取消
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 即将到来的日程 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">即将到来的日程</CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingSchedules.length === 0 ? (
              <div className="text-center text-muted-foreground py-4">
                暂无即将到来的日程
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingSchedules.map((schedule) => (
                  <div key={schedule._id} className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border",
                    schedule.isToday 
                      ? "bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800" 
                      : schedule.daysLeft <= 3 
                        ? "bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800"
                        : "bg-muted/30 border-border"
                  )}>
                    <Clock className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-medium">{schedule.title}</div>
                        <div className={cn(
                          "text-xs px-2 py-1 rounded-full",
                          schedule.isToday
                            ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                            : schedule.daysLeft <= 3
                              ? "bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300"
                              : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                        )}>
                          {schedule.displayDate}
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">{schedule.time}</div>
                      {schedule.description && (
                        <div className="text-sm text-muted-foreground mt-1">
                          {schedule.description}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </TabsContent>
  )
}