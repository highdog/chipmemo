// 解析笔记中的所有标签
export function extractTags(content: string): string[] {
  const tagRegex = /#(\w+)/g
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

// 高亮显示标签
export function highlightTags(content: string): string {
  return content.replace(
    /#(\w+)/g,
    '<span class="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-xs font-medium">#$1</span>',
  )
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
