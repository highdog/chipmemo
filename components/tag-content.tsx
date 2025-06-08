"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Pencil, Save, X } from "lucide-react"

interface TagContentProps {
  tag: string
  onSave?: (tag: string, content: string) => void
}

// 模拟标签内容存储
const tagContents: Record<string, string> = {}

export function TagContent({ tag, onSave }: TagContentProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [content, setContent] = useState(tagContents[tag] || `# ${tag}\n\n这是关于 #${tag} 标签的基本内容。点击编辑按钮来自定义这个内容。`)
  
  const handleSave = () => {
    tagContents[tag] = content
    setIsEditing(false)
    if (onSave) {
      onSave(tag, content)
    }
  }

  const handleCancel = () => {
    setContent(tagContents[tag] || `# ${tag}\n\n这是关于 #${tag} 标签的基本内容。点击编辑按钮来自定义这个内容。`)
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
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">标签: #{tag}</CardTitle>
          {isEditing ? (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handleCancel}>
                <X className="h-4 w-4 mr-1" />
                取消
              </Button>
              <Button size="sm" onClick={handleSave}>
                <Save className="h-4 w-4 mr-1" />
                保存
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
      <CardContent>
        {isEditing ? (
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[150px] font-mono text-sm"
            placeholder={`输入关于 #${tag} 标签的描述内容...`}
          />
        ) : (
          <div 
            className="prose prose-sm max-w-none" 
            dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }} 
          />
        )}
      </CardContent>
    </Card>
  )
}