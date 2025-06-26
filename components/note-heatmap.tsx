import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getYear, getMonth, startOfYear, endOfYear, isToday, isSameDay } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { apiClient } from '@/lib/api'

interface NoteHeatmapProps {
  tag: string
}

interface DayData {
  date: Date
  count: number
  hasNotes: boolean
}

const NoteHeatmap: React.FC<NoteHeatmapProps> = ({ tag }) => {
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [isExpanded, setIsExpanded] = useState(false)
  const [heatmapData, setHeatmapData] = useState<DayData[]>([])
  const [loading, setLoading] = useState(true)
  const [totalNotes, setTotalNotes] = useState(0)
  const [activeDays, setActiveDays] = useState(0)
  const [availableYears, setAvailableYears] = useState<number[]>([])

  // 获取笔记数据并生成热力图数据
  const loadHeatmapData = async () => {
    setLoading(true)
    try {
      // 获取所有包含该标签的笔记
      const response = await apiClient.getNotes({
        tags: tag,
        limit: 1000 // 获取足够多的数据
      })

      if (response.success && response.data) {
        const notes = response.data.notes
        setTotalNotes(notes.length)

        // 获取所有有笔记的年份
        const yearsSet = new Set<number>()
        notes.forEach(note => {
          const year = new Date(note.createdAt).getFullYear()
          yearsSet.add(year)
        })
        const years = Array.from(yearsSet).sort((a, b) => b - a) // 降序排列
        setAvailableYears(years)

        // 如果当前年份不在有笔记的年份中，设置为最新的有笔记的年份
        if (years.length > 0 && !years.includes(currentYear)) {
          setCurrentYear(years[0])
          return // 重新加载数据
        }

        // 按日期统计笔记数量
        const noteCounts: { [key: string]: number } = {}
        notes.forEach(note => {
          const dateKey = format(new Date(note.createdAt), 'yyyy-MM-dd')
          noteCounts[dateKey] = (noteCounts[dateKey] || 0) + 1
        })

        // 生成当前年份的日期范围
        const startDate = startOfYear(new Date(currentYear, 0, 1))
        const endDate = endOfYear(new Date(currentYear, 0, 1))

        // 生成热力图数据
        const days = eachDayOfInterval({ start: startDate, end: endDate })
        const heatmapDays: DayData[] = days.map(date => {
          const dateKey = format(date, 'yyyy-MM-dd')
          const count = noteCounts[dateKey] || 0
          return {
            date,
            count,
            hasNotes: count > 0
          }
        })

        setHeatmapData(heatmapDays)
        setActiveDays(heatmapDays.filter(day => day.hasNotes).length)
      }
    } catch (error) {
      console.error('Error loading heatmap data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadHeatmapData()
  }, [tag, currentYear])

  // 获取颜色强度
  const getColorIntensity = (count: number) => {
    if (count === 0) return 'bg-gray-100 dark:bg-gray-800'
    if (count === 1) return 'bg-blue-200 dark:bg-blue-900'
    if (count <= 3) return 'bg-blue-300 dark:bg-blue-800'
    if (count <= 5) return 'bg-blue-400 dark:bg-blue-700'
    return 'bg-blue-500 dark:bg-blue-600'
  }

  // 获取当前月份索引（0-11）
  const getCurrentMonthIndex = () => {
    return new Date().getMonth()
  }

  // 获取要显示的月份（默认4个月，包含当前月份）
  const getDisplayMonths = () => {
    const currentMonth = getCurrentMonthIndex()
    if (isExpanded) {
      return Array.from({ length: 12 }, (_, i) => i)
    } else {
      // 显示当前月份及前面3个月，共4个月
      const months = []
      for (let i = 3; i >= 0; i--) {
        months.push((currentMonth - i + 12) % 12)
      }
      return months
    }
  }



  // 渲染年视图
  const renderYearView = () => {
    const displayMonths = getDisplayMonths()
    const months: DayData[][] = []
    
    displayMonths.forEach(monthIndex => {
      const monthStart = new Date(currentYear, monthIndex, 1)
      const monthEnd = endOfMonth(monthStart)
      const monthDays = heatmapData.filter(day => 
        day.date >= monthStart && day.date <= monthEnd
      )
      months.push(monthDays)
    })

    const gridCols = isExpanded ? 'grid-cols-3' : 'grid-cols-4'
    
    return (
      <div className={`grid ${gridCols} gap-4`}>
        {months.map((monthDays, index) => {
          const monthIndex = displayMonths[index]
          const monthDate = new Date(currentYear, monthIndex, 1)
          const monthNotes = monthDays.reduce((sum, day) => sum + day.count, 0)
          const activeDaysInMonth = monthDays.filter(day => day.hasNotes).length

          return (
            <div key={`${currentYear}-${monthIndex}`} className="space-y-2">
              <div className="text-xs font-medium text-center flex items-center justify-center gap-1">
                {format(monthDate, 'MMM', { locale: zhCN })}
                <span className="text-muted-foreground">({monthNotes}篇/{activeDaysInMonth}天)</span>
              </div>
              <div className="grid grid-cols-7 gap-0.5">
                {monthDays.map((day, dayIndex) => (
                  <div
                    key={dayIndex}
                    className={`h-3 w-3 rounded-sm cursor-pointer transition-all hover:scale-125 ${
                      getColorIntensity(day.count)
                    }`}
                    title={`${format(day.date, 'yyyy-MM-dd', { locale: zhCN })}: ${day.count} 篇笔记`}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              笔记统计
            </CardTitle>
            <div className="text-xs text-muted-foreground">
              {totalNotes}篇笔记 · {activeDays}活跃天数
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select 
              value={currentYear.toString()} 
              onValueChange={(value) => setCurrentYear(parseInt(value))}
            >
              <SelectTrigger className="w-20 h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map(year => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-7 px-2 text-xs"
            >
              {isExpanded ? '收起' : '展开'}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-sm text-muted-foreground">加载中...</div>
          </div>
        ) : (
          <div className="space-y-4">
            {renderYearView()}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default NoteHeatmap