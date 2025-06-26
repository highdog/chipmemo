'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, X, Check, Calendar, Edit3 } from 'lucide-react'
import { format, differenceInDays, isAfter, isToday, startOfDay, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { schedulesApi } from '@/lib/api'

interface ScheduleItem {
  id: string
  title: string
  time: string
  date: string
  description?: string
  type: 'meeting' | 'appointment' | 'event' | 'reminder'
}

interface IntegratedScheduleItem extends ScheduleItem {
  daysLeft: number
  displayDate: string
  isToday: boolean
}

interface IntegratedScheduleProps {
  selectedDate: Date
}

const IntegratedSchedule: React.FC<IntegratedScheduleProps> = ({ selectedDate }) => {
  const [allSchedules, setAllSchedules] = useState<IntegratedScheduleItem[]>([])
  const [isAdding, setIsAdding] = useState(false)
  const [newSchedule, setNewSchedule] = useState({
    title: '',
    time: '',
    description: '',
    type: 'event' as ScheduleItem['type']
  })
  const [editingSchedule, setEditingSchedule] = useState<IntegratedScheduleItem | null>(null)
  const [loading, setLoading] = useState(true)
  const scheduleListRef = React.useRef<HTMLDivElement>(null)

  // 加载所有日程数据并处理显示逻辑
  useEffect(() => {
    const loadAllSchedules = async () => {
      try {
        setLoading(true)
        const response = await schedulesApi.getAll({})
        
        if (response.success && response.data) {
          const today = startOfDay(new Date())
          const currentMonth = startOfMonth(new Date())
          const lastMonth = startOfMonth(subMonths(new Date(), 1))
          const nextMonth = startOfMonth(addMonths(new Date(), 1))
          const nextMonthEnd = endOfMonth(addMonths(new Date(), 1))
          
          const processedSchedules: IntegratedScheduleItem[] = []
          
          // 遍历所有日期的日程，显示上月、当月、下月的日程
          Object.entries(response.data).forEach(([dateKey, schedules]) => {
            const scheduleDate = startOfDay(new Date(dateKey))
            const daySchedules = schedules as ScheduleItem[]
            
            // 只处理三个月范围内的日程（上月、当月、下月）
            if (scheduleDate >= lastMonth && scheduleDate <= nextMonthEnd) {
              daySchedules.forEach(schedule => {
                const daysLeft = differenceInDays(scheduleDate, today)
                const isScheduleToday = isToday(scheduleDate)
                let displayDate: string
                
                if (isScheduleToday) {
                  displayDate = '今天'
                } else if (daysLeft === 1) {
                  displayDate = '明天'
                } else if (daysLeft === -1) {
                  displayDate = '昨天'
                } else if (daysLeft > 0) {
                  displayDate = `还剩${daysLeft}天`
                } else if (daysLeft < 0) {
                  displayDate = `${Math.abs(daysLeft)}天前`
                } else {
                  displayDate = '今天'
                }
                
                processedSchedules.push({
                  ...schedule,
                  date: dateKey,
                  daysLeft,
                  displayDate,
                  isToday: isScheduleToday
                })
              })
            }
          })
          
          // 排序：按日期排序（从过去到未来），同一天内按时间排序
          processedSchedules.sort((a, b) => {
            // 按日期排序（从过去到未来）
            if (a.daysLeft !== b.daysLeft) {
              return a.daysLeft - b.daysLeft
            }
            
            // 日期相同，按时间排序
            return a.time.localeCompare(b.time)
          })
          
          setAllSchedules(processedSchedules)
        } else {
          setAllSchedules([])
        }
      } catch (error) {
        console.error('加载日程数据失败:', error)
        setAllSchedules([])
      } finally {
        setLoading(false)
      }
    }

    loadAllSchedules()
    
    // 监听日程更新事件
    const handleScheduleUpdate = () => {
      loadAllSchedules()
    }
    
    window.addEventListener('scheduleUpdated', handleScheduleUpdate)
    
    return () => {
      window.removeEventListener('scheduleUpdated', handleScheduleUpdate)
    }
  }, [])

  // 当选中日期变化时，滚动到对应日期的日程
  React.useEffect(() => {
    if (allSchedules.length > 0 && scheduleListRef.current) {
      const selectedDateKey = format(selectedDate, 'yyyy-MM-dd')
      let targetSchedule = allSchedules.find(schedule => schedule.date === selectedDateKey)
      
      // 如果选中日期没有日程，找到下一个有日程的日期
      if (!targetSchedule) {
        const selectedDateTime = startOfDay(selectedDate)
        const futureSchedules = allSchedules.filter(schedule => {
          const scheduleDate = startOfDay(new Date(schedule.date))
          return scheduleDate > selectedDateTime
        })
        
        if (futureSchedules.length > 0) {
          // 按日期排序，找到最近的日程
          futureSchedules.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          targetSchedule = futureSchedules[0]
        }
      }
      
      if (targetSchedule) {
        const targetElement = scheduleListRef.current.querySelector(`[data-schedule-date="${targetSchedule.date}"]`)
        if (targetElement) {
          targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }
    }
  }, [selectedDate, allSchedules])

  const handleAddSchedule = async () => {
    if (!newSchedule.title.trim() || !newSchedule.time.trim()) return

    try {
      const dateKey = format(selectedDate, 'yyyy-MM-dd')
      const response = await schedulesApi.create({
        title: newSchedule.title.trim(),
        time: newSchedule.time,
        date: dateKey,
        description: newSchedule.description.trim() || undefined,
        type: newSchedule.type
      })

      if (response.success && response.data) {
        // 触发自定义事件通知其他组件
        window.dispatchEvent(new CustomEvent('scheduleUpdated'))
        
        setNewSchedule({ title: '', time: '', description: '', type: 'event' })
        setIsAdding(false)
      }
    } catch (error) {
      console.error('添加日程失败:', error)
    }
  }

  const handleDeleteSchedule = async (id: string) => {
    try {
      const response = await schedulesApi.delete(id)
      
      if (response.success) {
        // 触发自定义事件通知其他组件
        window.dispatchEvent(new CustomEvent('scheduleUpdated'))
      }
    } catch (error) {
      console.error('删除日程失败:', error)
    }
  }

  const handleEditSchedule = (schedule: IntegratedScheduleItem) => {
    setEditingSchedule(schedule)
    setNewSchedule({
      title: schedule.title,
      time: schedule.time,
      description: schedule.description || '',
      type: schedule.type
    })
    setIsAdding(false)
  }

  const handleUpdateSchedule = async () => {
    if (!editingSchedule || !newSchedule.title.trim() || !newSchedule.time.trim()) return

    try {
      const response = await schedulesApi.update(editingSchedule.id, {
        title: newSchedule.title.trim(),
        time: newSchedule.time,
        description: newSchedule.description.trim() || undefined,
        type: newSchedule.type
      })

      if (response.success) {
        // 触发自定义事件通知其他组件
        window.dispatchEvent(new CustomEvent('scheduleUpdated'))
        
        setNewSchedule({ title: '', time: '', description: '', type: 'event' })
        setEditingSchedule(null)
      }
    } catch (error) {
      console.error('更新日程失败:', error)
    }
  }

  const handleCancelEdit = () => {
    setEditingSchedule(null)
    setNewSchedule({ title: '', time: '', description: '', type: 'event' })
    setIsAdding(false)
  }

  const getScheduleTypeColor = (type: string) => {
    switch (type) {
      case 'meeting':
        return 'text-blue-600 dark:text-blue-400'
      case 'appointment':
        return 'text-green-600 dark:text-green-400'
      case 'reminder':
        return 'text-orange-600 dark:text-orange-400'
      default:
        return 'text-purple-600 dark:text-purple-400'
    }
  }

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-sm">日程安排</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsAdding(true)}
          className="h-6 w-6 p-0"
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
      
      <div ref={scheduleListRef} className="space-y-1 max-h-64 overflow-y-auto">
        {/* 顶部空白区域 */}
        <div className="h-8"></div>
        {/* 添加/编辑日程表单 */}
        {(isAdding || editingSchedule) && (
          <div className="space-y-2 p-2 border rounded-md bg-muted/50">
            <Input
              placeholder="日程标题"
              value={newSchedule.title}
              onChange={(e) => setNewSchedule(prev => ({ ...prev, title: e.target.value }))}
              className="text-xs h-7"
            />
            <Input
              type="time"
              step="600"
              value={newSchedule.time}
              onChange={(e) => setNewSchedule(prev => ({ ...prev, time: e.target.value }))}
              className="text-xs h-7"
            />
            <div className="flex gap-1">
              <Button
                size="sm"
                onClick={editingSchedule ? handleUpdateSchedule : handleAddSchedule}
                className="h-6 px-2 text-xs"
                disabled={!newSchedule.title.trim() || !newSchedule.time.trim()}
              >
                <Check className="h-3 w-3 mr-1" />
                {editingSchedule ? '更新' : '添加'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelEdit}
                className="h-6 px-2 text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                取消
              </Button>
            </div>
          </div>
        )}

        {/* 日程列表 */}
        {loading ? (
          <div className="text-center py-4 text-sm text-muted-foreground">
            加载中...
          </div>
        ) : allSchedules.length === 0 && !isAdding ? (
          <div className="text-center py-4 text-sm text-muted-foreground">
            暂无日程安排
          </div>
        ) : (
          allSchedules.map((schedule) => {
            const isPast = schedule.daysLeft < 0
            const isToday = schedule.isToday
            const isFuture = schedule.daysLeft > 0
            
            return (
            <div
              key={`${schedule.id}-${schedule.date}`}
              data-schedule-date={schedule.date}
              className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors group"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="flex items-center justify-between w-full">
                  <div className="flex flex-col items-start gap-1 flex-1 min-w-0">
                    <span className={`text-sm font-medium ${
                      isPast ? 'text-gray-400 dark:text-gray-500' : 
                      isToday ? 'text-green-600 dark:text-green-400' : 
                      'text-blue-600 dark:text-blue-400'
                    }`}>
                      {format(new Date(schedule.date), 'MM-dd')} {schedule.time}
                    </span>
                    <span className={`text-sm truncate ${
                      isPast ? 'text-gray-400 dark:text-gray-500' : 'text-foreground'
                    }`}>
                      {schedule.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <Button
                       variant="ghost"
                       size="sm"
                       onClick={() => handleEditSchedule(schedule)}
                       className="h-6 w-6 p-0 hover:text-blue-600"
                       title="编辑"
                     >
                       <Edit3 className="h-3 w-3" />
                     </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteSchedule(schedule.id)}
                      className="h-6 w-6 p-0 hover:text-destructive"
                      title="删除"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                  isPast ? 'text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800/20' :
                  schedule.isToday 
                    ? 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/20' 
                    : 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/20'
                }`}>
                  {schedule.displayDate}
                </span>
               </div>
            </div>
            )
          })
        )}
        
        {/* 底部空白区域 */}
        <div className="h-8"></div>
      </div>
    </div>
  )
}

export default IntegratedSchedule