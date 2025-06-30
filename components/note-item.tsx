"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Trash2, CheckSquare, Tag, ListTodo, Pencil, Save, X, ZoomIn } from "lucide-react"
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
  onUpdate?: (noteId: string, content: string, tags: string[]) => Promise<void>
}

export function NoteItem({ note, onDelete, searchTerm, onTagClick, onConvertToTodo, onUpdate }: NoteItemProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [isConverting, setIsConverting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editContent, setEditContent] = useState('')
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
    setIsEditing(true)
  }

  // 保存编辑
  const handleSave = async () => {
    if (!onUpdate) return
    
    setIsSaving(true)
    try {
      // 从内容中提取标签
      const extractedTags = extractTags(editContent)
      await onUpdate(note.id, editContent, extractedTags)
      setIsEditing(false)
      toast({
        title: "保存成功",
        description: "笔记已更新",
      })
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

  // 渲染笔记内容（不含图片和标签）
  const renderNoteContent = () => {
    const contentWithoutImages = removeImagesFromContent(note.originalContent || note.content);
    const contentWithoutTags = removeTagsFromContent(contentWithoutImages);
    
    if (searchTerm) {
      // 不再高亮标签，因为标签已被移除
      const content = contentWithoutTags
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
          {contentWithoutTags}
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
          <div className="text-sm font-medium text-muted-foreground">{formatTime(note.createdAt)}</div>
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
        <div className="space-y-3">
          <Textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="min-h-[100px] resize-none"
            placeholder="编辑笔记内容... (使用 #标签名 格式添加标签)"
          />
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
