import { useLocation, useNavigate, NavLink } from 'react-router-dom'
import { useState, useCallback, useEffect, useRef } from 'react'
import {
  LayoutDashboard,
  FolderKanban,
  ClipboardList,
  Settings,
  LogOut,
  ChevronsLeft,
  Plus,
  X,
  Pin,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useProjects } from '../api/queries'
import { useIssues } from '../api/queries'
import Avatar from './Avatar'

// ─── Dot color palette ─────────────────────────────────────────────────────────
const DOT_COLORS = [
  'bg-emerald-500',
  'bg-indigo-500',
  'bg-amber-500',
  'bg-purple-500',
  'bg-rose-500',
  'bg-sky-500',
]
function dotColor(projId) {
  return DOT_COLORS[projId % DOT_COLORS.length]
}

// ─── Pinned-projects localStorage hook ─────────────────────────────────────────
function usePinnedProjects() {
  const [pinnedIds, setPinnedIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('knotfix_pinned_projects')) ?? [] } catch { return [] }
  })

  const persist = (ids) => {
    try { localStorage.setItem('knotfix_pinned_projects', JSON.stringify(ids)) } catch {}
  }

  const pin = useCallback((id) => {
    setPinnedIds((prev) => {
      if (prev.includes(id)) return prev
      const next = [...prev, id].slice(-8) // cap at 8
      persist(next)
      return next
    })
  }, [])

  const unpin = useCallback((id) => {
    setPinnedIds((prev) => {
      const next = prev.filter((i) => i !== id)
      persist(next)
      return next
    })
  }, [])

  return { pinnedIds, pin, unpin }
}

