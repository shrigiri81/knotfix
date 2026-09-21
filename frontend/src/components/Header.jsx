import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Search,
  FolderKanban,
  CheckCircle2,
  LayoutDashboard,
  ClipboardList,
  Bell,
  Plus,
  ChevronsRight,
  ChevronRight,
} from 'lucide-react'
import { apiSearch } from '../api/client'
import Avatar from './Avatar'
import { useAuth } from '../context/AuthContext'
import { useProjects } from '../api/queries'
import { useIssues } from '../api/queries'

export default function Header({ collapsed, onToggle }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [showResults, setShowResults] = useState(false)
  const [loading, setLoading] = useState(false)
  const searchRef = useRef(null)

  const { data: projects = [] } = useProjects()
  const { data: allIssues = [] } = useIssues()

  const projectCount = projects.length
  const myIssueCount = allIssues.filter(
    (i) => i.assignedTo?.username === user?.username && !['RESOLVED', 'CLOSED'].includes(i.status)
  ).length

  const isDashboard = location.pathname === '/' || location.pathname === '/dashboard'
  const isProjectsList = location.pathname === '/projects'
  const isProjects = location.pathname.startsWith('/projects')

  // Debounced search
  useEffect(() => {
    if (!query.trim()) { setResults([]); setShowResults(false); return }
    const t = setTimeout(async () => {
      try {
        setLoading(true)
        const res = await apiSearch(query)
        setResults(Array.isArray(res.data) ? res.data : [])
        setShowResults(true)
      } catch { setResults([]) }
      finally { setLoading(false) }
    }, 300)
    return () => clearTimeout(t)
  }, [query])

  // Click outside to close search results
  useEffect(() => {
    const handler = (e) => { if (!searchRef.current?.contains(e.target)) setShowResults(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleResultClick = (r) => {
    setQuery('')
    setShowResults(false)
    if (r.type === 'PROJECT') navigate(`/projects/${r.id}`)
    else if (r.type === 'ISSUE') navigate(`/issues/${r.id}`)
  }

  const isFirstRender = useRef(true)
  useEffect(() => {
    isFirstRender.current = false
  }, [])

  return (
    <header
      className="w-full bg-white rounded-2xl border border-slate-200/90 shadow-sm px-4 py-2.5 flex items-center justify-between gap-4 shrink-0 h-14"
      aria-label="Global header"
    >
      {/* Left side: Persistent brand logo (w-9 h-9) + extending pill or brand text */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Persistent Brand Logo: identical size (w-9 h-9 rounded-xl) in both expanded & collapsed */}
        <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-base shadow-sm shadow-indigo-200 shrink-0 z-10">
          K
        </div>

        {/* Content next to logo: toggles between "KnotFix" brand text and the extending pill */}
        <div key={String(collapsed)} className="flex items-center">
        {collapsed ? (
          /* ── Collapsed: Pill extending directly out of the logo with generous breathing room ── */
          <div
            className={`${isFirstRender.current ? '' : 'pill-emerge-from-logo'} flex items-center gap-2 h-9 -ml-3 pl-5 pr-2 bg-slate-50 border border-slate-200/80 rounded-r-xl shadow-sm`}
            title="Navigation"
          >
            {/* Icon nav buttons with clear separation and larger icons */}
            <nav className="flex items-center gap-1.5" aria-label="Collapsed navigation">
              {/* Dashboard */}
              <button
                onClick={() => navigate('/')}
                className={`p-1.5 rounded-lg flex items-center justify-center transition-colors ${
                  isDashboard
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-[#767684] hover:text-[#0b1c30] hover:bg-slate-200/60'
                }`}
                title="Dashboard"
                aria-label="Dashboard"
                type="button"
              >
                <LayoutDashboard className="w-4 h-4" />
              </button>

              {/* Projects */}
              <button
                onClick={() => navigate('/projects')}
                className={`relative p-1.5 rounded-lg flex items-center justify-center transition-colors ${
                  isProjectsList
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-[#767684] hover:text-[#0b1c30] hover:bg-slate-200/60'
                }`}
                title="Projects"
                aria-label="Projects"
                type="button"
              >
                <FolderKanban className="w-4 h-4" />
                {projectCount > 0 && (
                  <span className="absolute -top-1 -right-1.5 px-1.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-full leading-tight">
                    {projectCount}
                  </span>
                )}
              </button>

              {/* My Issues */}
              <button
                onClick={() => navigate('/my-issues')}
                className="p-1.5 rounded-lg text-[#767684] hover:text-[#0b1c30] hover:bg-slate-200/60 flex items-center justify-center transition-colors relative"
                title="My Issues"
                aria-label="My Issues"
                type="button"
              >
                <ClipboardList className="w-4 h-4" />
                {myIssueCount > 0 && (
                  <span className="absolute -top-1 -right-1.5 px-1.5 bg-slate-200 text-slate-700 text-[10px] font-bold rounded-full leading-tight">
                    {myIssueCount}
                  </span>
                )}
              </button>
            </nav>

            {/* Separator */}
            <div className="h-4 w-px bg-slate-200" />

            {/* Expand button */}
            <button
              onClick={onToggle}
              className="text-[#767684] hover:text-indigo-600 transition-colors flex items-center justify-center p-1.5 rounded-lg hover:bg-slate-200/70"
              title="Expand sidebar (⌘B)"
              aria-label="Expand sidebar"
              type="button"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          /* ── Expanded: KnotFix branding text ── */
          <span className={`${isFirstRender.current ? '' : 'logo-emerge'} font-semibold text-lg tracking-tight text-[#0b1c30] font-[Geist,sans-serif] ml-1`}>
            KnotFix
          </span>
        )}
        </div>

        {/* Workspace breadcrumb — shown in both states */}
        <div className="hidden sm:flex items-center text-xs font-medium text-[#767684] gap-1.5 pl-3 border-l border-slate-200">
          <span className="text-[#565e74] hover:text-[#0b1c30] cursor-default">Workspace</span>
          <ChevronRight className="w-3 h-3 text-[#767684]" />
          <span className="text-[#0b1c30] font-semibold">KnotFix</span>
        </div>
      </div>


      {/* Center: Global search */}
      <div className="flex-1 max-w-xl mx-2" ref={searchRef}>
        <div className="relative w-full">
          <div className="flex items-center gap-2 w-full bg-slate-50 border border-slate-200 rounded-xl pl-3.5 pr-2.5 py-1.5 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent transition-all">
            <Search className="w-4 h-4 text-[#767684] shrink-0" />
            <input
              className="bg-transparent border-none outline-none text-xs sm:text-sm text-[#0b1c30] placeholder:text-[#767684] flex-1 font-[Inter,sans-serif]"
              placeholder="Search issues, projects..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => query && setShowResults(true)}
              aria-label="Search issues and projects"
            />
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 border border-slate-200 rounded text-[10px] font-mono text-[#767684] bg-white shadow-sm">
              ⌘K
            </kbd>
          </div>

          {/* Search results dropdown */}
          {showResults && results.length > 0 && (
            <div
              className="absolute top-full mt-1 w-full bg-white rounded-xl border border-slate-200 shadow-xl z-50 overflow-hidden"
              style={{ boxShadow: '0 10px 30px rgba(11,28,48,0.10)' }}
            >
              {loading && (
                <div className="px-4 py-2 text-[12px] text-[#767684]">Searching…</div>
              )}
              {results.map((r) => (
                <button
                  key={`${r.type}-${r.id}`}
                  onClick={() => handleResultClick(r)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors text-left"
                  type="button"
                >
                  {r.type === 'PROJECT' ? (
                    <FolderKanban className="w-4 h-4 text-[#767684] shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-[#767684] shrink-0" />
                  )}
                  <div>
                    <p className="text-xs font-medium text-[#0b1c30]">{r.name}</p>
                    <p className="text-[11px] text-[#565e74]">{r.type}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Browse Projects */}
        <button
          onClick={() => navigate('/projects')}
          className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-[#454652] hover:bg-slate-50 rounded-xl text-xs font-medium shadow-sm transition-colors"
          type="button"
        >
          <FolderKanban className="w-3.5 h-3.5 text-[#767684]" />
          <span>Browse Projects</span>
          {projectCount > 0 && (
            <span className="ml-0.5 px-1.5 bg-slate-100 text-[#565e74] rounded-md text-[11px] font-semibold">
              {projectCount}
            </span>
          )}
        </button>

        {/* New Issue — navigates to dashboard where modal can be opened */}
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
          title="Go to dashboard to create a new issue (or press C)"
          type="button"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Issue</span>
        </button>

        {/* Notifications (decorative — no backend yet) */}
        <button
          className="p-1.5 text-[#767684] hover:text-[#454652] rounded-xl hover:bg-slate-100 transition-colors"
          aria-label="Notifications"
          type="button"
        >
          <Bell className="w-4 h-4" />
        </button>

        {/* User avatar */}
        {user ? (
          <button
            onClick={() => navigate('/profile')}
            className="h-8 w-8 rounded-xl bg-indigo-100 text-indigo-700 border border-indigo-200 font-semibold text-xs flex items-center justify-center cursor-pointer shadow-sm hover:ring-2 hover:ring-indigo-300 transition-all shrink-0"
            title={user?.username}
            aria-label={`Profile: ${user?.username}`}
            type="button"
          >
            {(user?.username?.[0] ?? 'U').toUpperCase()}
          </button>
        ) : (
          <button
            onClick={() => navigate('/login')}
            className="h-8 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-sm transition-colors font-[Geist,sans-serif]"
            type="button"
          >
            Sign in
          </button>
        )}
      </div>
    </header>
  )
}
