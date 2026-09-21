import { useEffect, useRef } from 'react'
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'

export default function AlertModal({
  open,
  onClose,
  title = 'Notification',
  message,
  type = 'info', // 'error' | 'success' | 'info'
}) {
  const backdropRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (e.key === 'Escape') onClose()
    }
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

  const isError = type === 'error'
  const isSuccess = type === 'success'

  const Icon = isError ? AlertCircle : isSuccess ? CheckCircle2 : Info
  const iconColor = isError ? 'text-rose-600 bg-rose-100' : isSuccess ? 'text-emerald-600 bg-emerald-100' : 'text-[#4450b7] bg-[#eff4ff]'

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(11,28,48,0.45)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => {
        if (e.target === backdropRef.current) onClose()
      }}
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-[#e5eeff] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150"
        style={{ boxShadow: '0 20px 60px rgba(11,28,48,0.18)' }}
      >
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconColor}`}>
              <Icon className="w-5 h-5" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="text-[16px] font-semibold text-[#0b1c30] tracking-tight font-[Geist,sans-serif]">
                  {title}
                </h3>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-7 h-7 -mr-2 -mt-1 rounded-lg flex items-center justify-center text-[#767684] hover:text-[#0b1c30] hover:bg-[#eff4ff] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[13px] text-[#565e74] mt-2 leading-relaxed font-[Inter,sans-serif]">
                {typeof message === 'object' && message !== null
                  ? message.message || message.error || JSON.stringify(message)
                  : String(message ?? '')}
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-3.5 bg-[#f8f9ff] border-t border-[#e5eeff] flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-5 rounded-lg bg-[#4450b7] hover:bg-[#3540a0] text-white text-[13px] font-semibold shadow-xs transition-all font-[Geist,sans-serif]"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  )
}
