'use client'

import React, { useState, useEffect, useRef } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ImageViewerProps {
  images: string[]
  initialIndex: number
  open: boolean
  onOpenChange: (open: boolean) => void
  isMobile?: boolean
}

export function ImageViewer({ images, initialIndex, open, onOpenChange, isMobile = false }: ImageViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)
  const [scale, setScale] = useState(1)
  const [translateX, setTranslateX] = useState(0)
  const [translateY, setTranslateY] = useState(0)
  const [lastTap, setLastTap] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [initialDistance, setInitialDistance] = useState(0)
  const [initialScale, setInitialScale] = useState(1)
  const [isScaling, setIsScaling] = useState(false)
  const [scaleCenter, setScaleCenter] = useState({ x: 0, y: 0 })
  const imageRef = useRef<HTMLImageElement>(null)
  const scaleTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    setCurrentIndex(initialIndex)
    // 重置缩放状态
    setScale(1)
    setTranslateX(0)
    setTranslateY(0)
    setIsScaling(false)
  }, [initialIndex, open])

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))
  }

  const goToNext = () => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))
  }

  // 处理双击缩放
  const handleDoubleClick = () => {
    if (scale <= 1.1) {
      setSmoothScale(2)
    } else {
      setSmoothScale(1)
      setTranslateX(0)
      setTranslateY(0)
    }
  }

  // 清理定时器
  useEffect(() => {
    return () => {
      if (scaleTimeoutRef.current) {
        clearTimeout(scaleTimeoutRef.current)
      }
    }
  }, [])

  // 计算两点间距离
  const getDistance = (touch1: React.Touch, touch2: React.Touch) => {
    return Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) +
      Math.pow(touch2.clientY - touch1.clientY, 2)
    )
  }

  // 计算两点中心
  const getCenter = (touch1: React.Touch, touch2: React.Touch) => {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2
    }
  }

  // 平滑设置缩放值
  const setSmoothScale = (newScale: number) => {
    if (scaleTimeoutRef.current) {
      clearTimeout(scaleTimeoutRef.current)
    }
    
    setIsScaling(true)
    setScale(newScale)
    
    // 延迟重置缩放状态，给动画更多时间
    scaleTimeoutRef.current = setTimeout(() => {
      setIsScaling(false)
    }, 200)
  }

  // 处理触摸事件（移动端滑动和缩放）
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isMobile) return
    
    e.preventDefault()
    const touches = e.touches
    
    if (touches.length === 1) {
      // 单指触摸
      const now = Date.now()
      const DOUBLE_TAP_DELAY = 300
      
      if (now - lastTap < DOUBLE_TAP_DELAY) {
        handleDoubleClick()
        return
      }
      setLastTap(now)
      
      if (scale === 1) {
        // 未缩放时处理滑动切换
        setTouchEnd(null)
        setTouchStart(touches[0].clientX)
      } else {
        // 已缩放时处理拖拽
        setIsDragging(true)
        setDragStart({ x: touches[0].clientX, y: touches[0].clientY })
      }
    } else if (touches.length === 2) {
      // 双指捏合缩放
      const distance = getDistance(touches[0], touches[1])
      const center = getCenter(touches[0], touches[1])
      
      setInitialDistance(distance)
      setInitialScale(scale)
      setScaleCenter(center)
      setIsScaling(true)
      
      // 阻止滑动切换
      setTouchStart(null)
      setTouchEnd(null)
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isMobile) return
    
    e.preventDefault()
    const touches = e.touches
    
    if (touches.length === 1) {
      if (scale === 1 && !isScaling) {
        // 未缩放时处理滑动
        setTouchEnd(touches[0].clientX)
      } else if (isDragging && scale > 1.1 && !isScaling) {
        // 已缩放时处理拖拽
        const deltaX = touches[0].clientX - dragStart.x
        const deltaY = touches[0].clientY - dragStart.y
        
        // 改进的边界限制
        const imageRect = imageRef.current?.getBoundingClientRect()
        if (imageRect) {
          const maxTranslateX = Math.max(0, (imageRect.width * scale - imageRect.width) / 2)
          const maxTranslateY = Math.max(0, (imageRect.height * scale - imageRect.height) / 2)
          
          const newTranslateX = Math.max(-maxTranslateX, Math.min(maxTranslateX, translateX + deltaX))
          const newTranslateY = Math.max(-maxTranslateY, Math.min(maxTranslateY, translateY + deltaY))
          
          setTranslateX(newTranslateX)
          setTranslateY(newTranslateY)
        }
        setDragStart({ x: touches[0].clientX, y: touches[0].clientY })
      }
    } else if (touches.length === 2 && initialDistance > 0) {
      // 双指缩放
      const distance = getDistance(touches[0], touches[1])
      const scaleRatio = distance / initialDistance
      
      // 使用更平滑的缩放算法
      const rawScale = initialScale * scaleRatio
      const newScale = Math.max(0.8, Math.min(4, rawScale))
      
      // 平滑设置缩放
      setSmoothScale(newScale)
      
      if (newScale <= 1.1) {
        setTranslateX(0)
        setTranslateY(0)
      }
    }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isMobile) return
    
    setIsDragging(false)
    setInitialDistance(0)
    
    // 延迟重置缩放状态
    setTimeout(() => {
      setIsScaling(false)
    }, 100)
    
    // 处理滑动切换（仅在未缩放且未进行缩放操作时）
    if (scale <= 1.1 && !isScaling && touchStart !== null && touchEnd !== null) {
      const distance = touchStart - touchEnd
      const isLeftSwipe = distance > 50
      const isRightSwipe = distance < -50

      if (isLeftSwipe && images.length > 1) {
        goToNext()
      }
      if (isRightSwipe && images.length > 1) {
        goToPrevious()
      }
    }
  }

  // 处理键盘事件
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return
      
      if (e.key === 'ArrowLeft' && images.length > 1) {
        goToPrevious()
      } else if (e.key === 'ArrowRight' && images.length > 1) {
        goToNext()
      } else if (e.key === 'Escape') {
        onOpenChange(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, images.length])

  if (images.length === 0) return null

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay 
          className="fixed inset-0 z-50 bg-black/90 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          onClick={() => onOpenChange(false)}
        />
        <DialogPrimitive.Content
          className="fixed left-[50%] top-[50%] z-50 w-full h-full translate-x-[-50%] translate-y-[-50%] focus:outline-none"
        >
          <div className="relative w-full h-full flex items-center justify-center p-4">
            {/* 图片 */}
            <img
              ref={imageRef}
              src={images[currentIndex]}
              alt={`图片 ${currentIndex + 1}`}
              className={cn(
                "max-w-full max-h-full object-contain select-none",
                isScaling ? "transition-none" : "transition-transform duration-300 ease-out"
              )}
              style={{
                transform: `scale(${scale}) translate(${translateX / scale}px, ${translateY / scale}px)`,
                cursor: isMobile ? 'pointer' : 'default',
                touchAction: 'none',
                userSelect: 'none',
                WebkitUserSelect: 'none'
              }}
              onError={(e) => {
                console.error('图片加载失败:', images[currentIndex])
              }}
              onTouchStart={isMobile ? handleTouchStart : undefined}
              onTouchMove={isMobile ? handleTouchMove : undefined}
              onTouchEnd={isMobile ? handleTouchEnd : undefined}
              draggable={false}
            />
            
            {/* 关闭按钮 */}
            <button
              onClick={() => onOpenChange(false)}
              className="absolute right-4 top-4 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors z-20"
            >
              <X className="h-4 w-4" />
            </button>
            
            {/* 左右切换按钮 - 仅在非移动端显示 */}
            {!isMobile && images.length > 1 && (
              <>
                <button
                  onClick={goToPrevious}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors z-10"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  onClick={goToNext}
                  className="absolute right-16 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors z-10"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}
            
            {/* 图片计数器 - 非移动端 */}
            {!isMobile && images.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                {currentIndex + 1} / {images.length}
              </div>
            )}
            
            {/* 小点指示器 - 移动端 */}
            {isMobile && images.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
                {images.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentIndex(index)}
                    className={cn(
                      "w-2 h-2 rounded-full transition-all duration-200",
                      index === currentIndex
                        ? "bg-white scale-125"
                        : "bg-white/50 hover:bg-white/70"
                    )}
                  />
                ))}
              </div>
            )}
            
            {/* 缩放提示 - 移动端 */}
            {isMobile && scale > 1 && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                {Math.round(scale * 100)}%
              </div>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}