import { WifiOff, ServerCrash, RotateCcw, X } from 'lucide-react'
import { useServerStatus } from '../context/ServerStatusContext'

export default function ServerStatusBanner() {
  const {
    isOffline,
    isServerDown,
    isChecking,
    bannerDismissed,
    lastError,
    checkServerConnection,
    dismissBanner,
  } = useServerStatus()

  // Only show if there is an issue and user hasn't dismissed it
  if ((!isOffline && !isServerDown) || bannerDismissed) {
    return null
  }

  const title = isOffline
    ? 'No Internet Connection'
    : 'Backend Server Unreachable'

  const message = isOffline
    ? 'You are currently offline. Changes cannot be saved until connectivity is restored.'
    : (lastError || 'Unable to connect to Spring Boot API. The backend may be restarting or offline.')

  return (
    <aside
      aria-label="System status alert"
      className="fixed top-3 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-3xl animate-in fade-in slide-in-from-top-2 duration-300"
    >
      <div className="bg-[#fff4eb] border border-[#ffd8b8] text-[#7c2d12] rounded-2xl p-3.5 sm:px-5 sm:py-3 shadow-xl backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-[Inter,sans-serif]">
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <div className="relative shrink-0 w-8 h-8 rounded-xl bg-[#ffebd6] flex items-center justify-center text-[#c2410c] mt-0.5 sm:mt-0">
            {isOffline ? <WifiOff className="w-4 h-4" /> : <ServerCrash className="w-4 h-4" />}
            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-[13px] font-bold text-[#431407] font-[Geist,sans-serif] flex items-center gap-2">
              {title}
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-[#ffedd5] text-[#9a3412] font-semibold">
                {isOffline ? 'Offline' : 'API Error'}
              </span>
            </h2>
            <p className="text-[12px] text-[#9a3412] leading-snug mt-0.5 line-clamp-2 sm:line-clamp-1">
              {message}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => checkServerConnection()}
            disabled={isChecking}
            className="h-7 px-3 bg-[#ea580c] hover:bg-[#c2410c] text-white text-[11px] font-semibold rounded-lg flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-60 active:scale-95 font-[Geist,sans-serif]"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
            {isChecking ? 'Checking...' : 'Retry Now'}
          </button>
          <button
            type="button"
            onClick={dismissBanner}
            title="Dismiss banner"
            className="w-7 h-7 flex items-center justify-center rounded-lg text-[#9a3412] hover:bg-[#ffebd6] hover:text-[#431407] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
