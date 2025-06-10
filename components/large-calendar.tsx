'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns'
import { zhCN } from 'date-fns/locale'

interface ScheduleItem {
  id: string
  title: string
  time: string
  description?: string
  type: 'meeting' | 'appointment' | 'event' | 'reminder'
}

interface LargeCalendarProps {
  isOpen: boolean
  onClose: () => void
  selectedDate: Date
  onDateSelect: (date: Date) => void
  schedulesByDate?: Record<string, ScheduleItem[]>
}

const LargeCalendar: React.FC<LargeCalendarProps> = ({ isOpen, onClose, selectedDate, onDateSelect, schedulesByDate = {} }) => {
  const [currentMonth, setCurrentMonth] = useState(selectedDate)

  // 使用传入的日程数据，如果没有则使用默认的模拟数据
  const [localSchedules, setLocalSchedules] = useState<Record<string, ScheduleItem[]>>({})
  
  useEffect(() => {
    if (Object.keys(schedulesByDate).length > 0) {
      setLocalSchedules(schedulesByDate)
    } else {
      // 默认模拟数据，与ScheduleList保持一致
      const mockSchedules: Record<string, ScheduleItem[]> = {
        [format(new Date(), 'yyyy-MM-dd')]: [
          { id: '1', title: '团队会议', time: '09:00', type: 'meeting' },
          { id: '2', title: '客户拜访', time: '14:30', type: 'appointment' }
        ]
      }
      setLocalSchedules(mockSchedules)
    }
  }, [schedulesByDate])

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // 获取月份开始前需要显示的上月日期
  const startDate = new Date(monthStart)
  startDate.setDate(startDate.getDate() - monthStart.getDay())
  
  // 获取月份结束后需要显示的下月日期
  const endDate = new Date(monthEnd)
  const remainingDays = 6 - monthEnd.getDay()
  endDate.setDate(endDate.getDate() + remainingDays)

  const allDays = eachDayOfInterval({ start: startDate, end: endDate })

  const handleDateClick = (date: Date) => {
    onDateSelect(date)
    onClose()
  }

  const getSchedulesForDate = (date: Date): ScheduleItem[] => {
    const dateKey = format(date, 'yyyy-MM-dd')
    return localSchedules[dateKey] || []
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-lg font-semibold">
              {format(currentMonth, 'yyyy年M月', { locale: zhCN })}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-7 gap-1 p-4">
          {/* 星期标题 */}
          {['日', '一', '二', '三', '四', '五', '六'].map((day) => (
            <div key={day} className="text-center text-sm font-medium text-muted-foreground p-2">
              {day}
            </div>
          ))}
          
          {/* 日期格子 */}
          {allDays.map((day) => {
            const isCurrentMonth = isSameMonth(day, currentMonth)
            const isSelected = isSameDay(day, selectedDate)
            const isToday = isSameDay(day, new Date())
            const schedules = getSchedulesForDate(day)
            
            return (
              <div
                key={day.toISOString()}
                className={`
                  relative h-24 p-1 border rounded-md cursor-pointer transition-colors
                  ${isCurrentMonth ? 'bg-background hover:bg-muted' : 'bg-muted/50 text-muted-foreground'}
                  ${isSelected ? 'ring-2 ring-primary' : ''}
                  ${isToday ? 'bg-primary/10' : ''}
                `}
                onClick={() => handleDateClick(day)}
              >
                <div className={`text-sm font-medium ${
                  isToday ? 'text-primary' : isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'
                }`}>
                  {format(day, 'd')}
                </div>
                
                {/* 日程显示 */}
                <div className="mt-1 space-y-0.5 overflow-hidden">
                  {schedules.slice(0, 3).map((schedule) => (
                    <div
                      key={schedule.id}
                      className="text-xs px-1 py-0.5 rounded bg-muted text-foreground truncate"
                      title={`${schedule.time} ${schedule.title}`}
                    >
                      {schedule.time} {schedule.title}
                    </div>
                  ))}
                  {schedules.length > 3 && (
                    <div className="text-xs text-muted-foreground px-1">
                      +{schedules.length - 3} 更多
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default LargeCalendar