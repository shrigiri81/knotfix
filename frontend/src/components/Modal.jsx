import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

export default function Modal({ open, onClose, title, children, size = 'md' }) {
  const backdropRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  // Block interaction with background content when modal is open
  useEffect(() => {
    if (!open) return
    const root = document.getElementById('root')
    if (!root) return
    root.setAttribute('inert', '')
    root.setAttribute('aria-hidden', 'true')
    return () => {
      root.removeAttribute('inert')
      root.removeAttribute('aria-hidden')
    }
  }, [open])

  if (!open) return null

  const sizeClass = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }[size] || 'max-w-lg'

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(11,28,48,0.4)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === backdropRef.current) onClose() }}
    >
      <div
        className={`${sizeClass} w-full bg-white rounded-xl shadow-2xl border border-[#e5eeff] flex flex-col max-h-[90vh] overflow-hidden`}
        style={{ boxShadow: '0 20px 60px rgba(11,28,48,0.15), 0 0 0 1px rgba(226,232,240,0.8)' }}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#e5eeff] flex items-center justify-between shrink-0">
          <h2 className="text-[15px] font-semibold text-[#0b1c30] tracking-tight font-[Geist,sans-serif]">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[#767684] hover:text-[#0b1c30] hover:bg-[#e5eeff] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {/* Body */}
        <div className="overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  )
}
