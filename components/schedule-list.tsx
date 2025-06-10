'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, Plus, X, Edit2, Check } from 'lucide-react'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'

interface ScheduleItem {
  id: string
  title: string
  time: string
  description?: string
  type: 'meeting' | 'appointment' | 'event' | 'reminder'
}

interface ScheduleListProps {
  selectedDate: Date
}

const ScheduleList: React.FC<ScheduleListProps> = ({ selectedDate }) => {
  const [schedules, setSchedules] = useState<ScheduleItem[]>([])
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newSchedule, setNewSchedule] = useState({
    title: '',
    time: '',
    description: '',
    type: 'event' as ScheduleItem['type']
  })

  // 模拟数据 - 实际项目中应该从API获取
  useEffect(() => {
    const mockSchedules: ScheduleItem[] = [
      {
        id: '1',
        title: '团队会议',
        time: '09:00',
        description: '讨论项目进度',
        type: 'meeting'
      },
      {
        id: '2',
        title: '客户拜访',
        time: '14:30',
        description: '产品演示',
        type: 'appointment'
      }
    ]
    
    // 只在今天显示模拟数据
    const today = new Date()
    if (selectedDate.toDateString() === today.toDateString()) {
      setSchedules(mockSchedules)
    } else {
      setSchedules([])
    }
  }, [selectedDate])

  const handleAddSchedule = () => {
    if (!newSchedule.title.trim() || !newSchedule.time.trim()) return

    const schedule: ScheduleItem = {
      id: Date.now().toString(),
      title: newSchedule.title.trim(),
      time: newSchedule.time,
      description: newSchedule.description.trim() || undefined,
      type: newSchedule.type
    }

    setSchedules(prev => [...prev, schedule].sort((a, b) => a.time.localeCompare(b.time)))
    setNewSchedule({ title: '', time: '', description: '', type: 'event' })
    setIsAdding(false)
  }

  const handleDeleteSchedule = (id: string) => {
    setSchedules(prev => prev.filter(s => s.id !== id))
  }

  const getTypeColor = (type: ScheduleItem['type']) => {
    switch (type) {
      case 'meeting': return 'bg-blue-100 text-blue-800'
      case 'appointment': return 'bg-green-100 text-green-800'
      case 'event': return 'bg-purple-100 text-purple-800'
      case 'reminder': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeLabel = (type: ScheduleItem['type']) => {
    switch (type) {
      case 'meeting': return '会议'
      case 'appointment': return '约会'
      case 'event': return '事件'
      case 'reminder': return '提醒'
      default: return '其他'
    }
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" />
            日程安排
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsAdding(true)}
            className="h-6 w-6 p-0"
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {format(selectedDate, 'yyyy年M月d日 EEEE', { locale: zhCN })}
        </p>
      </CardHeader>
      
      <CardContent className="pt-0 space-y-2 max-h-48 overflow-y-auto">
        {/* 添加新日程表单 */}
        {isAdding && (
          <div className="space-y-2 p-2 border rounded-md bg-muted/50">
            <Input
              placeholder="日程标题"
              value={newSchedule.title}
              onChange={(e) => setNewSchedule(prev => ({ ...prev, title: e.target.value }))}
              className="text-xs h-7"
            />
            <div className="flex gap-1">
              <Input
                type="time"
                value={newSchedule.time}
                onChange={(e) => setNewSchedule(prev => ({ ...prev, time: e.target.value }))}
                className="text-xs h-7 flex-1"
              />
              <select
                value={newSchedule.type}
                onChange={(e) => setNewSchedule(prev => ({ ...prev, type: e.target.value as ScheduleItem['type'] }))}
                className="text-xs h-7 px-2 border rounded-md bg-background"
              >
                <option value="event">事件</option>
                <option value="meeting">会议</option>
                <option value="appointment">约会</option>
                <option value="reminder">提醒</option>
              </select>
            </div>
            <Input
              placeholder="描述（可选）"
              value={newSchedule.description}
              onChange={(e) => setNewSchedule(prev => ({ ...prev, description: e.target.value }))}
              className="text-xs h-7"
            />
            <div className="flex gap-1">
              <Button
                size="sm"
                onClick={handleAddSchedule}
                className="h-6 px-2 text-xs"
                disabled={!newSchedule.title.trim() || !newSchedule.time.trim()}
              >
                <Check className="h-3 w-3 mr-1" />
                添加
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsAdding(false)
                  setNewSchedule({ title: '', time: '', description: '', type: 'event' })
                }}
                className="h-6 px-2 text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                取消
              </Button>
            </div>
          </div>
        )}

        {/* 日程列表 */}
        {schedules.length === 0 && !isAdding ? (
          <div className="text-center py-4 text-xs text-muted-foreground">
            当前日期没有日程安排
          </div>
        ) : (
          schedules.map((schedule) => (
            <div
              key={schedule.id}
              className="flex items-start gap-2 p-2 border rounded-md hover:bg-muted/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-primary">
                    {schedule.time}
                  </span>
                  <Badge className={`text-xs px-1 py-0 ${getTypeColor(schedule.type)}`}>
                    {getTypeLabel(schedule.type)}
                  </Badge>
                </div>
                <h4 className="text-xs font-medium truncate">
                  {schedule.title}
                </h4>
                {schedule.description && (
                  <p className="text-xs text-muted-foreground truncate">
                    {schedule.description}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDeleteSchedule(schedule.id)}
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

export default ScheduleList