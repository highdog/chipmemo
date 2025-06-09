"use server"

import { revalidatePath } from "next/cache"
import { extractTags, removeTagsFromContent } from "./utils"

export interface Todo {
  id: string
  text: string
  completed: boolean
  priority?: 'low' | 'medium' | 'high'
  dueDate?: string
  startDate?: string
  category?: string
  tags?: string[]
  createdAt: string
  updatedAt: string
}

export interface Note {
  id: string
  content: string
  originalContent: string // 保存原始内容（包含标签）
  date: string
  createdAt: string
  tags: string[]
  imageUrl?: string // 添加图片URL字段
  todos?: Todo[] // 添加todos属性
}

// 模拟数据库存储
const notesStorage: Note[] = []



export async function getNotes(): Promise<Note[]> {
  await new Promise((resolve) => setTimeout(resolve, 300))
  return [...notesStorage].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export async function addNote(content: string, date: string, imageUrl?: string): Promise<{ success: boolean; error?: string }> {
  try {
    await new Promise((resolve) => setTimeout(resolve, 500))

    if (!content.trim()) {
      return { success: false, error: "笔记内容不能为空" }
    }

    const originalContent = content.trim()
    const tags = extractTags(originalContent)
    const cleanContent = removeTagsFromContent(originalContent)

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

      tags,
      imageUrl, // 添加图片URL
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
