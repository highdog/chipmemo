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

  // 计算当月日程
  const currentMonthSchedules = useMemo(() => {
    const currentMonth = selectedDate.getMonth()
    const currentYear = selectedDate.getFullYear()
    
    return schedules
      .filter(schedule => {
        const scheduleDate = new Date(schedule.date)
        return scheduleDate.getMonth() === currentMonth && scheduleDate.getFullYear() === currentYear
      })
      .map(schedule => {
        const scheduleDate = startOfDay(new Date(schedule.date))
        const today = startOfDay(new Date())
        const daysLeft = differenceInDays(scheduleDate, today)
        const scheduleIsToday = isToday(scheduleDate)
        
        let displayDate: string
        if (scheduleIsToday) {
          displayDate = "今天"
        } else if (daysLeft === 1) {
          displayDate = "明天"
        } else if (daysLeft === -1) {
          displayDate = "昨天"
        } else if (daysLeft > 0) {
          displayDate = `还剩${daysLeft}天`
        } else if (daysLeft < 0) {
          displayDate = `${Math.abs(daysLeft)}天前`
        } else {
          displayDate = "今天"
        }
        
        return {
          ...schedule,
          daysLeft,
          isToday: scheduleIsToday,
          displayDate
        }
      })
      .sort((a, b) => {
        // 按日期排序
        const dateA = new Date(a.date)
        const dateB = new Date(b.date)
        if (dateA.getTime() !== dateB.getTime()) {
          return dateA.getTime() - dateB.getTime()
        }
        
        // 同一天按时间排序
        return a.time.localeCompare(b.time)
      })
  }, [schedules, selectedDate])

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
    <TabsContent value="schedule" className="h-full m-0 flex flex-col">
      {/* 固定顶部区域 */}
      <div className="flex-shrink-0 p-4 space-y-4 border-b">
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

        {/* 日历选择器 - 加宽 */}
        <div className="flex justify-center">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && setSelectedDate(date)}
            className="w-full max-w-none"
          />
        </div>
      </div>

      {/* 可滚动内容区域 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
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

        {/* 当月日程 */}
        {currentMonthSchedules.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            本月暂无日程
          </div>
        ) : (
          <div className="space-y-4">
            {currentMonthSchedules.map((schedule) => (
              <Card key={schedule._id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  {/* 日程头部 - 时间在左边，还剩几天在右边 */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
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
                            : schedule.daysLeft <= 3 && schedule.daysLeft >= 0
                              ? "bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300"
                              : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                        )}
                      >
                        {schedule.displayDate}
                      </Badge>
                    </div>
                  </div>
                  
                  {/* 日程内容 */}
                  <div>
                    <div className="text-sm leading-relaxed whitespace-pre-wrap break-words font-medium">
                      {schedule.title}
                    </div>
                    {schedule.description && (
                      <div className="text-sm text-muted-foreground mt-1 leading-relaxed whitespace-pre-wrap break-words">
                        {schedule.description}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </TabsContent>
  )
}