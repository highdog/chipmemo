import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Zap, Loader2 } from 'lucide-react'
import { tagContentsApi } from '@/lib/api'
import { toast } from 'sonner'

interface TagContent {
  tag: string
  content: string
  updatedAt: string
  isCheckInEnabled?: boolean
  checkInCount?: number
}

interface CheckInListProps {
  onTagSelect?: (tag: string) => void
}

const CheckInList: React.FC<CheckInListProps> = ({ onTagSelect }) => {
  const [checkInTags, setCheckInTags] = useState<TagContent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [checkingInTags, setCheckingInTags] = useState<Set<string>>(new Set())

  const fetchCheckInTags = async () => {
    try {
      const response = await tagContentsApi.getAll()
    
    if (response.success && response.data) {
      const checkInData = response.data.filter((tagContent: TagContent) => tagContent.isCheckInEnabled === true)
        setCheckInTags(checkInData)
        setError(null)
      } else {
        console.warn('⚠️ [CheckInList] 响应数据格式异常:', response)
        setError('数据格式错误')
      }
    } catch (err: any) {
      console.error('❌ [CheckInList] 获取打卡标签失败:', err)
      setError(err.message || '获取数据失败')
    } finally {
      setLoading(false)
    }
  }

  const handleCheckIn = async (tag: string) => {
    if (checkingInTags.has(tag)) return

    setCheckingInTags(prev => new Set(prev).add(tag))
    try {
      const result = await tagContentsApi.checkIn(tag)
      if (result.success && result.data) {
        // 更新本地状态
        setCheckInTags(prev => 
          prev.map(item => 
            item.tag === tag 
              ? { ...item, checkInCount: result.data!.checkInCount }
              : item
          )
        )
        toast.success(`打卡成功！已打卡${result.data.checkInCount}次`)
        
        // 触发笔记列表刷新，但不传递currentTag避免跳转到标签页面
        window.dispatchEvent(new CustomEvent('notes-refresh'))
      } else {
        toast.error(result.error || '打卡失败')
      }
    } catch (error: any) {
      console.error('打卡失败:', error)
      toast.error('打卡失败: ' + (error?.message || '未知错误'))
    } finally {
      setCheckingInTags(prev => {
        const newSet = new Set(prev)
        newSet.delete(tag)
        return newSet
      })
    }
  }

  const handleTagClick = (tag: string) => {
    onTagSelect?.(tag)
  }

  // 监听打卡列表刷新事件
  const handleCheckInRefresh = () => {
    fetchCheckInTags()
  }

  useEffect(() => {
    fetchCheckInTags()
    window.addEventListener('checkInRefresh', handleCheckInRefresh)
    
    return () => {
      window.removeEventListener('checkInRefresh', handleCheckInRefresh)
    }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-gray-600">加载打卡列表...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="text-red-500">{error}</div>
      </div>
    )
  }

  if (!checkInTags || checkInTags.length === 0) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="text-gray-500">暂无打卡标签</div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {checkInTags.map((tag) => {
        const isCheckingIn = checkingInTags.has(tag.tag)
        
        return (
          <div 
            key={tag.tag} 
            className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div 
              className="flex items-center space-x-2 cursor-pointer flex-1"
              onClick={() => handleTagClick(tag.tag)}
            >
              <Badge variant="outline">{tag.tag}</Badge>
              <span className="text-sm text-gray-600">
                已打卡{tag.checkInCount || 0}次
              </span>
            </div>
            <Button
              onClick={() => handleCheckIn(tag.tag)}
              disabled={isCheckingIn}
              size="sm"
              className="flex items-center gap-1"
            >
              {isCheckingIn ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              打卡
            </Button>
          </div>
        )
      })}
    </div>
  )
}

export default CheckInList