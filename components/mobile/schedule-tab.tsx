"use client"

import React, { useState, useEffect, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TabsContent } from "@/components/ui/tabs"
import { Plus, Clock } from "lucide-react"
import { schedulesApi } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Schedule, ScheduleTabProps } from "./types"
import { toast as showToast } from "@/components/ui/use-toast"
import { startOfDay, differenceInDays, isToday } from "date-fns"

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
      const response = await schedulesApi.getAll({})
      
      if (response.success && response.data) {
        const allSchedules: Schedule[] = []
        
        // 遍历所有日期的日程，与网页端保持一致的数据处理方式
        Object.entries(response.data).forEach(([dateKey, schedules]) => {
          const daySchedules = schedules as any[]
          
          daySchedules.forEach(schedule => {
             allSchedules.push({
               _id: schedule._id || schedule.id,
               title: schedule.title,
               time: schedule.time,
               description: schedule.description,
               type: schedule.type,
               date: dateKey, // 使用dateKey作为日期，确保准确性
               userId: schedule.userId || user?._id || '',
               createdAt: schedule.createdAt || new Date().toISOString(),
               updatedAt: schedule.updatedAt || new Date().toISOString()
             })
           })
        })
        
        setSchedules(allSchedules)
      } else {
        setSchedules([])
      }
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
    const today = startOfDay(new Date())
    const todayStr = today.toISOString().split('T')[0]
    
    return schedules
      .filter(schedule => schedule.date >= todayStr) // 只显示今天及以后的日程
      .map(schedule => {
        // 使用date-fns库准确计算日期差，与网页端保持一致
        const scheduleDate = startOfDay(new Date(schedule.date))
        const daysLeft = differenceInDays(scheduleDate, today)
        const isScheduleToday = isToday(scheduleDate)
        
        let displayDate: string
        if (isScheduleToday) {
          displayDate = '今天'
        } else if (daysLeft === 1) {
          displayDate = '明天'
        } else if (daysLeft > 0) {
          displayDate = `还剩${daysLeft}天`
        } else {
          displayDate = '今天'
        }
        
        return {
          ...schedule,
          daysLeft,
          displayDate,
          isToday: isScheduleToday
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
        <div className="flex justify-center">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && setSelectedDate(date)}
            className=""
          />
        </div>

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
        {upcomingSchedules.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            暂无即将到来的日程
          </div>
        ) : (
          <div className="space-y-4">
            {upcomingSchedules.map((schedule) => (
              <div key={schedule._id} className="cursor-pointer">
                {/* 日程头部 - 时间在左边，还剩几天在右边 */}
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs text-muted-foreground">
                    {schedule.time}
                  </div>
                  <div className="flex items-center gap-2">
                    {/* 还剩几天标签 */}
                    <Badge 
                      variant="secondary" 
                      className={cn(
                        "text-xs",
                        schedule.isToday
                          ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                          : schedule.daysLeft <= 3
                            ? "bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300"
                            : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                      )}
                    >
                      {schedule.displayDate}
                    </Badge>
                  </div>
                </div>
                
                {/* 日程内容 */}
                <div className="mb-3">
                  <div className="text-sm leading-relaxed whitespace-pre-wrap break-words font-medium">
                    {schedule.title}
                  </div>
                  {schedule.description && (
                    <div className="text-sm text-muted-foreground mt-1 leading-relaxed whitespace-pre-wrap break-words">
                      {schedule.description}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </TabsContent>
  )
}