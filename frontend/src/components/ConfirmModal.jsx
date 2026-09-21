import { useEffect, useRef } from 'react'
import { AlertTriangle, Info, X } from 'lucide-react'

export default function ConfirmModal({
  open,
  isOpen,
  onClose,
  onCancel,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isDanger: propIsDanger,
  loading = false,
}) {
  const isModalOpen = open ?? isOpen ?? false
  const handleClose = onClose || onCancel || (() => {})
  const backdropRef = useRef(null)

  useEffect(() => {
    if (!isModalOpen) return
    const handler = (e) => {
      if (e.key === 'Escape' && !loading) handleClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isModalOpen, handleClose, loading])

  // Block interaction with background content when modal is open
  useEffect(() => {
    if (!isModalOpen) return
    const root = document.getElementById('root')
    if (!root) return
    root.setAttribute('inert', '')
    root.setAttribute('aria-hidden', 'true')
    return () => {
      root.removeAttribute('inert')
      root.removeAttribute('aria-hidden')
    }
  }, [isModalOpen])

  if (!isModalOpen) return null

  const isDanger = propIsDanger !== undefined ? propIsDanger : variant === 'danger'

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(11,28,48,0.45)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => {
        if (e.target === backdropRef.current && !loading) onClose()
      }}
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-[#e5eeff] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150"
        style={{ boxShadow: '0 20px 60px rgba(11,28,48,0.18)' }}
      >
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                isDanger ? 'bg-rose-100 text-rose-600' : 'bg-[#eff4ff] text-[#4450b7]'
              }`}
            >
              {isDanger ? <AlertTriangle className="w-5 h-5" /> : <Info className="w-5 h-5" />}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="text-[16px] font-semibold text-[#0b1c30] tracking-tight font-[Geist,sans-serif]">
                  {title}
                </h3>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="w-7 h-7 -mr-2 -mt-1 rounded-lg flex items-center justify-center text-[#767684] hover:text-[#0b1c30] hover:bg-[#eff4ff] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[13px] text-[#565e74] mt-2 leading-relaxed font-[Inter,sans-serif]">
                {message}
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-3.5 bg-[#f8f9ff] border-t border-[#e5eeff] flex items-center justify-end gap-2.5">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="h-9 px-4 rounded-lg border border-[#c6c5d5]/80 bg-white hover:bg-[#f8f9ff] text-[#0b1c30] text-[13px] font-medium transition-colors font-[Geist,sans-serif]"
          >
            {cancelText}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className={`h-9 px-4 rounded-lg text-white text-[13px] font-semibold shadow-xs transition-all font-[Geist,sans-serif] ${
              isDanger
                ? 'bg-[#ba1a1a] hover:bg-[#93000a] disabled:opacity-60'
                : 'bg-[#4450b7] hover:bg-[#3540a0] disabled:opacity-60'
            }`}
          >
            {loading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
