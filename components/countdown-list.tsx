import React, { useState, useEffect } from 'react'
import { Calendar } from 'lucide-react'
import { format, differenceInDays, isAfter, isToday, startOfDay } from 'date-fns'
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

interface CountdownItem extends ScheduleItem {
  daysLeft: number
  displayDate: string
}

const CountdownList: React.FC = () => {
  const [upcomingSchedules, setUpcomingSchedules] = useState<CountdownItem[]>([])
  const [loading, setLoading] = useState(true)

  // 加载未来的日程数据
  useEffect(() => {
    const loadUpcomingSchedules = async () => {
      try {
        setLoading(true)
        const response = await schedulesApi.getAll({})
        
        if (response.success && response.data) {
          const today = startOfDay(new Date())
          const allSchedules: CountdownItem[] = []
          
          // 遍历所有日期的日程
          Object.entries(response.data).forEach(([dateKey, schedules]) => {
            const scheduleDate = startOfDay(new Date(dateKey))
            
            // 只处理未来的日程（不包括今天）
            if (isAfter(scheduleDate, today)) {
              const daySchedules = schedules as ScheduleItem[]
              
              daySchedules.forEach(schedule => {
                const daysLeft = differenceInDays(scheduleDate, today)
                const displayDate = format(scheduleDate, 'MM月dd日', { locale: zhCN })
                
                allSchedules.push({
                  ...schedule,
                  date: dateKey,
                  daysLeft,
                  displayDate
                })
              })
            }
          })
          
          // 按剩余天数排序，然后按时间排序
          allSchedules.sort((a, b) => {
            if (a.daysLeft !== b.daysLeft) {
              return a.daysLeft - b.daysLeft
            }
            return a.time.localeCompare(b.time)
          })
          
          setUpcomingSchedules(allSchedules)
        } else {
          setUpcomingSchedules([])
        }
      } catch (error) {
        console.error('加载倒计日数据失败:', error)
        setUpcomingSchedules([])
      } finally {
        setLoading(false)
      }
    }

    loadUpcomingSchedules()
    
    // 监听日程更新事件
    const handleScheduleUpdate = () => {
      loadUpcomingSchedules()
    }
    
    window.addEventListener('scheduleUpdated', handleScheduleUpdate)
    
    return () => {
      window.removeEventListener('scheduleUpdated', handleScheduleUpdate)
    }
  }, [])

  const formatDaysLeft = (daysLeft: number) => {
    if (daysLeft === 0) {
      return '今天'
    } else if (daysLeft === 1) {
      return '明天'
    } else {
      return `还剩${daysLeft}天`
    }
  }

  if (loading) {
    return (
      <div className="mt-4">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-medium text-sm">倒计日</h3>
        </div>
        <div className="text-center py-4 text-sm text-muted-foreground">
          加载中...
        </div>
      </div>
    )
  }

  return (
    <div className="mt-4">
      <div className="flex items-center gap-2 mb-3">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <h3 className="font-medium text-sm">倒计日</h3>
      </div>
      
      <div className="space-y-1 max-h-48 overflow-y-auto">
        {upcomingSchedules.length === 0 ? (
          <div className="text-center py-4 text-sm text-muted-foreground">
            暂无未来日程安排
          </div>
        ) : (
          upcomingSchedules.map((schedule) => (
            <div
              key={`${schedule.date}-${schedule.id}`}
              className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="flex flex-col gap-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {schedule.displayDate} {schedule.time}
                    </span>
                  </div>
                  <span className="text-sm text-foreground truncate">
                    {schedule.title}
                  </span>
                </div>
              </div>
              <div className="flex-shrink-0">
                <span className={`text-xs px-2 py-1 rounded-full ${
                  schedule.daysLeft === 0 
                    ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                    : schedule.daysLeft <= 3
                    ? 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300'
                    : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                }`}>
                  {formatDaysLeft(schedule.daysLeft)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default CountdownList