// ─── Sidebar ───────────────────────────────────────────────────────────────────
export default function Sidebar({ onCollapse }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const { data: projects = [] } = useProjects()
  const { data: allIssues = [] } = useIssues()
  const { pinnedIds, pin, unpin } = usePinnedProjects()

  const [showPinDropdown, setShowPinDropdown] = useState(false)
  const [hoveredPin, setHoveredPin] = useState(null)
  const pinDropdownRef = useRef(null)
  const pinBtnRef = useRef(null)

  // Close pin dropdown when clicking outside
  useEffect(() => {
    if (!showPinDropdown) return
    const handler = (e) => {
      if (!pinDropdownRef.current?.contains(e.target) && !pinBtnRef.current?.contains(e.target)) {
        setShowPinDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showPinDropdown])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  // Nav counts
  const projectCount = projects.length
  const myIssueCount = allIssues.filter(
    (i) => i.assignedTo?.username === user?.username && !['RESOLVED', 'CLOSED'].includes(i.status)
  ).length

  // Pinned / unpinned project lists
  const pinnedProjects = pinnedIds.map((id) => projects.find((p) => p.projId === id)).filter(Boolean)
  const unpinnedProjects = projects.filter((p) => !pinnedIds.includes(p.projId))

  // Active-state helpers
  const isDashboard = location.pathname === '/' || location.pathname === '/dashboard'
  const isProjectsList = location.pathname === '/projects'
  const isProjects = location.pathname.startsWith('/projects')
  const activeProjectId = (() => {
    const m = location.pathname.match(/^\/projects\/(\d+)/)
    return m ? parseInt(m[1]) : null
  })()

  return (
    <aside
      className="w-64 min-w-[16rem] h-full bg-white rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between p-3.5"
      aria-label="Sidebar navigation"
    >
      {/* ── Top nav sections ── */}
      <div className="flex flex-col gap-5 min-h-0 flex-1 overflow-hidden">

        {/* WORKSPACE label + collapse button */}
        <div className="flex items-center justify-between px-2 pt-1 pb-1 shrink-0">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#767684]">
            Workspace
          </span>
          <button
            onClick={onCollapse}
            className="p-1 rounded-lg text-[#767684] hover:text-[#0b1c30] hover:bg-slate-100 transition-colors"
            title="Collapse sidebar"
            aria-label="Collapse sidebar"
            type="button"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Primary navigation */}
        <nav className="flex flex-col gap-1 shrink-0" aria-label="Main navigation">
          {/* Dashboard */}
          <NavLink
            to="/"
            className={`flex items-center justify-between px-3 py-2 rounded-xl font-medium text-xs transition-colors ${
              isDashboard
                ? 'bg-indigo-50/80 text-indigo-700 shadow-sm border border-indigo-100/70'
                : 'text-[#454652] hover:text-[#0b1c30] hover:bg-slate-50'
            }`}
            aria-current={isDashboard ? 'page' : undefined}
          >
            <div className="flex items-center gap-2.5">
              <LayoutDashboard className={`w-4 h-4 ${isDashboard ? 'text-indigo-600' : 'text-[#767684]'}`} />
              <span className={isDashboard ? 'font-semibold' : ''}>Dashboard</span>
            </div>
            {isDashboard && <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 shrink-0" />}
          </NavLink>

          {/* Projects — only active on /projects exactly, not on a detail page */}
          <NavLink
            to="/projects"
            className={`flex items-center justify-between px-3 py-2 rounded-xl font-medium text-xs transition-colors ${
              isProjectsList
                ? 'bg-indigo-50/80 text-indigo-700 shadow-sm border border-indigo-100/70'
                : 'text-[#454652] hover:text-[#0b1c30] hover:bg-slate-50'
            }`}
            aria-current={isProjectsList ? 'page' : undefined}
          >
            <div className="flex items-center gap-2.5">
              <FolderKanban className={`w-4 h-4 ${isProjectsList ? 'text-indigo-600' : 'text-[#767684]'}`} />
              <span className={isProjectsList ? 'font-semibold' : ''}>Projects</span>
            </div>
            {projectCount > 0 && (
              <span className="text-[10px] font-semibold text-[#767684] bg-slate-100 px-1.5 py-0.5 rounded-md">
                {projectCount}
              </span>
            )}
          </NavLink>

          {/* My Issues */}
          <NavLink
            to="/my-issues"
            end
            className={({ isActive }) =>
              `flex items-center justify-between px-3 py-2 rounded-xl font-medium text-xs transition-colors ${
                isActive
                  ? 'bg-indigo-50/80 text-indigo-700 shadow-sm border border-indigo-100/70'
                  : 'text-[#454652] hover:text-[#0b1c30] hover:bg-slate-50'
              }`
            }
          >
            <div className="flex items-center gap-2.5">
              <ClipboardList className="w-4 h-4 text-[#767684]" />
              <span>My Issues</span>
            </div>
            {myIssueCount > 0 && (
              <span className="text-[10px] font-semibold text-[#767684] bg-slate-100 px-1.5 py-0.5 rounded-md">
                {myIssueCount}
              </span>
            )}
          </NavLink>
        </nav>

        {/* ── Pinned Projects ── */}
        <div className="flex flex-col gap-2 pt-2 border-t border-slate-100 min-h-0 flex-1 overflow-hidden">
          {/* Section header */}
          <div className="relative shrink-0">
            <div className="flex items-center justify-between px-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#767684]">
                Pinned Projects
              </span>
              {/* Pin new project button */}
              <button
                ref={pinBtnRef}
                onClick={() => setShowPinDropdown((v) => !v)}
                className="p-0.5 rounded text-[#767684] hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                title="Pin a project"
                aria-label="Pin a project"
                type="button"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Pin dropdown */}
            {showPinDropdown && (
              <div
                ref={pinDropdownRef}
                className="absolute top-7 right-0 z-50 bg-white border border-slate-200 rounded-xl shadow-lg w-52 py-1.5 overflow-hidden"
                style={{ boxShadow: '0 8px 24px rgba(11,28,48,0.10)' }}
              >
                {unpinnedProjects.length === 0 ? (
                  <p className="px-3 py-2 text-[11px] text-[#767684] italic">All projects pinned</p>
                ) : (
                  <>
                    <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#767684]">
                      Pin a project
                    </p>
                    <div className="max-h-48 overflow-y-auto">
                      {unpinnedProjects.map((p, i) => (
                        <button
                          key={p.projId}
                          onClick={() => { pin(p.projId); setShowPinDropdown(false) }}
                          className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-[#454652] hover:bg-indigo-50 hover:text-indigo-700 transition-colors text-left"
                          type="button"
                        >
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor(p.projId)}`} />
                          <span className="truncate">{p.projTitle}</span>
                          <Pin className="w-3 h-3 ml-auto text-[#767684] shrink-0" />
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Pinned project list */}
          <div className="flex flex-col gap-0.5 overflow-y-auto">
            {pinnedProjects.length === 0 && (
              <p className="px-3 py-1.5 text-[11px] text-[#767684] italic">
                Click&nbsp;<Plus className="w-3 h-3 inline-block" />&nbsp;to pin projects
              </p>
            )}
            {pinnedProjects.map((project) => {
              const isActive = activeProjectId === project.projId
              return (
                <div
                  key={project.projId}
                  className="relative group"
                  onMouseEnter={() => setHoveredPin(project.projId)}
                  onMouseLeave={() => setHoveredPin(null)}
                >
                  <button
                    onClick={() => navigate(`/projects/${project.projId}`)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors text-left w-full pr-7 ${
                      isActive
                        ? 'bg-indigo-50/80 text-indigo-700 font-medium'
                        : 'text-[#454652] hover:bg-slate-50'
                    }`}
                    title={project.projTitle}
                    type="button"
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor(project.projId)}`} />
                    <span className="truncate">{project.projTitle}</span>
                  </button>
                  {/* Unpin button — shows on hover */}
                  {hoveredPin === project.projId && (
                    <button
                      onClick={(e) => { e.stopPropagation(); unpin(project.projId) }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded text-[#767684] hover:text-rose-500 hover:bg-rose-50 transition-colors"
                      title="Unpin project"
                      aria-label="Unpin project"
                      type="button"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Bottom: user area ── */}
      <div className="pt-3 border-t border-slate-100 flex flex-col gap-2 shrink-0">
        {user ? (
          <>
            <button
              onClick={() => navigate('/profile')}
              className="flex items-center gap-2.5 px-1 py-1 rounded-lg hover:bg-slate-50 transition-colors w-full text-left group"
              title="View profile"
              type="button"
            >
              <Avatar name={user?.username} size="md" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[#0b1c30] truncate group-hover:text-indigo-700 transition-colors">
                  {user?.username || 'User'}
                </p>
                <p className="text-[11px] text-[#767684]">Member</p>
              </div>
            </button>

            <div className="flex items-center justify-between pt-1 px-1 text-xs text-[#767684]">
              <NavLink
                to="/profile"
                className="flex items-center gap-1.5 hover:text-[#0b1c30] transition-colors"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Settings</span>
              </NavLink>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 hover:text-rose-600 transition-colors"
                type="button"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            </div>
          </>
        ) : (
          <button
            onClick={() => navigate('/login')}
            className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors w-full"
            type="button"
          >
            Sign in
          </button>
        )}
      </div>
    </aside>
  )
}
