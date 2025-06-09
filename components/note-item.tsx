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
    setIsConverting(true)
    try {
      // 创建todo
      const todoResult = await apiClient.createTodo({
        text: note.content,
        tags: note.tags,
        priority: 'medium'
      })
      
      if (todoResult.success) {
        // 删除笔记
        const deleteResult = await deleteNote(note.id)
        if (deleteResult.success) {
          onConvertToTodo && onConvertToTodo()
          toast({
            title: "转换成功",
            description: "笔记已转换为Todo事项并删除原笔记",
          })
        } else {
          toast({
            title: "转换失败",
            description: "Todo创建成功但删除笔记失败",
            variant: "destructive",
          })
        }
      } else {
        toast({
          title: "转换失败",
          description: todoResult.error || "创建Todo失败",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "转换失败",
        description: "网络错误，请重试",
        variant: "destructive",
      })
    } finally {
      setIsConverting(false)
    }
  }

  // 高亮搜索内容
  const highlightSearchTerm = (content: string) => {
    if (!searchTerm) return highlightTags(content)

    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi")
    const highlighted = content.replace(regex, '<mark class="bg-yellow-200">$1</mark>')
    return highlightTags(highlighted)
  }

  const todoCount = note.todos?.length || 0
  const completedTodos = note.todos?.filter((todo) => todo.completed).length || 0

  return (
    <div className="p-3 border rounded-lg group hover:shadow-sm transition-shadow bg-card">
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
      <div>
        <div className="whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: highlightSearchTerm(note.content) }} />
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
    </div>
  )
}
