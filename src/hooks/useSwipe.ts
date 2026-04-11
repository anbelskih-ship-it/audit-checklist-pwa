import { useRef, useCallback } from 'react'

interface SwipeHandlers {
  onTouchStart: (e: React.TouchEvent) => void
  onTouchEnd: (e: React.TouchEvent) => void
}

export function useSwipe(onLeft: () => void, onRight: () => void, threshold = 50): SwipeHandlers {
  const startX = useRef(0)
  const startY = useRef(0)

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX
    startY.current = e.touches[0].clientY
  }, [])

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - startX.current
    const dy = e.changedTouches[0].clientY - startY.current

    // Only trigger if horizontal movement > threshold and > vertical movement
    if (Math.abs(dx) > threshold && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx > 0) onRight()  // swipe right = go back
      else onLeft()           // swipe left = go forward
    }
  }, [onLeft, onRight, threshold])

  return { onTouchStart, onTouchEnd }
}
