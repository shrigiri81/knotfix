import { useLocation, useNavigate, Link } from 'react-router-dom'
import { Compass, ArrowLeft, Home, FolderKanban, LogIn } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function NotFoundPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6 font-[Inter,sans-serif]">
      <div className="w-full max-w-lg bg-white rounded-2xl border border-[#e5eeff] p-8 sm:p-10 shadow-xl flex flex-col items-center text-center relative overflow-hidden">
        {/* Subtle background decorative element */}
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-[#dce9ff]/40 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-[#ffdad6]/30 rounded-full blur-2xl pointer-events-none" />

        {/* 404 Icon & Tag */}
        <div className="relative mb-5">
          <div className="w-16 h-16 rounded-2xl bg-[#eff4ff] text-[#4450b7] flex items-center justify-center shadow-xs border border-[#dce9ff]">
            <Compass className="w-8 h-8 stroke-[1.75]" />
          </div>
          <span className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-full bg-[#4450b7] text-white font-mono text-[10px] font-bold shadow-xs">
            404
          </span>
        </div>

        {/* Heading */}
        <h1 className="text-[24px] font-bold text-[#0b1c30] tracking-tight font-[Geist,sans-serif]">
          Page Not Found
        </h1>
        <p className="text-[13px] text-[#565e74] mt-2 leading-relaxed max-w-sm">
          The page you are looking for does not exist, was removed, or the link may be mistyped.
        </p>

        {/* Requested path info */}
        <div className="mt-4 px-3 py-1.5 rounded-lg bg-[#f8f9ff] border border-[#e5eeff] text-[12px] font-mono text-[#565e74] flex items-center gap-1.5 max-w-full">
          <span className="text-[#767684]">Path:</span>
          <span className="font-semibold text-[#0b1c30] truncate">{location.pathname}</span>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 mt-7 w-full sm:w-auto">
          {isAuthenticated ? (
            <>
              <Link
                to="/dashboard"
                className="h-9 px-4 bg-[#4450b7] hover:bg-[#3540a0] text-white text-[13px] font-semibold rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-[0.98] font-[Geist,sans-serif]"
              >
                <Home className="w-4 h-4" />
                Go to Dashboard
              </Link>
              <Link
                to="/projects"
                className="h-9 px-4 bg-[#eff4ff] hover:bg-[#e5eeff] text-[#0b1c30] text-[13px] font-medium rounded-xl flex items-center justify-center gap-1.5 border border-[#c6c5d5]/60 transition-all font-[Geist,sans-serif]"
              >
                <FolderKanban className="w-4 h-4" />
                Browse Projects
              </Link>
            </>
          ) : (
            <Link
              to="/login"
              className="h-9 px-4 bg-[#4450b7] hover:bg-[#3540a0] text-white text-[13px] font-semibold rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-[0.98] font-[Geist,sans-serif]"
            >
              <LogIn className="w-4 h-4" />
              Sign in to KnotFix
            </Link>
          )}

          <button
            type="button"
            onClick={() => navigate(-1)}
            className="h-9 px-3.5 bg-white hover:bg-slate-50 text-[#565e74] hover:text-[#0b1c30] text-[13px] font-medium rounded-xl flex items-center justify-center gap-1.5 border border-[#c6c5d5]/60 transition-all font-[Geist,sans-serif]"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
        </div>
      </div>
    </div>
  )
}
