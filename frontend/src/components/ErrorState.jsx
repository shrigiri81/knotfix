import { useState } from 'react'
import {
  AlertTriangle,
  ServerCrash,
  FileQuestion,
  ShieldAlert,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
} from 'lucide-react'

export default function ErrorState({
  variant = 'error',
  title,
  message,
  error,
  onRetry,
  retryLoading = false,
  action,
  compact = false,
  className = '',
}) {
  const [showDetails, setShowDetails] = useState(false)
  const [copied, setCopied] = useState(false)

  const configs = {
    'server-down': {
      icon: ServerCrash,
      defaultTitle: 'Server is Unreachable',
      defaultMessage: 'The backend service is currently unavailable or restarting. Please verify your connection or try again shortly.',
      badgeText: '503 Service Unavailable',
      iconBg: 'bg-[#fff4eb]',
      iconColor: 'text-[#ea580c]',
      badgeBg: 'bg-[#ffedd5]',
      badgeColor: 'text-[#c2410c]',
    },
    'not-found': {
      icon: FileQuestion,
      defaultTitle: 'Resource Not Found',
      defaultMessage: 'The requested item could not be located. It may have been deleted, moved, or never existed.',
      badgeText: '404 Not Found',
      iconBg: 'bg-[#eff4ff]',
      iconColor: 'text-[#4450b7]',
      badgeBg: 'bg-[#dce9ff]',
      badgeColor: 'text-[#3540a0]',
    },
    unauthorized: {
      icon: ShieldAlert,
      defaultTitle: 'Access Restricted',
      defaultMessage: 'You do not have the required permissions to view or interact with this resource.',
      badgeText: '403 Forbidden',
      iconBg: 'bg-[#ffdad6]',
      iconColor: 'text-[#ba1a1a]',
      badgeBg: 'bg-[#ffdad6]',
      badgeColor: 'text-[#93000a]',
    },
    error: {
      icon: AlertTriangle,
      defaultTitle: 'Something Went Wrong',
      defaultMessage: 'An unexpected error occurred while processing your request.',
      badgeText: 'Error',
      iconBg: 'bg-[#ffdad6]',
      iconColor: 'text-[#ba1a1a]',
      badgeBg: 'bg-[#ffdad6]',
      badgeColor: 'text-[#93000a]',
    },
  }

  const config = configs[variant] || configs.error
  const IconComponent = config.icon

  const displayTitle = title || config.defaultTitle
  const displayMessage = message || config.defaultMessage

  const errorString =
    error instanceof Error
      ? `${error.name}: ${error.message}\n\n${error.stack || ''}`
      : typeof error === 'object' && error !== null
      ? JSON.stringify(error, null, 2)
      : error ? String(error) : null

  const handleCopy = () => {
    if (errorString) {
      navigator.clipboard.writeText(errorString)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (compact) {
    return (
      <div className={`p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-3 text-left font-[Inter,sans-serif] ${className}`}>
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-7 h-7 rounded-lg ${config.iconBg} ${config.iconColor} flex items-center justify-center shrink-0`}>
            <IconComponent className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[12px] font-semibold text-[#0b1c30] font-[Geist,sans-serif] truncate">
              {displayTitle}
            </p>
            <p className="text-[11px] text-[#565e74] truncate">
              {displayMessage}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {onRetry && (
            <button
              onClick={onRetry}
              disabled={retryLoading}
              className="h-7 px-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-[#0b1c30] text-[11px] font-medium rounded-lg flex items-center gap-1 transition-all"
            >
              <RotateCcw className={`w-3 h-3 ${retryLoading ? 'animate-spin' : ''}`} />
              Retry
            </button>
          )}
          {action}
        </div>
      </div>
    )
  }

  return (
    <div className={`flex flex-col items-center justify-center text-center p-8 max-w-lg mx-auto font-[Inter,sans-serif] ${className}`}>
      {/* Icon badge */}
      <div className={`w-16 h-16 rounded-2xl ${config.iconBg} ${config.iconColor} flex items-center justify-center mb-4 shadow-xs`}>
        <IconComponent className="w-8 h-8" />
      </div>

      {/* Status badge */}
      <span className={`inline-block text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full ${config.badgeBg} ${config.badgeColor} mb-2`}>
        {config.badgeText}
      </span>

      {/* Title & Message */}
      <h2 className="text-[20px] font-bold text-[#0b1c30] tracking-tight font-[Geist,sans-serif]">
        {displayTitle}
      </h2>
      <p className="text-[13px] text-[#565e74] mt-2 leading-relaxed max-w-sm">
        {displayMessage}
      </p>

      {/* Action buttons */}
      <div className="flex flex-wrap items-center justify-center gap-2.5 mt-6 w-full sm:w-auto">
        {onRetry && (
          <button
            onClick={onRetry}
            disabled={retryLoading}
            className="h-9 px-4 bg-[#4450b7] hover:bg-[#3540a0] text-white text-[13px] font-semibold rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-[0.98] disabled:opacity-60 font-[Geist,sans-serif]"
          >
            <RotateCcw className={`w-4 h-4 ${retryLoading ? 'animate-spin' : ''}`} />
            {retryLoading ? 'Retrying...' : 'Try Again'}
          </button>
        )}
        {action}
      </div>

      {/* Expandable technical details */}
      {errorString && (
        <div className="w-full mt-6 text-left">
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="text-[11px] text-[#565e74] hover:text-[#0b1c30] flex items-center gap-1 font-medium font-[Geist,sans-serif] mx-auto transition-colors"
          >
            {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {showDetails ? 'Hide technical details' : 'Show technical details'}
          </button>

          {showDetails && (
            <div className="mt-2.5 p-3.5 bg-[#f8f9ff] rounded-xl border border-[#dce9ff] text-left relative group">
              <button
                type="button"
                onClick={handleCopy}
                title="Copy error details"
                className="absolute top-2.5 right-2.5 p-1 rounded-md bg-white border border-[#dce9ff] text-[#565e74] hover:text-[#0b1c30] transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <pre className="text-[11px] font-mono text-[#ba1a1a] max-h-48 overflow-y-auto whitespace-pre-wrap break-all pr-6">
                {errorString}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
