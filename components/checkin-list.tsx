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
      console.log('🔍 [CheckInList] 开始获取所有标签内容...')
      const response = await tagContentsApi.getAll()
      console.log('📥 [CheckInList] 获取到的原始数据:', response)
      
      if (response && response.data) {
        const checkInData = response.data.filter((item: TagContent) => item.isCheckInEnabled)
        console.log('✅ [CheckInList] 过滤后的打卡标签:', checkInData)
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
    console.log('✅ [CheckInList] 点击打卡标签，显示标签内容:', tag)
    // 触发标签搜索事件，在当前页面显示标签内容
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tag-search', { detail: { tag } }))
    }
  }

  useEffect(() => {
    fetchCheckInTags()

    // 监听打卡列表刷新事件
    const handleCheckInRefresh = () => {
      console.log('🔄 [CheckInList] 收到打卡列表刷新事件，重新获取数据...')
      setLoading(true)
      fetchCheckInTags()
    }

    window.addEventListener('checkin-list-refresh', handleCheckInRefresh)
    window.addEventListener('goals-list-refresh', handleCheckInRefresh) // 复用目标刷新事件
    console.log('👂 [CheckInList] 已添加打卡列表刷新事件监听器')

    // 清理事件监听器
    return () => {
      window.removeEventListener('checkin-list-refresh', handleCheckInRefresh)
      window.removeEventListener('goals-list-refresh', handleCheckInRefresh)
      console.log('🧹 [CheckInList] 已移除打卡列表刷新事件监听器')
    }
  }, [])

  console.log('🎨 [CheckInList] 渲染组件，当前状态:', {
    loading,
    error,
    checkInTagsCount: checkInTags.length,
    checkInTags: checkInTags.map(t => ({ tag: t.tag, isCheckInEnabled: t.isCheckInEnabled, checkInCount: t.checkInCount }))
  })

  if (loading) {
    console.log('⏳ [CheckInList] 显示加载状态')
    return (
      <div>
        <p>加载中...</p>
      </div>
    )
  }

  if (error) {
    console.log('❌ [CheckInList] 显示错误状态:', error)
    return (
      <div>
         <p className="text-red-500">{error}</p>
       </div>
    )
  }

  if (checkInTags.length === 0) {
    console.log('📭 [CheckInList] 显示无打卡标签状态')
    return (
      <div>
         <p className="text-gray-500">暂无设置打卡的标签</p>
       </div>
    )
  }

  console.log('✅ [CheckInList] 显示打卡列表，共', checkInTags.length, '个打卡标签')
  
  return (
    <div className="space-y-2">
      {checkInTags.map((tag) => {
        const isCheckingIn = checkingInTags.has(tag.tag)
        
        console.log(`✅ [CheckInList] 渲染打卡标签 "${tag.tag}":`, {
          checkInCount: tag.checkInCount,
          isCheckingIn
        })
        
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