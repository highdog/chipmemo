'use client'

import { useParams } from 'next/navigation'
import { TagContent } from '@/components/tag-content'
import { Card, CardContent } from '@/components/ui/card'

interface TagPageProps {
  params: {
    tag: string
  }
}

export default function TagPage({ params }: TagPageProps) {
  const { tag } = useParams()
  const decodedTag = decodeURIComponent(tag as string)

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">标签: {decodedTag}</h1>
        <p className="text-muted-foreground">
          这里是关于 #{decodedTag} 标签的固定内容页面
        </p>
      </div>
      
      <TagContent tag={decodedTag} />
    </div>
  )
}