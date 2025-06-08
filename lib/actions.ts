"use server"

import { revalidatePath } from "next/cache"
import { extractTags, removeTagsFromContent } from "./utils"

export interface Note {
  id: string
  content: string
  originalContent: string // 保存原始内容（包含标签）
  date: string
  createdAt: string
  todos?: TodoItem[]
  tags: string[]
}

export interface TodoItem {
  id: string
  content: string
  completed: boolean
}

// 模拟数据库存储
const notesStorage: Note[] = []

// 解析笔记内容中的todo项 - 支持中英文
function parseTodos(content: string): TodoItem[] {
  // 修改正则表达式以支持中文字符
  const todoRegex = /#todo\s+([\s\S]*?)(?=\n#|$)/gi
  const todos: TodoItem[] = []
  let match

  while ((match = todoRegex.exec(content)) !== null) {
    const todoContent = match[1].trim()
    if (todoContent) {
      todos.push({
        id: `todo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        content: todoContent,
        completed: false,
      })
    }
  }

  return todos
}

export async function getNotes(): Promise<Note[]> {
  await new Promise((resolve) => setTimeout(resolve, 300))
  return [...notesStorage].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export async function addNote(content: string, date: string): Promise<{ success: boolean; error?: string }> {
  try {
    await new Promise((resolve) => setTimeout(resolve, 500))

    if (!content.trim()) {
      return { success: false, error: "笔记内容不能为空" }
    }

    const originalContent = content.trim()
    const tags = extractTags(originalContent)
    const cleanContent = removeTagsFromContent(originalContent)
    const todos = parseTodos(originalContent)

    // 使用传入的日期参数，但保留当前的时间
    const selectedDate = new Date(date)
    const currentTime = new Date()
    
    // 创建一个新的日期对象，使用选择的日期和当前的时间
    const createdAtDate = new Date(selectedDate)
    createdAtDate.setHours(currentTime.getHours())
    createdAtDate.setMinutes(currentTime.getMinutes())
    createdAtDate.setSeconds(currentTime.getSeconds())
    createdAtDate.setMilliseconds(currentTime.getMilliseconds())
    
    const newNote: Note = {
      id: Date.now().toString(),
      content: cleanContent,
      originalContent,
      date,
      createdAt: createdAtDate.toISOString(), // 使用选择的日期但保留当前时间
      todos,
      tags,
    }

    notesStorage.push(newNote)
    revalidatePath("/")

    return { success: true }
  } catch (error) {
    return { success: false, error: "添加笔记失败，请重试" }
  }
}

export async function deleteNote(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await new Promise((resolve) => setTimeout(resolve, 300))

    const index = notesStorage.findIndex((note) => note.id === id)
    if (index === -1) {
      return { success: false, error: "笔记不存在" }
    }

    notesStorage.splice(index, 1)
    revalidatePath("/")

    return { success: true }
  } catch (error) {
    return { success: false, error: "删除笔记失败，请重试" }
  }
}

export async function toggleTodo(noteId: string, todoId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await new Promise((resolve) => setTimeout(resolve, 200))

    const note = notesStorage.find((n) => n.id === noteId)
    if (!note || !note.todos) {
      return { success: false, error: "笔记或todo不存在" }
    }

    const todo = note.todos.find((t) => t.id === todoId)
    if (!todo) {
      return { success: false, error: "Todo项不存在" }
    }

    todo.completed = !todo.completed
    revalidatePath("/")

    return { success: true }
  } catch (error) {
    return { success: false, error: "更新todo状态失败" }
  }
}

// 获取指定日期的todos
export async function getTodosByDate(date: string): Promise<{ noteId: string; todos: TodoItem[] }[]> {
  await new Promise((resolve) => setTimeout(resolve, 200))

  const targetDate = new Date(date).toDateString()

  return notesStorage
    .filter((note) => {
      const noteDate = new Date(note.date).toDateString()
      return noteDate === targetDate && note.todos && note.todos.length > 0
    })
    .map((note) => ({
      noteId: note.id,
      todos: note.todos || [],
    }))
}

// 搜索笔记
export async function searchNotes(searchTerm: string): Promise<Note[]> {
  await new Promise((resolve) => setTimeout(resolve, 200))

  if (!searchTerm.trim()) {
    return getNotes()
  }

  const term = searchTerm.toLowerCase()

  return notesStorage
    .filter((note) => {
      // 搜索内容
      if (note.content.toLowerCase().includes(term)) {
        return true
      }
      // 搜索标签
      return note.tags.some((tag) => tag.includes(term))
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

// 按标签搜索笔记
export async function searchNotesByTag(tag: string): Promise<Note[]> {
  await new Promise((resolve) => setTimeout(resolve, 200))

  return notesStorage
    .filter((note) => note.tags.includes(tag.toLowerCase()))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}
