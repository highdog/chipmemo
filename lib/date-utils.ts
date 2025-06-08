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
  return d.toDateString()
}
