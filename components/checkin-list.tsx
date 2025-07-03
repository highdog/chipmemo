import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
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
  const [showCheckInPreview, setShowCheckInPreview] = useState(false)
  const [previewNoteContent, setPreviewNoteContent] = useState('')
  const [editableNoteContent, setEditableNoteContent] = useState('')
  const [currentCheckInTag, setCurrentCheckInTag] = useState('')

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

    // 获取当前标签的打卡次数
    const tagData = checkInTags.find(t => t.tag === tag)
    const currentCount = tagData?.checkInCount || 0
    
    // 设置默认打卡内容
    const defaultContent = `${tag}打卡，已打卡${currentCount + 1}次`
    setCurrentCheckInTag(tag)
    setEditableNoteContent(defaultContent)
    setShowCheckInPreview(true)
  }

  const handleConfirmCheckIn = async () => {
    if (!currentCheckInTag || checkingInTags.has(currentCheckInTag)) return

    setCheckingInTags(prev => new Set(prev).add(currentCheckInTag))
    try {
      const result = await tagContentsApi.checkInWithContent(currentCheckInTag, editableNoteContent)
      if (result.success && result.data) {
        // 更新本地状态
        setCheckInTags(prev => 
          prev.map(item => 
            item.tag === currentCheckInTag 
              ? { ...item, checkInCount: result.data!.checkInCount }
              : item
          )
        )
        toast.success(`打卡成功！已打卡${result.data.checkInCount}次`)
        
        // 触发笔记列表刷新，但不传递currentTag避免跳转到标签页面
        window.dispatchEvent(new CustomEvent('notes-refresh'))
        
        // 关闭预览对话框
        setShowCheckInPreview(false)
        setCurrentCheckInTag('')
        setPreviewNoteContent('')
        setEditableNoteContent('')
      } else {
        toast.error(result.error || '打卡失败')
      }
    } catch (error: any) {
      console.error('打卡失败:', error)
      toast.error('打卡失败: ' + (error?.message || '未知错误'))
    } finally {
      setCheckingInTags(prev => {
        const newSet = new Set(prev)
        newSet.delete(currentCheckInTag)
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
    <>
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

      {/* 打卡预览对话框 */}
    <Dialog open={showCheckInPreview} onOpenChange={setShowCheckInPreview}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>打卡预览 - #{currentCheckInTag}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="note-content" className="text-sm font-medium">
              笔记内容
            </Label>
            <Textarea
              id="note-content"
              value={editableNoteContent}
              onChange={(e) => setEditableNoteContent(e.target.value)}
              className="mt-2 min-h-[300px]"
              placeholder="请输入打卡笔记内容..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setShowCheckInPreview(false)}
            disabled={checkingInTags.has(currentCheckInTag)}
          >
            取消
          </Button>
          <Button
            onClick={handleConfirmCheckIn}
            disabled={checkingInTags.has(currentCheckInTag) || !editableNoteContent.trim()}
          >
            {checkingInTags.has(currentCheckInTag) ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                打卡中...
              </>
            ) : (
              '确认打卡'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}

export default CheckInList