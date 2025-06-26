"use client"

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TabsContent } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus, Clock } from "lucide-react"
import { schedulesApi } from "@/lib/api"
import { cn } from "@/lib/utils"
import { Schedule, ScheduleTabProps } from "./types"
import { toast as showToast } from "@/components/ui/use-toast"
import { startOfDay, differenceInDays, isToday, format, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns"

export function ScheduleTab({ user, activeTab }: ScheduleTabProps) {
  const toast = showToast
  // 日程相关状态
  const [schedules, setSchedules] = useState<Schedule[]>([])  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [newSchedule, setNewSchedule] = useState({ title: "", time: "", date: "" })
  const [isAddingSchedule, setIsAddingSchedule] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // 初始化日期为今天
  useEffect(() => {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    const todayStr = `${year}-${month}-${day}`
    setNewSchedule(prev => ({ ...prev, date: todayStr }))
  }, [])

  // 滚动到指定日期的日程
  const scrollToDateSchedule = useCallback((date: Date) => {
    // 使用本地时间格式化日期，避免时区问题
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const dateStr = `${year}-${month}-${day}`
    
    // 检查该日期是否有日程
    const hasScheduleOnDate = schedules.some(schedule => schedule.date === dateStr)
    
    let targetDateStr = dateStr
    
    // 如果当前日期没有日程，找到该日期之后最近的有日程的日期
    if (!hasScheduleOnDate) {
      const clickedDate = new Date(date)
      const futureSchedules = schedules
        .filter(schedule => {
          const scheduleDate = new Date(schedule.date + 'T00:00:00')
          return scheduleDate > clickedDate
        })
        .sort((a, b) => new Date(a.date + 'T00:00:00').getTime() - new Date(b.date + 'T00:00:00').getTime())
      
      if (futureSchedules.length > 0) {
        targetDateStr = futureSchedules[0].date
      } else {
        // 如果没有找到未来的日程，则不执行滚动
        return
      }
    }
    
    const scheduleElement = document.querySelector(`[data-schedule-date="${targetDateStr}"]`)
    
    if (scheduleElement && scrollContainerRef.current) {
      const containerRect = scrollContainerRef.current.getBoundingClientRect()
      const elementRect = scheduleElement.getBoundingClientRect()
      const scrollTop = scrollContainerRef.current.scrollTop
      
      // 计算目标滚动位置，使日程显示在容器顶部
      const targetScrollTop = scrollTop + elementRect.top - containerRect.top
      
      scrollContainerRef.current.scrollTo({
        top: targetScrollTop,
        behavior: 'smooth'
      })
    }
  }, [schedules])

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

  // 当切换到日程tab时，自动定位到当天或下一个有日程的日期
  useEffect(() => {
    if (activeTab === 'schedule' && schedules.length > 0) {
      const today = new Date()
      scrollToDateSchedule(today)
    }
  }, [activeTab, schedules, scrollToDateSchedule])

  // 计算三个月日程（上个月、当月、下个月）
  const currentMonthSchedules = useMemo(() => {
    const currentMonth = selectedDate
    const prevMonth = subMonths(currentMonth, 1)
    const nextMonth = addMonths(currentMonth, 1)
    
    // 计算三个月的日期范围
    const startDate = startOfMonth(prevMonth)
    const endDate = endOfMonth(nextMonth)
    
    return schedules
      .filter(schedule => {
        const scheduleDate = new Date(schedule.date)
        return scheduleDate >= startDate && scheduleDate <= endDate
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
    if (!newSchedule.title.trim() || !newSchedule.time.trim() || !newSchedule.date.trim()) return
    
    setIsAddingSchedule(true)
    try {
      await schedulesApi.create({
        title: newSchedule.title,
        time: newSchedule.time,
        date: newSchedule.date,
        description: ""
      })
      setNewSchedule({ title: "", time: "", date: "" })
      setIsDialogOpen(false)
      await loadSchedules()
      toast({
        title: "日程添加成功",
        description: `已添加日程：${newSchedule.title}`,
      })
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
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md fixed top-36 left-1/2 transform -translate-x-1/2">
              <DialogHeader>
                <DialogTitle>添加日程</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                 <Input
                   placeholder="日程标题"
                   value={newSchedule.title}
                   onChange={(e) => setNewSchedule(prev => ({ ...prev, title: e.target.value }))}
                   autoFocus
                 />
                 <Input
                   type="date"
                   value={newSchedule.date}
                   onChange={(e) => setNewSchedule(prev => ({ ...prev, date: e.target.value }))}
                 />
                 <Input
                   type="time"
                   value={newSchedule.time}
                   onChange={(e) => setNewSchedule(prev => ({ ...prev, time: e.target.value }))}
                 />
                 <div className="flex gap-2">
                   <Button 
                     onClick={handleAddSchedule} 
                     disabled={isAddingSchedule || !newSchedule.title.trim() || !newSchedule.time.trim() || !newSchedule.date.trim()}
                     className="flex-1"
                   >
                     {isAddingSchedule ? "添加中..." : "添加"}
                   </Button>
                   <Button 
                     variant="outline"
                     onClick={() => {
                       setIsDialogOpen(false)
                       // 重置表单但保持今天日期
                       const today = new Date()
                       const year = today.getFullYear()
                       const month = String(today.getMonth() + 1).padStart(2, '0')
                       const day = String(today.getDate()).padStart(2, '0')
                       const todayStr = `${year}-${month}-${day}`
                       setNewSchedule({ title: "", time: "", date: todayStr })
                     }}
                   >
                     取消
                   </Button>
                 </div>
               </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* 日历选择器 - 加宽 */}
        <div className="flex justify-center">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => {
              if (date) {
                setSelectedDate(date)
                scrollToDateSchedule(date)
              }
            }}
            className="w-full max-w-none"
            classNames={{
              head_cell: "text-muted-foreground rounded-md w-12 font-normal text-[0.8rem]",
              cell: "h-8 w-12 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
              day: "h-8 w-12 p-0 font-normal aria-selected:opacity-100 relative hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
            }}
            modifiers={{
               hasSchedule: (date) => {
                 // 使用本地时间格式化日期，避免时区问题
                 const year = date.getFullYear()
                 const month = String(date.getMonth() + 1).padStart(2, '0')
                 const day = String(date.getDate()).padStart(2, '0')
                 const dateStr = `${year}-${month}-${day}`
                 return schedules.some(schedule => schedule.date === dateStr)
               }
             }}
             modifiersClassNames={{
               hasSchedule: "relative after:absolute after:bottom-1 after:left-1/2 after:transform after:-translate-x-1/2 after:w-1 after:h-1 after:bg-blue-500 after:rounded-full after:content-['']"
             }}
          />
        </div>
      </div>

      {/* 可滚动内容区域 */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
        {/* 顶部空白区域 */}
        <div className="h-32"></div>
        
        <div className="px-4 space-y-4">
          {/* 三个月日程 */}
          {currentMonthSchedules.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              近三个月暂无日程
            </div>
          ) : (
            <div>
              {currentMonthSchedules.map((schedule, index) => (
                <div key={schedule._id} className="py-3" data-schedule-date={schedule.date}>
                  {/* 日程头部 - 时间在左边，还剩几天在右边 */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(schedule.date), 'MM/dd')} {schedule.time}
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
                  
                  {/* 分割线 - 最后一个日程不显示分割线 */}
                  {index < currentMonthSchedules.length - 1 && (
                    <div className="border-b border-border/50 mt-3" />
                  )}
                </div>
              ))}
            </div>
          )}
          
          {/* 底部空白区域 */}
           <div className="h-32"></div>
        </div>
      </div>
    </TabsContent>
  )
}