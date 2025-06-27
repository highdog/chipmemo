"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Trash2, CheckSquare, Tag, ListTodo, Pencil, Save, X } from "lucide-react"
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
  const [editTags, setEditTags] = useState<string[]>([])

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
    setEditTags([...note.tags])
    setIsEditing(true)
  }

  // 保存编辑后的笔记
  const handleSave = async () => {
    if (!editContent.trim()) {
      toast({
        title: "内容不能为空",
        description: "请输入笔记内容",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    try {
      if (onUpdate) {
        await onUpdate(note.id, editContent, editTags)
        setIsEditing(false)
        toast({
          title: "保存成功",
          description: "笔记已更新",
        })
      }
    } catch (error) {
      toast({
        title: "保存失败",
        description: "更新笔记失败，请重试",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  // 取消编辑
  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditContent('')
    setEditTags([])
  }

  // 处理标签输入
  const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const tagsInput = e.target.value
    // 将输入的标签字符串分割成数组
    const tagsArray = tagsInput.split(/[,\s]+/).filter(tag => tag.trim() !== '')
    setEditTags(tagsArray)
  }

  // 渲染笔记内容的组件
  const renderNoteContent = () => {
    // 自定义组件来处理标签点击
    const components = {
      p: ({ children, ...props }: any) => {
        return (
          <p {...props} className="mb-2 last:mb-0" style={{ lineHeight: '1.5' }}>
            {processTextWithTags(children)}
          </p>
        );
      },
      // 处理其他Markdown元素
      h1: ({ children, ...props }: any) => <h1 {...props} className="text-xl font-bold mb-2" style={{ lineHeight: '1.4' }}>{processTextWithTags(children)}</h1>,
      h2: ({ children, ...props }: any) => <h2 {...props} className="text-lg font-semibold mb-2" style={{ lineHeight: '1.4' }}>{processTextWithTags(children)}</h2>,
      h3: ({ children, ...props }: any) => <h3 {...props} className="text-base font-medium mb-2" style={{ lineHeight: '1.4' }}>{processTextWithTags(children)}</h3>,
      ul: ({ children, ...props }: any) => <ul {...props} className="list-disc list-inside mb-2" style={{ lineHeight: '1.5' }}>{children}</ul>,
      ol: ({ children, ...props }: any) => <ol {...props} className="list-decimal list-inside mb-2" style={{ lineHeight: '1.5' }}>{children}</ol>,
      li: ({ children, ...props }: any) => <li {...props}>{processTextWithTags(children)}</li>,
      blockquote: ({ children, ...props }: any) => (
          <blockquote {...props} className="border-l-4 border-gray-300 pl-4 italic mb-2" style={{ lineHeight: '1.5' }}>
            {processTextWithTags(children)}
          </blockquote>
        ),
      code: ({ children, ...props }: any) => (
        <code {...props} className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm">
          {children}
        </code>
      ),
      pre: ({ children, ...props }: any) => (
        <pre {...props} className="bg-gray-100 dark:bg-gray-800 p-3 rounded mb-2 overflow-x-auto">
          {children}
        </pre>
      ),
      // 自定义图片渲染器
      img: ({ src, alt, ...props }: any) => (
        <div className="mt-2 mb-2">
          <img 
            {...props}
            src={src}
            alt={alt || '笔记图片'}
            className="rounded-md max-w-full max-h-96 object-contain border shadow-sm"
            onError={(e) => {
              console.error("图片加载失败:", src);
              e.currentTarget.style.display = 'none';
            }}
            onLoad={(e) => {
              console.log("图片加载成功:", src);
            }}
          />
        </div>
      ),
    };


    
    return (
      <div className="markdown-content">
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkBreaks]}
          components={components}
        >
          {note.originalContent || note.content}
        </ReactMarkdown>
      </div>
    );
  };

  // 处理文本中的标签和搜索高亮
  const processTextWithTags = (children: any): any => {
    if (typeof children === 'string') {
      return processStringWithTagsAndHighlight(children);
    }
    
    if (Array.isArray(children)) {
      return children.map((child, index) => {
        if (typeof child === 'string') {
          return <span key={index}>{processStringWithTagsAndHighlight(child)}</span>;
        }
        return child;
      });
    }
    
    return children;
  };

  // 处理字符串中的标签和搜索高亮
  const processStringWithTagsAndHighlight = (text: string) => {
    const tagRegex = /#[\w\u4e00-\u9fa5]+/g;
    // 移除标签文字，只保留其他内容
    const textWithoutTags = text.replace(tagRegex, '').replace(/\s+/g, ' ').trim();
    
    if (!textWithoutTags) {
      return null;
    }
    
    // 处理搜索高亮
    if (searchTerm && textWithoutTags.toLowerCase().includes(searchTerm.toLowerCase())) {
      const regex = new RegExp(`(${searchTerm})`, 'gi');
      const highlightedParts = textWithoutTags.split(regex);
      return (
        <span>
          {highlightedParts.map((part, index) => 
            regex.test(part) ? (
              <span key={index} className="bg-yellow-200 dark:bg-yellow-800">
                {part}
              </span>
            ) : (
              part
            )
          )}
        </span>
      );
    }
    
    return textWithoutTags;
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
    <div id={`note-${note.id}`} className="p-3 group hover:shadow-sm transition-shadow bg-card">
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
          <Button
            variant="ghost"
            size="sm"
            onClick={handleEdit}
            disabled={isEditing}
            className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
            title="编辑笔记"
          >
            <Pencil className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleConvertToTodo}
            disabled={isConverting || isEditing}
            className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
            title="转换为Todo"
          >
            <ListTodo className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting || isEditing}
            className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
            title="删除笔记"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
          {note.tags.length > 0 && (
            <div className="flex items-center gap-1">
              <Tag className="h-3 w-3 text-muted-foreground" />
              <div className="flex gap-1">
                {note.tags.slice(0, 3).map((tag) => (
                  <Badge 
                    key={tag} 
                    variant="outline" 
                    className="text-xs cursor-pointer hover:bg-muted bg-gray-100 dark:bg-gray-800"
                    onClick={() => onTagClick && onTagClick(tag)}
                  >
                    #{tag}
                  </Badge>
                ))}
                {note.tags.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{note.tags.length - 3}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      {isEditing ? (
        <div className="space-y-3">
          <Textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="min-h-[100px] text-sm"
            placeholder="输入笔记内容..."
          />
          <div className="flex flex-col space-y-2">
            <div className="text-sm font-medium">标签:</div>
            <Input
              value={editTags.join(', ')}
              onChange={handleTagsChange}
              className="text-sm"
              placeholder="输入标签，用逗号或空格分隔"
            />
            <div className="flex justify-end space-x-2 mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelEdit}
                className="h-8"
              >
                <X className="h-3 w-3 mr-1" />
                取消
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
                className="h-8"
              >
                {isSaving ? (
                  <span>保存中...</span>
                ) : (
                  <>
                    <Save className="h-3 w-3 mr-1" />
                    保存
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div 
          className="text-sm whitespace-pre-wrap break-words"
          style={{ whiteSpace: 'pre-wrap', lineHeight: '1.2' }}
          onClick={handleContentClick}
        >
          {renderNoteContent()}
        </div>
      )}

      {/* 分割线 */}
      <div className="border-b border-border/50 my-3" />
    </div>
  )
}
