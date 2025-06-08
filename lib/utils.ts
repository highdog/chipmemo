import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

// 日期格式化函数
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date

  // Format: YYYY年MM月DD日 HH:MM
  const year = d.getFullYear()
  const month = (d.getMonth() + 1).toString().padStart(2, "0")
  const day = d.getDate().toString().padStart(2, "0")
  const hours = d.getHours().toString().padStart(2, "0")
  const minutes = d.getMinutes().toString().padStart(2, "0")

  return `${year}年${month}月${day}日 ${hours}:${minutes}`
}

export function formatDateShort(date: Date): string {
  // Format: YYYY年MM月DD日
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, "0")
  const day = date.getDate().toString().padStart(2, "0")

  return `${year}年${month}月${day}日`
}

export function formatTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date

  // Format: HH:MM
  const hours = d.getHours().toString().padStart(2, "0")
  const minutes = d.getMinutes().toString().padStart(2, "0")

  return `${hours}:${minutes}`
}

export function formatDateOnly(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date

  // Format: YYYY年MM月DD日
  const year = d.getFullYear()
  const month = (d.getMonth() + 1).toString().padStart(2, "0")
  const day = d.getDate().toString().padStart(2, "0")

  return `${year}年${month}月${day}日`
}

// 获取日期的字符串表示，用于分组
export function getDateKey(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  // 只返回日期部分，不包含时间，用于按日期分组
  return d.toDateString()
}

// 标签工具函数 - 支持中英文
export function extractTags(content: string): string[] {
  // 修改正则表达式以支持中文字符
  const tagRegex = /#([\w\u4e00-\u9fff]+)/g
  const tags: string[] = []
  let match

  while ((match = tagRegex.exec(content)) !== null) {
    const tag = match[1].toLowerCase()
    if (!tags.includes(tag)) {
      tags.push(tag)
    }
  }

  return tags
}

// 从内容中移除标签，返回纯净的内容 - 支持中英文
export function removeTagsFromContent(content: string): string {
  return content
    .replace(/#[\w\u4e00-\u9fff]+/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

// 搜索匹配函数
export function matchesSearch(content: string, tags: string[], searchTerm: string): boolean {
  if (!searchTerm.trim()) return true

  const term = searchTerm.toLowerCase()

  // 搜索内容
  if (content.toLowerCase().includes(term)) {
    return true
  }

  // 搜索标签
  return tags.some((tag) => tag.includes(term))
}
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
