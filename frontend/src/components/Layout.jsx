import { useState, useCallback, useRef, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'

function readCollapsed() {
  try { return localStorage.getItem('knotfix_sidebar_collapsed') === 'true' } catch { return false }
}

export default function Layout({ children }) {
  const initial = readCollapsed()
  const [isCollapsed, setIsCollapsed] = useState(initial)
  const [headerCollapsed, setHeaderCollapsed] = useState(initial)
  const [widthOpen, setWidthOpen] = useState(!initial)
  const [animClass, setAnimClass] = useState('')
  const [isAnimating, setIsAnimating] = useState(false)

  const timers = useRef([])
  const clearAllTimers = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }

  useEffect(() => () => clearAllTimers(), [])

  // ── Collapse flow: sidebar slides left, width closes, header shows pill ──
  const handleCollapse = useCallback(() => {
    clearAllTimers()
    try { localStorage.setItem('knotfix_sidebar_collapsed', 'true') } catch {}
    setIsCollapsed(true)
    setIsAnimating(true)

    // Phase 1 (0ms): Sidebar slides left
    setAnimClass('sidebar-roll-up')

    // Phase 2 (60ms): Width starts closing
    timers.current.push(setTimeout(() => {
      setWidthOpen(false)
    }, 60))

    // Phase 3 (220ms): Header switches to pill mode
    timers.current.push(setTimeout(() => {
      setHeaderCollapsed(true)
    }, 220))

    // Phase 4 (360ms): Animation settled
    timers.current.push(setTimeout(() => {
      setAnimClass('')
      setIsAnimating(false)
    }, 360))
  }, [])

  // ── Expand flow: header reverts, sidebar slides in from left ──
  const handleExpand = useCallback(() => {
    clearAllTimers()
    try { localStorage.setItem('knotfix_sidebar_collapsed', 'false') } catch {}
    setIsCollapsed(false)
    setIsAnimating(true)

    // Phase 1 (0ms): Width opens and header reverts immediately
    setWidthOpen(true)
    setHeaderCollapsed(false)
    setAnimClass('sidebar-drop-in')

    // Phase 2 (400ms): Settled
    timers.current.push(setTimeout(() => {
      setAnimClass('')
      setIsAnimating(false)
    }, 400))
  }, [])

  const toggle = useCallback(() => {
    if (isCollapsed) {
      handleExpand()
    } else {
      handleCollapse()
    }
  }, [isCollapsed, handleExpand, handleCollapse])

  const collapse = useCallback(() => {
    if (!isCollapsed) {
      handleCollapse()
    }
  }, [isCollapsed, handleCollapse])

  const outerStyle = {
    flexShrink: 0,
    width: widthOpen ? '16rem' : 0,
    marginRight: widthOpen ? '0.875rem' : 0,
    position: 'relative',
    zIndex: isAnimating ? 30 : 1,
    overflow: 'hidden',
    transition: 'width 320ms cubic-bezier(0.4, 0, 0.2, 1), margin-right 320ms cubic-bezier(0.4, 0, 0.2, 1)',
    pointerEvents: !widthOpen && !isAnimating ? 'none' : 'auto',
    opacity: !widthOpen && !isAnimating ? 0 : 1,
  }

  return (
    <div
      className="bg-[#f4f6fb] p-3 flex flex-col gap-3.5"
      style={{ height: '100dvh', overflow: 'hidden' }}
    >
      {/* Full-width floating header */}
      <Header collapsed={headerCollapsed} onToggle={toggle} />

      {/* Split body */}
      <div
        className="flex-1 min-h-0 flex relative"
        style={{ overflow: 'hidden' }}
      >
        {/* Sidebar outer clip (width-animating) */}
        <div style={outerStyle}>
          {/* Sidebar inner (plays keyframe roll-up / drop-in) */}
          <div
            className={animClass}
            style={{
              height: '100%',
              width: '16rem',
              flexShrink: 0,
              willChange: isAnimating ? 'transform, clip-path, opacity' : 'auto',
            }}
          >
            <Sidebar onCollapse={collapse} />
          </div>
        </div>

        {/* Main content panel */}
        <main className="flex-1 bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-y-auto min-w-0">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  )
}
