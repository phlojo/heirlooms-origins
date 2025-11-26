'use client'

import { useEffect, useRef, useState } from 'react'
import Masonry from 'masonry-layout'

interface MasonryGridProps {
  children: React.ReactNode
  isCompact: boolean // Whether in compact view
  gutter?: number
  onColumnWidthChange?: (width: number) => void
}

const BREAKPOINTS = {
  mobile: 640,
  tablet: 768,
  desktop: 1024,
  xl: 1280,
}

// Calculate desired column count based on viewport and view mode
const getDesiredColumns = (width: number, isCompact: boolean): number => {
  if (isCompact) {
    // Compact: 3 cols (mobile) → 4 (md) → 6 (lg) → 8 (xl)
    if (width < BREAKPOINTS.mobile) return 3
    if (width < BREAKPOINTS.tablet) return 3
    if (width < BREAKPOINTS.desktop) return 4
    if (width < BREAKPOINTS.xl) return 6
    return 8
  } else {
    // Standard: 2 cols (mobile) → 3 (md) → 4 (lg) → 6 (xl)
    if (width < BREAKPOINTS.mobile) return 2
    if (width < BREAKPOINTS.tablet) return 2
    if (width < BREAKPOINTS.desktop) return 3
    if (width < BREAKPOINTS.xl) return 4
    return 6
  }
}

export function MasonryGrid({ children, isCompact, gutter = 8, onColumnWidthChange }: MasonryGridProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const masonryRef = useRef<Masonry | null>(null)
  const [containerWidth, setContainerWidth] = useState(0)
  const [columnWidth, setColumnWidth] = useState(200)

  // Calculate column width to fit desired number of columns
  const getColumnWidth = () => {
    if (!containerRef.current || containerWidth === 0) return 200

    const desiredColumns = getDesiredColumns(containerWidth, isCompact)
    const width = Math.floor((containerWidth - gutter * (desiredColumns - 1)) / desiredColumns)
    return width
  }

  const calculatedColumnWidth = getColumnWidth()

  // Notify parent of column width changes
  useEffect(() => {
    if (calculatedColumnWidth !== columnWidth) {
      setColumnWidth(calculatedColumnWidth)
      onColumnWidthChange?.(calculatedColumnWidth)
    }
  }, [calculatedColumnWidth])

  // Initialize container width on mount
  useEffect(() => {
    if (containerRef.current && containerWidth === 0) {
      setContainerWidth(containerRef.current.clientWidth)
    }
  }, [])

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const newWidth = containerRef.current.clientWidth
        if (newWidth !== containerWidth) {
          setContainerWidth(newWidth)
        }
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [containerWidth])

  // Initialize and update Masonry
  useEffect(() => {
    if (!containerRef.current || containerWidth === 0) return

    if (!masonryRef.current) {
      masonryRef.current = new Masonry(containerRef.current, {
        columnWidth: columnWidth,
        gutter,
        transitionDuration: '0.3s',
      })
    } else {
      // Update masonry by reinitializing
      masonryRef.current.destroy()
      masonryRef.current = new Masonry(containerRef.current, {
        columnWidth: columnWidth,
        gutter,
        transitionDuration: '0.3s',
      })
    }

    // Reflow on images load
    const images = containerRef.current.querySelectorAll('img')
    let loadedCount = 0
    const totalImages = images.length

    if (totalImages === 0) {
      if (masonryRef.current) {
        masonryRef.current.reloadItems()
        masonryRef.current.layout()
      }
    } else {
      images.forEach((img) => {
        const handleLoad = () => {
          loadedCount++
          if (loadedCount === totalImages && masonryRef.current) {
            masonryRef.current.reloadItems()
            masonryRef.current.layout()
          }
        }
        const handleError = () => {
          loadedCount++
          if (loadedCount === totalImages && masonryRef.current) {
            masonryRef.current.reloadItems()
            masonryRef.current.layout()
          }
        }

        img.addEventListener('load', handleLoad)
        img.addEventListener('error', handleError)
      })
    }

    // Use ResizeObserver to handle card height changes (for variable-height titles)
    const resizeObserver = new ResizeObserver(() => {
      if (masonryRef.current) {
        masonryRef.current.reloadItems()
        masonryRef.current.layout()
      }
    })

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }

    return () => {
      resizeObserver.disconnect()
    }
  }, [columnWidth, gutter, containerWidth])

  // Reflow when children change
  useEffect(() => {
    if (masonryRef.current) {
      masonryRef.current.reloadItems()
      masonryRef.current.layout()
    }
  }, [children])

  return (
    <div
      ref={containerRef}
      className="w-full"
      style={{
        fontSize: 0
      }}
    >
      {children &&
        (Array.isArray(children)
          ? children.map((child, idx) =>
              child ? (
                <div
                  key={idx}
                  style={{
                    display: 'inline-block',
                    width: `${columnWidth}px`,
                    marginRight: `${gutter}px`,
                    marginBottom: `${gutter}px`,
                    fontSize: 'initial',
                    verticalAlign: 'top',
                    boxSizing: 'border-box',
                  }}
                >
                  {child}
                </div>
              ) : null,
            )
          : children)}
    </div>
  )
}
