"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Pencil, Save, X } from "lucide-react"
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

  // 加载标签内容
  useEffect(() => {
    const loadTagContent = async () => {
      setIsLoading(true)
      try {
        const response = await tagContentsApi.get(tag)
        if (response.success && response.data) {
          setContent(response.data.content)
        } else {
          // 如果没有找到内容，设置默认内容
          setContent(`这是关于 #${tag} 标签的基本内容。点击编辑按钮来自定义这个内容。`)
        }
      } catch (error) {
        console.error('Error loading tag content:', error)
        setContent(`这是关于 #${tag} 标签的基本内容。点击编辑按钮来自定义这个内容。`)
        toast.error('加载标签内容失败')
      } finally {
        setIsLoading(false)
      }
    }

    loadTagContent()
  }, [tag])
  
  const handleSave = async () => {
    setIsSaving(true)
    
    try {
      const response = await tagContentsApi.save(tag, content)
      if (response.success) {
        toast.success('内容已保存')
        setIsEditing(false)
        if (onSave) {
          onSave(tag, content)
        }
      } else {
        toast.error('保存失败')
      }
    } catch (error) {
      console.error('Error saving content:', error)
      toast.error('保存失败')
    } finally {
      setIsSaving(false)
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
          <CardTitle className="text-lg">{tag}</CardTitle>
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
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="flex-1 font-mono text-sm resize-none"
            placeholder={`输入关于 #${tag} 标签的描述内容...`}
            disabled={isLoading}
          />
        ) : (
          <div 
            className="prose prose-sm max-w-none flex-1 overflow-y-auto" 
            dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }} 
          />
        )}
      </CardContent>
    </Card>
  )
}