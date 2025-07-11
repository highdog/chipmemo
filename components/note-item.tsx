"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Trash2, CheckSquare, Tag, ListTodo, Pencil, Save, X, ZoomIn, Clock, Calendar, Plus, Minus } from "lucide-react"
import { deleteNote, type Note } from "@/lib/actions"
import { formatTime } from "@/lib/date-utils"
import { highlightTags } from "@/lib/tag-utils"
import { toast } from "@/hooks/use-toast"
import { apiClient } from "@/lib/api"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { ImageViewer } from "@/components/image-viewer"
import { extractTags } from "@/lib/utils"

interface NoteItemProps {
  note: Note
  onDelete: () => void
  searchTerm?: string
  onTagClick?: (tag: string) => void
  onConvertToTodo?: () => void
  onUpdate?: (noteId: string, content: string, tags: string[], customDate?: string) => Promise<void>
}

export function NoteItem({ note, onDelete, searchTerm, onTagClick, onConvertToTodo, onUpdate }: NoteItemProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [isConverting, setIsConverting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editTime, setEditTime] = useState('')
  const [editTags, setEditTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState('')
  const [imageViewerOpen, setImageViewerOpen] = useState(false)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const result = await deleteNote(note.id)
      if (result.success) {
        onDelete()
        toast({
          title: "删除成功",
          description: "笔记已删除",
        })
      } else {
        toast({
          title: "删除失败",
          description: result.error || "未知错误",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "删除失败",
        description: "网络错误，请重试",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleConvertToTodo = async () => {
    if (onConvertToTodo) {
      setIsConverting(true)
      try {
        await onConvertToTodo()
      } finally {
        setIsConverting(false)
      }
    }
  }

  // 开始编辑笔记
  const handleEdit = () => {
    setEditContent(note.originalContent || note.content)
    
    // 设置日期时间
    const noteDate = note.customDate || note.createdAt
    const date = new Date(noteDate)
    setEditDate(date.toISOString().split('T')[0]) // YYYY-MM-DD格式
    setEditTime(date.toTimeString().slice(0, 5)) // HH:MM格式
    
    // 设置标签
    setEditTags([...note.tags])
    setNewTag('')
    
    setIsEditing(true)
  }

  // 保存编辑
  const handleSave = async () => {
    if (!onUpdate) return
    
    setIsSaving(true)
    try {
      // 合并内容中的标签和手动添加的标签
      const extractedTags = extractTags(editContent)
      const allTags = [...new Set([...extractedTags, ...editTags])]
      
      // 构建自定义日期
      const customDate = new Date(`${editDate}T${editTime}:00`)
      
      // 调用API更新笔记
      const result = await apiClient.updateNote(note._id, {
        content: editContent,
        tags: allTags,
        customDate: customDate.toISOString()
      })
      
      if (result.success) {
        // 如果有onUpdate回调，也调用它来刷新列表
        await onUpdate(note.id, editContent, allTags, customDate.toISOString())
        setIsEditing(false)
        toast({
          title: "保存成功",
          description: "笔记已更新",
        })
      } else {
        throw new Error(result.error || '更新失败')
      }
    } catch (error) {
      toast({
        title: "保存失败",
        description: "请重试",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  // 取消编辑
  const handleCancel = () => {
    setIsEditing(false)
    setEditContent('')
    setEditDate('')
    setEditTime('')
    setEditTags([])
    setNewTag('')
  }

  // 添加标签
  const handleAddTag = () => {
    if (newTag.trim() && !editTags.includes(newTag.trim())) {
      setEditTags([...editTags, newTag.trim()])
      setNewTag('')
    }
  }

  // 删除标签
  const handleRemoveTag = (tagToRemove: string) => {
    setEditTags(editTags.filter(tag => tag !== tagToRemove))
  }

  // 处理标签输入的回车键
  const handleTagKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddTag()
    }
  }



  // 从内容中提取图片URL
  const extractImageUrls = (content: string): string[] => {
    const imageRegex = /!\[.*?\]\((.*?)\)/g;
    const urls: string[] = [];
    let match;
    
    while ((match = imageRegex.exec(content)) !== null) {
      urls.push(match[1]);
    }
    
    return urls;
  };

  // 从内容中移除图片markdown语法
  const removeImagesFromContent = (content: string): string => {
    return content.replace(/!\[.*?\]\(.*?\)/g, '').trim();
  };

  // 从内容中移除标签文字（支持中文标签）
  const removeTagsFromContent = (content: string): string => {
    // 匹配 #标签 格式，支持中文、英文、数字、下划线
    return content.replace(/#[\u4e00-\u9fa5\w]+/g, '').replace(/\s+/g, ' ').trim();
  };

  // 提取用时信息的函数
  const extractTimeFromContent = (content: string): { timeDisplay: string | null, cleanContent: string } => {
    // 匹配多种时间格式：用时xx时xx分、用时xx分、用时xx秒
    const timeRegexes = [
      /用时(\d+)小?时(\d+)分/g,
      /用时(\d+)分/g,
      /用时(\d+)秒/g
    ]
    
    let timeDisplay = null
    let cleanContent = content
    
    for (const regex of timeRegexes) {
      const matches = [...content.matchAll(regex)]
      if (matches.length > 0) {
        const lastMatch = matches[matches.length - 1]
        
        if (regex.source.includes('小?时')) {
          // 用时xx时xx分
          const hours = parseInt(lastMatch[1])
          const minutes = parseInt(lastMatch[2])
          timeDisplay = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
        } else if (regex.source.includes('分')) {
          // 用时xx分
          const minutes = parseInt(lastMatch[1])
          const hours = Math.floor(minutes / 60)
          const remainingMinutes = minutes % 60
          timeDisplay = `${hours.toString().padStart(2, '0')}:${remainingMinutes.toString().padStart(2, '0')}`
        } else {
           // 用时xx秒 - 统一显示为00:01
           timeDisplay = `00:01`
         }
        
        cleanContent = content.replace(regex, '').trim()
        break
      }
    }
    
    return { timeDisplay, cleanContent }
  };

  // 渲染笔记内容（不含图片和标签）
  const renderNoteContent = () => {
    const contentWithoutImages = removeImagesFromContent(note.originalContent || note.content);
    const contentWithoutTags = removeTagsFromContent(contentWithoutImages);
    const { cleanContent } = extractTimeFromContent(contentWithoutTags);
    
    if (searchTerm) {
      // 不再高亮标签，因为标签已被移除
      const content = cleanContent
      return (
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkBreaks]}
          components={{
            p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
            h1: ({ children }) => <h1 className="text-xl font-bold mb-2">{children}</h1>,
            h2: ({ children }) => <h2 className="text-lg font-semibold mb-2">{children}</h2>,
            h3: ({ children }) => <h3 className="text-base font-medium mb-1">{children}</h3>,
            ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
            li: ({ children }) => <li className="text-sm">{children}</li>,
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-border pl-4 italic text-muted-foreground mb-2">
                {children}
              </blockquote>
            ),
            code: ({ children, className }) => {
              const isInline = !className
              if (isInline) {
                return (
                  <code className="bg-muted px-1 py-0.5 rounded text-sm font-mono">
                    {children}
                  </code>
                )
              }
              return (
                <pre className="bg-muted p-3 rounded-md overflow-x-auto mb-2">
                  <code className="text-sm font-mono">{children}</code>
                </pre>
              )
            },
            strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
            em: ({ children }) => <em className="italic">{children}</em>,
            a: ({ href, children }) => (
              <a 
                href={href} 
                className="text-primary hover:underline" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                {children}
              </a>
            ),
          }}
        >
          {content}
        </ReactMarkdown>
      )
    } else {
      return (
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkBreaks]}
          components={{
            p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
            h1: ({ children }) => <h1 className="text-xl font-bold mb-2">{children}</h1>,
            h2: ({ children }) => <h2 className="text-lg font-semibold mb-2">{children}</h2>,
            h3: ({ children }) => <h3 className="text-base font-medium mb-1">{children}</h3>,
            ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
            li: ({ children }) => <li className="text-sm">{children}</li>,
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-border pl-4 italic text-muted-foreground mb-2">
                {children}
              </blockquote>
            ),
            code: ({ children, className }) => {
              const isInline = !className
              if (isInline) {
                return (
                  <code className="bg-muted px-1 py-0.5 rounded text-sm font-mono">
                    {children}
                  </code>
                )
              }
              return (
                <pre className="bg-muted p-3 rounded-md overflow-x-auto mb-2">
                  <code className="text-sm font-mono">{children}</code>
                </pre>
              )
            },
            strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
            em: ({ children }) => <em className="italic">{children}</em>,
            a: ({ href, children }) => (
              <a 
                href={href} 
                className="text-primary hover:underline" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                {children}
              </a>
            ),
          }}
        >
          {cleanContent}
        </ReactMarkdown>
      )
    }
  };
  
  // 渲染图片缩略图组件
  const renderImageThumbnails = () => {
    const imageUrls = extractImageUrls(note.originalContent || note.content);
    
    if (imageUrls.length === 0) {
      return null;
    }

    const handleImageClick = (index: number) => {
      setSelectedImageIndex(index)
      setImageViewerOpen(true)
    }

    return (
      <>
        <div className="mt-3 pt-3 border-t border-border/30">
          <div className="flex flex-wrap gap-2">
            {imageUrls.map((url, index) => (
              <div key={index} className="relative cursor-pointer group" onClick={() => handleImageClick(index)}>
                <img 
                  src={url}
                  alt={`图片 ${index + 1}`}
                  className="w-20 h-20 object-cover rounded-md hover:opacity-80 transition-opacity"
                  onError={(e) => {
                    console.error("图片加载失败:", url);
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded-md flex items-center justify-center">
                  <ZoomIn className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <ImageViewer
          images={imageUrls}
          initialIndex={selectedImageIndex}
          open={imageViewerOpen}
          onOpenChange={setImageViewerOpen}
          isMobile={false}
        />
      </>
    );
  };

  // 处理标签点击
  const handleContentClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.classList.contains('tag-span')) {
      const tag = target.getAttribute('data-tag')
      if (tag && onTagClick) {
        onTagClick(tag)
      }
    }
  }

  const todoCount = note.todos?.length || 0
  const completedTodos = note.todos?.filter((todo) => todo.completed).length || 0

  return (
    <div id={`note-${note.id}`} className="p-2 group hover:shadow-sm transition-shadow bg-card">
      <div className="flex justify-between items-start mb-2">
        {/* 左上角：时间和Todo徽章 */}
        <div className="flex items-center gap-2">
          <div className="text-sm font-medium text-muted-foreground">{formatTime(note.customDate || note.createdAt)}</div>
          {todoCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              <CheckSquare className="h-3 w-3 mr-1" />
              {completedTodos}/{todoCount}
            </Badge>
          )}
        </div>

        {/* 右上角：按钮和标签 */}
        <div className="flex items-center gap-2">
          {!isEditing && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleEdit}
                className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 p-0"
              >
                <Pencil className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleConvertToTodo}
                disabled={isConverting}
                className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 p-0"
              >
                <ListTodo className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                disabled={isDeleting}
                className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 p-0 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </>
          )}
          
          {/* 时间信息显示 */}
          {(() => {
            const contentWithoutImages = removeImagesFromContent(note.originalContent || note.content);
            const contentWithoutTags = removeTagsFromContent(contentWithoutImages);
            const { timeDisplay } = extractTimeFromContent(contentWithoutTags);
            
            return timeDisplay ? (
               <div className="flex items-center gap-1 text-xs text-gray-400">
                 <Clock className="h-3 w-3" />
                 <span>{timeDisplay}</span>
               </div>
             ) : null;
          })()}
          
          {/* 标签显示 */}
          {note.tags && note.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {note.tags.slice(0, 3).map((tag, index) => (
                <Badge 
                  key={index} 
                  variant="secondary" 
                  className="text-xs cursor-pointer hover:bg-secondary/80"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (onTagClick) {
                      onTagClick(tag)
                    }
                  }}
                >                  <Tag className="h-3 w-3 mr-1" />                  {tag}                </Badge>
              ))}
              {note.tags.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{note.tags.length - 3}
                </Badge>
              )}
            </div>
          )}
          
          {isEditing && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
                className="h-7 w-7 p-0 text-green-600 hover:text-green-700"
              >
                <Save className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
              >
                <X className="h-3 w-3" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* 笔记内容 */}
      {isEditing ? (
        <div className="space-y-4">
          {/* 内容编辑 */}
          <Textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="min-h-[100px] resize-none"
            placeholder="编辑笔记内容... (使用 #标签名 格式添加标签)"
          />
          
          {/* 日期时间编辑 */}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              value={editDate}
              onChange={(e) => setEditDate(e.target.value)}
              className="w-auto"
            />
            <Input
              type="time"
              value={editTime}
              onChange={(e) => setEditTime(e.target.value)}
              className="w-auto"
            />
          </div>
          
          {/* 标签管理 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">标签管理</span>
            </div>
            
            {/* 现有标签 */}
            {editTags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {editTags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {tag}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveTag(tag)}
                      className="h-auto w-auto p-0 ml-1 hover:bg-transparent"
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            )}
            
            {/* 添加新标签 */}
            <div className="flex items-center gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={handleTagKeyPress}
                placeholder="输入新标签"
                className="flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddTag}
                disabled={!newTag.trim() || editTags.includes(newTag.trim())}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <div 
            className="text-sm whitespace-pre-wrap break-words"
            style={{ whiteSpace: 'pre-wrap', lineHeight: '1.2' }}
            onClick={handleContentClick}
          >
            {renderNoteContent()}
          </div>
          
          {/* 图片缩略图区域 */}
          {renderImageThumbnails()}
        </div>
      )}

      {/* 分割线 */}
      <div className="border-b border-border/50 mt-4 mb-0" />
    </div>
  )
}
