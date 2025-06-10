"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Trash2, CheckSquare, Tag, ListTodo } from "lucide-react"
import { deleteNote, type Note } from "@/lib/actions"
import { formatTime } from "@/lib/date-utils"
import { highlightTags } from "@/lib/tag-utils"
import { toast } from "@/hooks/use-toast"
import { apiClient } from "@/lib/api"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'


interface NoteItemProps {
  note: Note
  onDelete: () => void
  searchTerm?: string
  onTagClick?: (tag: string) => void
  onConvertToTodo?: () => void
}

export function NoteItem({ note, onDelete, searchTerm, onTagClick, onConvertToTodo }: NoteItemProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [isConverting, setIsConverting] = useState(false)

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

  // 渲染笔记内容的组件
  const renderNoteContent = () => {
    // 自定义组件来处理标签点击
    const components = {
      p: ({ children, ...props }: any) => {
        return (
          <p {...props} className="mb-2 last:mb-0">
            {processTextWithTags(children)}
          </p>
        );
      },
      // 处理其他Markdown元素
      h1: ({ children, ...props }: any) => <h1 {...props} className="text-xl font-bold mb-2">{processTextWithTags(children)}</h1>,
      h2: ({ children, ...props }: any) => <h2 {...props} className="text-lg font-semibold mb-2">{processTextWithTags(children)}</h2>,
      h3: ({ children, ...props }: any) => <h3 {...props} className="text-base font-medium mb-1">{processTextWithTags(children)}</h3>,
      ul: ({ children, ...props }: any) => <ul {...props} className="list-disc list-inside mb-2">{children}</ul>,
      ol: ({ children, ...props }: any) => <ol {...props} className="list-decimal list-inside mb-2">{children}</ol>,
      li: ({ children, ...props }: any) => <li {...props}>{processTextWithTags(children)}</li>,
      blockquote: ({ children, ...props }: any) => (
        <blockquote {...props} className="border-l-4 border-gray-300 pl-4 italic mb-2">
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
    };

    return (
      <div className="markdown-content">
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkBreaks]}
          components={components}
        >
          {note.content}
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
    const parts = text.split(tagRegex);
    const tags = text.match(tagRegex) || [];
    
    const result = [];
    
    for (let i = 0; i < parts.length; i++) {
      if (parts[i]) {
        // 处理搜索高亮
        if (searchTerm && parts[i].toLowerCase().includes(searchTerm.toLowerCase())) {
          const regex = new RegExp(`(${searchTerm})`, 'gi');
          const highlightedParts = parts[i].split(regex);
          result.push(
            <span key={`text-${i}`}>
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
        } else {
          result.push(<span key={`text-${i}`}>{parts[i]}</span>);
        }
      }
      
      // 添加标签
      if (tags[i]) {
        result.push(
          <span
            key={`tag-${i}`}
            className="text-blue-600 dark:text-blue-400 cursor-pointer hover:underline font-medium"
            onClick={() => onTagClick && onTagClick(tags[i].substring(1))}
          >
            {tags[i]}
          </span>
        );
      }
    }
    
    return result;
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
    <div id={`note-${note.id}`} className="p-3 border rounded-lg group hover:shadow-sm transition-shadow bg-card">
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

        {/* 右上角：标签和删除按钮 */}
        <div className="flex items-center gap-2">
          {note.tags.length > 0 && (
            <div className="flex items-center gap-1">
              <Tag className="h-3 w-3 text-muted-foreground" />
              <div className="flex gap-1">
                {note.tags.slice(0, 3).map((tag) => (
                  <Badge 
                    key={tag} 
                    variant="outline" 
                    className="text-xs cursor-pointer hover:bg-muted"
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
          <Button
            variant="ghost"
            size="sm"
            onClick={handleConvertToTodo}
            disabled={isConverting}
            className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 mr-1"
            title="转换为Todo"
          >
            <ListTodo className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting}
            className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
      <div 
        className="text-sm leading-relaxed whitespace-pre-wrap break-words"
        style={{ whiteSpace: 'pre-wrap' }}
        onClick={handleContentClick}
      >
        {renderNoteContent()}
      </div>
        {note.imageUrl && note.imageUrl.trim() !== "" && (
          <div className="mt-2">
            <img 
              src={note.imageUrl} 
              alt="笔记图片" 
              className="rounded-md max-w-full max-h-96 object-contain border shadow-sm" 
              onError={(e) => {
                console.error("图片加载失败:", note.imageUrl);
                e.currentTarget.style.display = 'none';
              }}
              onLoad={(e) => {
                console.log("图片加载成功:", note.imageUrl);
              }}
            />
          </div>
        )}
    </div>
  )
}
