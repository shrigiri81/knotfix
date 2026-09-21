import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ClipboardList,
  Search,
  ChevronRight,
  CheckCircle2,
  Inbox,
  FolderKanban,
  Flame,
  UserCheck,
  FileText,
} from 'lucide-react'
import StatusBadge from '../components/StatusBadge'
import PriorityBadge from '../components/PriorityBadge'
import Avatar from '../components/Avatar'
import ErrorState from '../components/ErrorState'
import { useIssues } from '../api/queries'
import { useAuth } from '../context/AuthContext'

function formatRelativeTime(dateStr) {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  const now = new Date()
  const diffSec = Math.floor((now - date) / 1000)
  if (diffSec < 60) return 'Just now'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const STATUS_KEYS = ['ALL', 'OPEN', 'IN_PROGRESS', 'BLOCKED', 'RESOLVED', 'CLOSED']

export default function MyIssuesPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const {
    data: allIssues = [],
    isLoading,
    error: issuesError,
    refetch,
  } = useIssues()

  // Tab: 'assigned' | 'created'
  const [activeTab, setActiveTab] = useState('assigned')
  const [activeOnly, setActiveOnly] = useState(true)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  const isServerError = Boolean(
    issuesError &&
      (!issuesError.response ||
        issuesError.response?.status >= 500 ||
        issuesError.code === 'ERR_NETWORK' ||
        issuesError.code === 'ECONNABORTED')
  )

  const isIssueActive = (issue) => {
    const s = (issue.status || '').toUpperCase()
    return s !== 'RESOLVED' && s !== 'CLOSED' && s !== 'MERGED'
  }

  const myAssignedIssues = useMemo(
    () =>
      allIssues.filter(
        (i) => i.assignedTo?.username === user?.username
      ),
    [allIssues, user?.username]
  )

  const myCreatedIssues = useMemo(
    () =>
      allIssues.filter(
        (i) => i.createdBy?.username === user?.username
      ),
    [allIssues, user?.username]
  )

  const myActiveAssigned = useMemo(
    () => myAssignedIssues.filter(isIssueActive),
    [myAssignedIssues]
  )
  const myActiveCreated = useMemo(
    () => myCreatedIssues.filter(isIssueActive),
    [myCreatedIssues]
  )

  const urgentCount = useMemo(
    () =>
      myActiveAssigned.filter((i) => {
        const p = (i.priority || '').toUpperCase()
        return p === 'URGENT' || p === 'HIGH'
      }).length,
    [myActiveAssigned]
  )

  const statusCounts = useMemo(() => {
    const source = activeTab === 'assigned' ? myAssignedIssues : myCreatedIssues
    const counts = { ALL: source.length, OPEN: 0, IN_PROGRESS: 0, BLOCKED: 0, RESOLVED: 0, CLOSED: 0 }
    source.forEach((i) => {
      const s = (i.status || 'OPEN').toUpperCase()
      if (counts[s] !== undefined) counts[s]++
    })
    return counts
  }, [activeTab, myAssignedIssues, myCreatedIssues])

  const displayedIssues = useMemo(() => {
    let list = activeTab === 'assigned'
      ? (activeOnly ? myActiveAssigned : myAssignedIssues)
      : (activeOnly ? myActiveCreated : myCreatedIssues)

    if (statusFilter !== 'ALL') {
      list = list.filter((i) => (i.status || '').toUpperCase() === statusFilter)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        (i) =>
          i.issueTitle?.toLowerCase().includes(q) ||
          i.issueDesc?.toLowerCase().includes(q) ||
          i.project?.projTitle?.toLowerCase().includes(q) ||
          String(i.issueId).includes(q)
      )
    }

    return list
  }, [
    activeTab,
    activeOnly,
    myActiveAssigned,
    myAssignedIssues,
    myActiveCreated,
    myCreatedIssues,
    statusFilter,
    searchQuery,
  ])

  if (!isLoading && issuesError && allIssues.length === 0) {
    return (
      <div className="p-6 max-w-4xl mx-auto min-h-[70vh] flex items-center justify-center">
        <ErrorState
          variant={isServerError ? 'server-down' : 'error'}
          title={isServerError ? 'Backend Server Unreachable' : 'Failed to Load Issues'}
          message={
            isServerError
              ? 'Unable to connect to KnotFix API server. The Spring Boot backend might be offline or starting up.'
              : 'Could not load your issues.'
          }
          error={issuesError}
          onRetry={refetch}
        />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      {/* Page Header */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-[#4450b7]" />
            <h1 className="text-[22px] font-bold text-[#0b1c30] tracking-tight font-[Geist,sans-serif]">
              My Issues
            </h1>
          </div>
          <p className="text-[13px] text-[#565e74] mt-1 font-[Inter,sans-serif]">
            Issues assigned to you or reported by you.
          </p>
        </div>

        {/* Quick stats */}
        {!isLoading && (
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#e5eeff] rounded-xl text-[12px] shadow-xs">
              <UserCheck className="w-3.5 h-3.5 text-[#4450b7]" />
              <span className="text-[#565e74] font-[Inter,sans-serif]">Assigned:</span>
              <span className="font-bold text-[#0b1c30] font-[Geist,sans-serif]">{myActiveAssigned.length}</span>
              <span className="text-[#767684] font-[Inter,sans-serif]">active / {myAssignedIssues.length} total</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#e5eeff] rounded-xl text-[12px] shadow-xs">
              <FileText className="w-3.5 h-3.5 text-[#4450b7]" />
              <span className="text-[#565e74] font-[Inter,sans-serif]">Created:</span>
              <span className="font-bold text-[#0b1c30] font-[Geist,sans-serif]">{myActiveCreated.length}</span>
              <span className="text-[#767684] font-[Inter,sans-serif]">active / {myCreatedIssues.length} total</span>
            </div>
            {urgentCount > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 border border-rose-200 rounded-xl text-[12px] shadow-xs">
                <Flame className="w-3.5 h-3.5 text-rose-600" />
                <span className="font-bold text-rose-800 font-[Geist,sans-serif]">{urgentCount} urgent</span>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Main Work Area */}
      <div className="bg-white rounded-2xl border border-[#e5eeff] shadow-xs overflow-hidden">
        {/* Control Bar */}
        <div className="p-4 border-b border-[#e5eeff] flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-1 bg-[#eff4ff] p-1 rounded-xl">
            <button
              onClick={() => { setActiveTab('assigned'); setStatusFilter('ALL') }}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all font-[Geist,sans-serif] flex items-center gap-1.5 ${
                activeTab === 'assigned'
                  ? 'bg-white text-[#4450b7] font-semibold shadow-xs'
                  : 'text-[#454652] hover:text-[#0b1c30]'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Assigned to Me</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                  activeTab === 'assigned' ? 'bg-[#dce9ff] text-[#4450b7]' : 'bg-[#e5eeff] text-[#565e74]'
                }`}
              >
                {myActiveAssigned.length}
              </span>
            </button>

            <button
              onClick={() => { setActiveTab('created'); setStatusFilter('ALL') }}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all font-[Geist,sans-serif] flex items-center gap-1.5 ${
                activeTab === 'created'
                  ? 'bg-white text-[#4450b7] font-semibold shadow-xs'
                  : 'text-[#454652] hover:text-[#0b1c30]'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Created by Me</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                  activeTab === 'created' ? 'bg-[#dce9ff] text-[#4450b7]' : 'bg-[#e5eeff] text-[#565e74]'
                }`}
              >
                {myActiveCreated.length}
              </span>
            </button>
          </div>

          {/* Right: Active toggle + Search */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-[12px] text-[#454652] cursor-pointer select-none font-[Inter,sans-serif]">
              <input
                type="checkbox"
                checked={activeOnly}
                onChange={(e) => setActiveOnly(e.target.checked)}
                className="rounded accent-[#4450b7]"
              />
              <span>Active only</span>
            </label>

            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-[#767684] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter issues..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-8 pl-8 pr-3 rounded-lg bg-[#f8f9ff] text-[#0b1c30] text-[12px] placeholder:text-[#767684] border border-[#c6c5d5]/60 outline-none focus:border-[#4450b7] transition-colors font-[Inter,sans-serif]"
              />
            </div>
          </div>
        </div>

        {/* Status filter pills */}
        <div className="px-4 py-2.5 bg-[#f8f9ff] border-b border-[#e5eeff] flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-[#767684] uppercase tracking-wider mr-1 font-[Geist,sans-serif]">
              Status:
            </span>
            {STATUS_KEYS.map((key) => {
              const count = statusCounts[key] || 0
              if (key !== 'ALL' && count === 0 && statusFilter !== key) return null
              const isSelected = statusFilter === key
              return (
                <button
                  key={key}
                  onClick={() => setStatusFilter(key)}
                  className={`h-6 px-2.5 rounded-full text-[11px] font-medium transition-colors flex items-center gap-1.5 font-[Geist,sans-serif] ${
                    isSelected
                      ? 'bg-[#4450b7] text-white'
                      : 'bg-white text-[#454652] border border-[#c6c5d5]/70 hover:bg-[#eff4ff]'
                  }`}
                >
                  <span>{key === 'ALL' ? 'All' : key.replace('_', ' ')}</span>
                  <span className={`text-[10px] font-mono ${isSelected ? 'text-white/80' : 'text-[#767684]'}`}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          <span className="text-[11px] text-[#767684] font-[Inter,sans-serif]">
            Showing{' '}
            <strong className="text-[#0b1c30] font-semibold">{displayedIssues.length}</strong>{' '}
            {displayedIssues.length === 1 ? 'issue' : 'issues'}
          </span>
        </div>

        {/* Loading skeleton */}
        {isLoading && (
          <div className="divide-y divide-[#e5eeff]">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="p-4 flex items-center justify-between gap-4 animate-pulse">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-6 h-6 rounded bg-[#e5eeff]" />
                  <div className="w-10 h-4 rounded bg-[#e5eeff]" />
                  <div className="w-1/2 h-4 rounded bg-[#e5eeff]" />
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-5 rounded-full bg-[#e5eeff]" />
                  <div className="w-20 h-4 rounded bg-[#e5eeff]" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Issues List */}
        {!isLoading && displayedIssues.length > 0 && (
          <div className="divide-y divide-[#e5eeff]">
            {displayedIssues.map((issue) => (
              <div
                key={issue.issueId}
                onClick={() => navigate(`/issues/${issue.issueId}`)}
                className="px-4 py-3 hover:bg-[#eff4ff]/50 transition-colors cursor-pointer flex items-center justify-between gap-4 group"
              >
                {/* Left */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="shrink-0">
                    <PriorityBadge priority={issue.priority} />
                  </div>
                  <span className="text-[12px] font-mono text-[#767684] shrink-0 font-medium">
                    #{issue.issueId}
                  </span>
                  <div className="min-w-0 flex-1 flex items-center gap-2">
                    <h3 className="text-[13px] font-semibold text-[#0b1c30] truncate group-hover:text-[#4450b7] transition-colors font-[Inter,sans-serif]">
                      {issue.issueTitle}
                    </h3>
                    {issue.project && (
                      <span
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate(`/projects/${issue.project.projId}`)
                        }}
                        className="hidden sm:inline-flex items-center gap-1 text-[11px] text-[#565e74] bg-[#eff4ff] hover:bg-[#dce9ff] px-2 py-0.5 rounded transition-colors shrink-0 font-[Geist,sans-serif] cursor-pointer"
                        title="Go to project"
                      >
                        <FolderKanban className="w-3 h-3 text-[#565e74]" />
                        <span className="truncate max-w-[130px]">{issue.project.projTitle}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Right */}
                <div className="flex items-center gap-3 shrink-0">
                  {activeTab === 'created' ? (
                    <div className="hidden md:flex items-center gap-1.5 text-[11px] text-[#565e74]">
                      <span className="text-[#767684]">Assignee:</span>
                      <Avatar name={issue.assignedTo?.username} size="xs" />
                      <span className="font-medium text-[#0b1c30]">
                        {issue.assignedTo?.username || 'Unassigned'}
                      </span>
                    </div>
                  ) : (
                    <div className="hidden md:flex items-center gap-1.5 text-[11px] text-[#565e74]">
                      <span className="text-[#767684]">By:</span>
                      <Avatar name={issue.createdBy?.username} size="xs" />
                      <span className="font-medium text-[#0b1c30]">
                        {issue.createdBy?.username || '—'}
                      </span>
                    </div>
                  )}

                  <StatusBadge status={issue.status} />

                  <span className="text-[11px] text-[#767684] w-20 text-right hidden sm:block font-[Inter,sans-serif]">
                    {formatRelativeTime(issue.updatedAt || issue.createdAt)}
                  </span>

                  <ChevronRight className="w-4 h-4 text-[#c6c5d5] group-hover:text-[#4450b7] group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && displayedIssues.length === 0 && (
          <div className="text-center py-16 px-4">
            {activeTab === 'assigned' ? (
              <CheckCircle2 className="w-10 h-10 mx-auto text-[#c6c5d5]" />
            ) : (
              <Inbox className="w-10 h-10 mx-auto text-[#c6c5d5]" />
            )}
            <p className="mt-2 text-[15px] font-semibold text-[#0b1c30] font-[Geist,sans-serif]">
              {searchQuery || statusFilter !== 'ALL'
                ? 'No issues match your filters'
                : activeTab === 'assigned'
                ? activeOnly
                  ? 'All clear! No active issues assigned to you'
                  : 'No issues assigned to you'
                : activeOnly
                ? 'No open issues reported by you'
                : "You haven't reported any issues yet"}
            </p>
            <p className="text-[12px] text-[#565e74] mt-1 max-w-sm mx-auto font-[Inter,sans-serif]">
              {searchQuery || statusFilter !== 'ALL'
                ? 'Try changing or clearing your search criteria.'
                : 'Issues assigned to or created by you will appear here.'}
            </p>
            {(searchQuery || statusFilter !== 'ALL' || !activeOnly) && (
              <button
                onClick={() => { setSearchQuery(''); setStatusFilter('ALL'); setActiveOnly(true) }}
                className="mt-3.5 h-8 px-3.5 border border-[#c6c5d5] text-[#0b1c30] text-[12px] font-medium rounded-lg hover:bg-[#f8f9ff] transition-colors font-[Geist,sans-serif]"
              >
                Reset Filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
