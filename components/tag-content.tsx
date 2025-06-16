"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Pencil, Save, X, Target, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { tagContentsApi } from "@/lib/api"


interface TagContentProps {
  tag: string
  onSave?: (tag: string, content: string) => void
}



export function TagContent({ tag, onSave }: TagContentProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [content, setContent] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  // 目标相关状态
  const [isGoalEnabled, setIsGoalEnabled] = useState(false)
  const [targetCount, setTargetCount] = useState(10)
  const [currentCount, setCurrentCount] = useState(0)
  


  // 加载标签内容
  const loadTagContent = async () => {
    setIsLoading(true)
    try {
      const response = await tagContentsApi.get(tag)
      if (response.success && response.data) {
        setContent(response.data.content)
        // 加载目标设置数据
        setIsGoalEnabled(response.data.isGoalEnabled || false)
        setTargetCount(response.data.targetCount || 0)
        setCurrentCount(response.data.currentCount || 0)
      } else {
        // 如果没有找到内容，设置默认内容
        setContent(`这是关于 #${tag} 标签的基本内容。点击编辑按钮来自定义这个内容。`)
        setIsGoalEnabled(false)
        setTargetCount(0)
        setCurrentCount(0)
      }
    } catch (error) {
      console.error('Error loading tag content:', error)
      setContent(`这是关于 #${tag} 标签的基本内容。点击编辑按钮来自定义这个内容。`)
      setIsGoalEnabled(false)
      setTargetCount(0)
      setCurrentCount(0)
      toast.error('加载标签内容失败')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadTagContent()
  }, [tag])

  // 添加一个用于外部刷新的方法
  useEffect(() => {
    const handleTagUpdate = () => {
      loadTagContent()
    }

    // 监听自定义事件来刷新标签内容
    window.addEventListener(`tag-updated-${tag}`, handleTagUpdate)
    
    return () => {
      window.removeEventListener(`tag-updated-${tag}`, handleTagUpdate)
    }
  }, [tag])
  
  const handleSave = async () => {
    if (!tag) return
    
    console.log('💾 [TagContent] 开始保存标签内容和目标设置...')
    console.log('📝 [TagContent] 保存参数:', {
      tag: tag,
      content: content,
      isGoalEnabled: isGoalEnabled,
      targetCount: targetCount,
      currentCount: currentCount
    })
    
    try {
      setIsSaving(true)
      
      const goalSettings = {
        isGoalEnabled,
        targetCount: isGoalEnabled ? targetCount : 0,
        currentCount: isGoalEnabled ? currentCount : 0
      }
      
      console.log('🎯 [TagContent] 目标设置数据:', goalSettings)
      
      const result = await tagContentsApi.save(tag, content, goalSettings)
      console.log('✅ [TagContent] 保存结果:', result)
      
      if (result.success) {
        console.log('🎉 [TagContent] 保存成功！')
        setIsEditing(false)
        
        // 触发目标列表刷新
        console.log('🔄 [TagContent] 触发目标列表刷新事件')
        window.dispatchEvent(new CustomEvent('goals-list-refresh'))
        
        // 显示成功提示
        toast.success('内容和目标设置已保存')
        
        if (onSave) {
          onSave(tag, content)
        }
      } else {
        console.error('❌ [TagContent] 保存失败:', result.error)
        toast.error(result.error || '保存失败')
      }
    } catch (error) {
      console.error('💥 [TagContent] 保存异常:', error)
      toast.error('网络错误或服务器异常')
    } finally {
      setIsSaving(false)
      console.log('🏁 [TagContent] 保存流程结束')
    }
  }

  const handleCancel = () => {
    // 重新加载原始内容
    const loadOriginalContent = async () => {
      try {
        const response = await tagContentsApi.get(tag)
        if (response.success && response.data) {
          setContent(response.data.content)
        } else {
          setContent(`这是关于 #${tag} 标签的基本内容。点击编辑按钮来自定义这个内容。`)
        }
      } catch (error) {
        setContent(`这是关于 #${tag} 标签的基本内容。点击编辑按钮来自定义这个内容。`)
      }
    }
    loadOriginalContent()
    setIsEditing(false)
  }



  // 将Markdown格式的内容转换为HTML
  const renderMarkdown = (text: string) => {
    // 简单的Markdown转换，实际项目中可以使用专业的Markdown库
    return text
      .replace(/^# (.*)$/gm, '<h1 class="text-2xl font-bold mb-2">$1</h1>')
      .replace(/^## (.*)$/gm, '<h2 class="text-xl font-bold mb-2">$1</h2>')
      .replace(/^### (.*)$/gm, '<h3 class="text-lg font-bold mb-2">$1</h3>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br />')
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2 flex-shrink-0">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <CardTitle className="text-lg">{tag}</CardTitle>
            {/* 目标设置区域 - 移到标题右边 */}
            {isEditing && (
              <div className="flex items-center gap-3">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id={`goal-${tag}`}
                    checked={isGoalEnabled}
                    onCheckedChange={(checked) => setIsGoalEnabled(checked as boolean)}
                  />
                  <Label htmlFor={`goal-${tag}`} className="text-sm">
                    设置为目标标签
                  </Label>
                </div>
                
                {isGoalEnabled && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <Label className="text-xs text-muted-foreground whitespace-nowrap">
                        目标
                      </Label>
                      <Input
                        type="number"
                        min="1"
                        value={targetCount}
                        onChange={(e) => setTargetCount(parseInt(e.target.value) || 1)}
                        className="h-7 w-16 text-xs"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <Label className="text-xs text-muted-foreground whitespace-nowrap">
                        进度
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        value={currentCount}
                        onChange={(e) => setCurrentCount(parseInt(e.target.value) || 0)}
                        className="h-7 w-16 text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
            {/* 非编辑模式下的目标进度显示 */}
            {!isEditing && isGoalEnabled && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {currentCount}/{targetCount}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-40 bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${Math.min((currentCount / targetCount) * 100, 100)}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {Math.min((currentCount / targetCount) * 100, 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            )}
          </div>
          {isEditing ? (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handleCancel}>
                <X className="h-4 w-4 mr-1" />
                取消
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isSaving || isLoading}>
                <Save className="h-4 w-4 mr-1" />
                {isSaving ? '保存中...' : '保存'}
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
              <Pencil className="h-4 w-4 mr-1" />
              编辑
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        {isEditing ? (
          <div className="flex-1 flex flex-col gap-4">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="flex-1 font-mono text-sm resize-none"
              placeholder={`输入关于 #${tag} 标签的描述内容...`}
              disabled={isLoading}
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            <div 
              className="prose prose-sm max-w-none flex-1 overflow-y-auto" 
              dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }} 
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}