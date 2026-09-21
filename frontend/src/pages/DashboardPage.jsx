import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FolderKanban,
  Zap,
  UserCheck,
  Clock,
  FileText,
  Search,
  ChevronRight,
  Inbox,
  CheckCircle2,
  ArrowRight,
  Flame,
} from 'lucide-react'
import Modal from '../components/Modal'
import StatusBadge from '../components/StatusBadge'
import PriorityBadge from '../components/PriorityBadge'
import Avatar from '../components/Avatar'
import AlertModal from '../components/AlertModal'
import ErrorState from '../components/ErrorState'
import { stripContentWrapper } from '../utils/text'
import {
  apiCreateIssue,
} from '../api/client'
import { useIssues, useProjects, useUsers } from '../api/queries'
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

export default function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const workAreaRef = useRef(null)

  // React Query hooks
  const { data: allIssues = [], isLoading: issuesLoading, error: issuesError, refetch: refetchIssues } = useIssues()
  const { data: projects = [], isLoading: projectsLoading, refetch: refetchProjects } = useProjects()

  // Modal & alert state (Item 3)
  const [showNewIssue, setShowNewIssue] = useState(false)
  const [creatingIssue, setCreatingIssue] = useState(false)
  const [alertState, setAlertState] = useState({ isOpen: false, title: '', message: '', type: 'error' })

  // Lazily load users only when New Issue modal is open
  const { data: users = [] } = useUsers({ enabled: showNewIssue })

  const loading = issuesLoading || projectsLoading
  const error = issuesError?.response?.data || issuesError?.message || ''
  const isServerError = Boolean(
    issuesError && (
      !issuesError.response ||
      issuesError.response.status >= 500 ||
      issuesError.code === 'ERR_NETWORK' ||
      issuesError.code === 'ECONNABORTED'
    )
  )

  // View tabs: 'assigned' | 'created' | 'recent'
  const [activeTab, setActiveTab] = useState('assigned')
  // Active only vs all
  const [activeOnly, setActiveOnly] = useState(true)
  // Status filter pill
  const [statusFilter, setStatusFilter] = useState('ALL')
  // Needs attention (urgent / high priority) filter
  const [attentionOnly, setAttentionOnly] = useState(false)
  // Search text filter
  const [searchQuery, setSearchQuery] = useState('')

  const showAlert = (rawMessage, title = 'Notice', type = 'error') => {
    let message = rawMessage
    if (rawMessage && typeof rawMessage === 'object') {
      message = rawMessage.message || rawMessage.error || JSON.stringify(rawMessage)
    } else if (rawMessage !== null && rawMessage !== undefined) {
      message = String(rawMessage)
    } else {
      message = 'An unexpected error occurred.'
    }
    setAlertState({ isOpen: true, title, message, type })
  }

  const [issueForm, setIssueForm] = useState({
    issueTitle: '',
    issueDesc: '',
    status: 'OPEN',
    priority: 'MEDIUM',
    projectId: '',
    assignedToId: '',
  })

  // Set default project when projects load
  useEffect(() => {
    if (projects.length > 0 && !issueForm.projectId) {
      setIssueForm((prev) => ({ ...prev, projectId: projects[0].projId }))
    }
  }, [projects, issueForm.projectId])

  // Set default assignee when users load
  useEffect(() => {
    if (users.length > 0 && !issueForm.assignedToId) {
      const me = users.find((u) => u.username === user?.username)
      setIssueForm((prev) => ({
        ...prev,
        assignedToId: me ? me.userId : users[0].userId,
      }))
    }
  }, [users, user?.username, issueForm.assignedToId])

  const loadData = () => {
    refetchIssues()
    refetchProjects()
  }

  // Resolve current user record
  const currentUser = useMemo(() => {
    return users.find((u) => u.username === user?.username)
  }, [users, user])

  // Helper to check if an issue is active
  const isIssueActive = (issue) => {
    const s = (issue.status || '').toUpperCase()
    return s !== 'RESOLVED' && s !== 'CLOSED' && s !== 'MERGED'
  }

  // Categorized collections
  const myAssignedIssues = useMemo(() => {
    const targetUsername = user?.username
    const targetUserId = currentUser?.userId
    return allIssues.filter((i) => {
      if (!i.assignedTo) return false
      if (targetUsername && i.assignedTo.username === targetUsername) return true
      if (targetUserId && i.assignedTo.userId === targetUserId) return true
      return false
    })
  }, [allIssues, user?.username, currentUser?.userId])

  const myCreatedIssues = useMemo(() => {
    const targetUsername = user?.username
    const targetUserId = currentUser?.userId
    return allIssues.filter((i) => {
      if (!i.createdBy) return false
      if (targetUsername && i.createdBy.username === targetUsername) return true
      if (targetUserId && i.createdBy.userId === targetUserId) return true
      return false
    })
  }, [allIssues, user?.username, currentUser?.userId])

  const myActiveAssignedIssues = useMemo(() => {
    return myAssignedIssues.filter(isIssueActive)
  }, [myAssignedIssues])

  const urgentAttentionIssues = useMemo(() => {
    return myActiveAssignedIssues.filter((i) => {
      const p = (i.priority || '').toUpperCase()
      return p === 'URGENT' || p === 'HIGH'
    })
  }, [myActiveAssignedIssues])

  const inProgressIssues = useMemo(() => {
    return myAssignedIssues.filter((i) => (i.status || '').toUpperCase() === 'IN_PROGRESS')
  }, [myAssignedIssues])

  const myActiveCreatedIssues = useMemo(() => {
    return myCreatedIssues.filter(isIssueActive)
  }, [myCreatedIssues])

  // Recently updated issues across the application
  const recentIssues = useMemo(() => {
    return [...allIssues].sort((a, b) => {
      const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime()
      const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime()
      return dateB - dateA
    })
  }, [allIssues])

  // Overall status breakdown for the active tab's scope
  const statusCounts = useMemo(() => {
    let source = myAssignedIssues
    if (activeTab === 'created') source = myCreatedIssues
    else if (activeTab === 'recent') source = allIssues

    const counts = { ALL: source.length, OPEN: 0, IN_PROGRESS: 0, BLOCKED: 0, RESOLVED: 0, CLOSED: 0 }
    source.forEach((i) => {
      const s = (i.status || 'OPEN').toUpperCase()
      if (counts[s] !== undefined) counts[s]++
    })
    return counts
  }, [activeTab, myAssignedIssues, myCreatedIssues, allIssues])

  // Filtered issues list to display
  const displayedIssues = useMemo(() => {
    let list = []
    if (activeTab === 'assigned') {
      list = activeOnly ? myActiveAssignedIssues : myAssignedIssues
    } else if (activeTab === 'created') {
      list = activeOnly ? myActiveCreatedIssues : myCreatedIssues
    } else {
      list = recentIssues
    }

    // High / urgent attention filter
    if (attentionOnly) {
      list = list.filter((i) => {
        const p = (i.priority || '').toUpperCase()
        return p === 'URGENT' || p === 'HIGH'
      })
    }

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
          i.assignedTo?.username?.toLowerCase().includes(q) ||
          String(i.issueId).includes(q)
      )
    }

    return list
  }, [activeTab, activeOnly, myActiveAssignedIssues, myAssignedIssues, myActiveCreatedIssues, myCreatedIssues, recentIssues, statusFilter, searchQuery, attentionOnly])

  const handleReviewAttention = () => {
    setActiveTab('assigned')
    setActiveOnly(true)
    setStatusFilter('ALL')
    setAttentionOnly(true)
    workAreaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // Create issue submission
  const handleCreateIssue = async (e) => {
    e.preventDefault()
    if (!issueForm.issueTitle.trim() || !issueForm.projectId || !issueForm.assignedToId) return

    setCreatingIssue(true)
    try {
      const payload = {
        issueTitle: issueForm.issueTitle.trim(),
        issueDesc: stripContentWrapper(issueForm.issueDesc.trim()),
        status: issueForm.status,
        priority: issueForm.priority,
        project: { projId: parseInt(issueForm.projectId) },
        createdBy: currentUser?.userId ? { userId: currentUser.userId, enabled: true } : { username: user?.username },
        assignedTo: { userId: parseInt(issueForm.assignedToId), enabled: true },
      }

      await apiCreateIssue(payload)
      setShowNewIssue(false)
      setIssueForm({
        issueTitle: '',
        issueDesc: '',
        status: 'OPEN',
        priority: 'MEDIUM',
        projectId: projects[0]?.projId || '',
        assignedToId: currentUser?.userId || users[0]?.userId || '',
      })
      await loadData()
    } catch (err) {
      showAlert(err.response?.data || err.message || 'Failed to create issue.', 'Create Issue Error')
    } finally {
      setCreatingIssue(false)
    }
  }

  if (!loading && issuesError && allIssues.length === 0) {
    return (
      <div className="p-6 max-w-4xl mx-auto min-h-[70vh] flex items-center justify-center">
        <ErrorState
          variant={isServerError ? 'server-down' : 'error'}
          title={isServerError ? 'Backend Server Unreachable' : 'Failed to Load Workspace'}
          message={
            isServerError
              ? 'Unable to connect to KnotFix API server. The Spring Boot backend might be offline or starting up.'
              : (error || 'Could not load workspace overview data.')
          }
          error={issuesError}
          onRetry={loadData}
        />
      </div>
    )
  }

  return (
    <>
      <div className="p-6 max-w-[1400px] mx-auto">
        {/* Dashboard Overview Header (Item 10) */}
        <section className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#4450b7]" />
              <h1 className="text-[22px] font-bold text-[#0b1c30] tracking-tight font-[Geist,sans-serif]">
                Personal Workspace Overview
              </h1>
            </div>
            <p className="text-[13px] text-[#565e74] mt-1 font-[Inter,sans-serif]">
              Focused view of issues assigned to you, items you reported, and active priorities.
            </p>
          </div>
        </section>

        {/* Urgent Attention Alert (Item 10) */}
        {!loading && urgentAttentionIssues.length > 0 && (
          <div className="mb-6 bg-rose-50/90 border border-rose-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <Flame className="w-5 h-5 text-rose-600" />
              </span>
              <div>
                <p className="text-[13px] font-bold text-rose-900 font-[Geist,sans-serif]">
                  {urgentAttentionIssues.length} High Priority {urgentAttentionIssues.length === 1 ? 'Issue' : 'Issues'} Needing Attention
                </p>
                <p className="text-[12px] text-rose-700 font-[Inter,sans-serif]">
                  Active issues assigned to you flagged as Urgent or High priority.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleReviewAttention}
              className={`shrink-0 text-[12px] font-bold px-3.5 py-1.5 rounded-xl transition-all font-[Geist,sans-serif] self-start sm:self-auto flex items-center gap-1.5 shadow-xs hover:shadow-sm active:scale-[0.98] ${
                attentionOnly
                  ? 'bg-rose-600 text-white hover:bg-rose-700 border border-rose-600'
                  : 'text-rose-700 hover:text-rose-900 bg-white border border-rose-200'
              }`}
            >
              <span>{attentionOnly ? 'Viewing Urgent' : 'Review Now'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Actionable Work Overview Metric Cards (Item 6 & 10) */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
          {/* Card 1: Needs Attention */}
          <div
            onClick={handleReviewAttention}
            className={`p-4 rounded-2xl border transition-all cursor-pointer bg-white ${
              attentionOnly
                ? 'border-rose-500 ring-2 ring-rose-500/20 shadow-sm bg-rose-50/30'
                : urgentAttentionIssues.length > 0
                ? 'border-rose-200 hover:border-rose-400 hover:shadow-sm'
                : 'border-[#e5eeff] hover:border-[#4450b7]/40 hover:shadow-xs'
            }`}
            style={{ boxShadow: '0 1px 3px rgba(11,28,48,0.03)' }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#565e74] uppercase tracking-wider font-[Geist,sans-serif]">
                Needs Attention
              </span>
              <span
                className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                  attentionOnly || urgentAttentionIssues.length > 0 ? 'bg-rose-100 text-rose-700' : 'bg-[#eff4ff] text-[#565e74]'
                }`}
              >
                <Zap className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-2.5 flex items-baseline gap-2">
              <span className="text-[26px] font-bold text-[#0b1c30] leading-none font-[Geist,sans-serif]">
                {loading ? '—' : urgentAttentionIssues.length}
              </span>
              <span className="text-[12px] text-[#565e74] font-[Inter,sans-serif]">
                urgent / high
              </span>
            </div>
            <p className="text-[11px] text-[#767684] mt-2 font-[Inter,sans-serif]">
              {attentionOnly ? 'Active attention filter applied' : 'Assigned to you'}
            </p>
          </div>

          {/* Card 2: Assigned to Me */}
          <div
            onClick={() => {
              setActiveTab('assigned')
              setActiveOnly(true)
              setStatusFilter('ALL')
              setAttentionOnly(false)
            }}
            className={`p-4 rounded-2xl border transition-all cursor-pointer bg-white ${
              activeTab === 'assigned' && !attentionOnly
                ? 'border-[#4450b7] ring-2 ring-[#4450b7]/15 shadow-xs'
                : 'border-[#e5eeff] hover:border-[#4450b7]/40 hover:shadow-xs'
            }`}
            style={{ boxShadow: '0 1px 3px rgba(11,28,48,0.03)' }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#565e74] uppercase tracking-wider font-[Geist,sans-serif]">
                Assigned to Me
              </span>
              <span className="w-7 h-7 rounded-lg bg-[#eff4ff] text-[#4450b7] flex items-center justify-center">
                <UserCheck className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-2.5 flex items-baseline gap-2">
              <span className="text-[26px] font-bold text-[#0b1c30] leading-none font-[Geist,sans-serif]">
                {loading ? '—' : myActiveAssignedIssues.length}
              </span>
              <span className="text-[12px] text-[#565e74] font-[Inter,sans-serif]">
                active / {myAssignedIssues.length} total
              </span>
            </div>
            <p className="text-[11px] text-[#767684] mt-2 font-[Inter,sans-serif]">
              Your active workload
            </p>
          </div>

          {/* Card 3: In Progress */}
          <div
            onClick={() => {
              setActiveTab('assigned')
              setActiveOnly(false)
              setStatusFilter('IN_PROGRESS')
              setAttentionOnly(false)
            }}
            className={`p-4 rounded-2xl border transition-all cursor-pointer bg-white ${
              statusFilter === 'IN_PROGRESS' && !attentionOnly
                ? 'border-amber-400 ring-2 ring-amber-400/15 shadow-xs'
                : 'border-[#e5eeff] hover:border-amber-400/50 hover:shadow-xs'
            }`}
            style={{ boxShadow: '0 1px 3px rgba(11,28,48,0.03)' }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#565e74] uppercase tracking-wider font-[Geist,sans-serif]">
                In Progress
              </span>
              <span className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-2.5 flex items-baseline gap-2">
              <span className="text-[26px] font-bold text-[#0b1c30] leading-none font-[Geist,sans-serif]">
                {loading ? '—' : inProgressIssues.length}
              </span>
              <span className="text-[12px] text-[#565e74] font-[Inter,sans-serif]">
                in development
              </span>
            </div>
            <p className="text-[11px] text-[#767684] mt-2 font-[Inter,sans-serif]">
              Actively being resolved
            </p>
          </div>

          {/* Card 4: Created by Me */}
          <div
            onClick={() => {
              setActiveTab('created')
              setActiveOnly(true)
              setStatusFilter('ALL')
              setAttentionOnly(false)
            }}
            className={`p-4 rounded-2xl border transition-all cursor-pointer bg-white ${
              activeTab === 'created'
                ? 'border-[#4450b7] ring-2 ring-[#4450b7]/15 shadow-xs'
                : 'border-[#e5eeff] hover:border-[#4450b7]/40 hover:shadow-xs'
            }`}
            style={{ boxShadow: '0 1px 3px rgba(11,28,48,0.03)' }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#565e74] uppercase tracking-wider font-[Geist,sans-serif]">
                Reported by Me
              </span>
              <span className="w-7 h-7 rounded-lg bg-[#eff4ff] text-[#4450b7] flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-2.5 flex items-baseline gap-2">
              <span className="text-[26px] font-bold text-[#0b1c30] leading-none font-[Geist,sans-serif]">
                {loading ? '—' : myActiveCreatedIssues.length}
              </span>
              <span className="text-[12px] text-[#565e74] font-[Inter,sans-serif]">
                open / {myCreatedIssues.length} total
              </span>
            </div>
            <p className="text-[11px] text-[#767684] mt-2 font-[Inter,sans-serif]">
              Issues you submitted
            </p>
          </div>
        </section>

        {/* Main Work Area */}
        <div ref={workAreaRef} className="bg-white rounded-2xl border border-[#e5eeff] shadow-xs overflow-hidden">
          {/* Top Control Bar: Tabs + Active Toggle + Search */}
          <div className="p-4 border-b border-[#e5eeff] flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* View Tabs */}
            <div className="flex items-center gap-1 bg-[#eff4ff] p-1 rounded-xl">
              <button
                onClick={() => {
                  setActiveTab('assigned')
                  setStatusFilter('ALL')
                  setAttentionOnly(false)
                }}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all font-[Geist,sans-serif] flex items-center gap-1.5 ${
                  activeTab === 'assigned'
                    ? 'bg-white text-[#4450b7] font-semibold shadow-xs'
                    : 'text-[#454652] hover:text-[#0b1c30]'
                }`}
              >
                <span>Assigned to Me</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  activeTab === 'assigned' ? 'bg-[#dce9ff] text-[#4450b7]' : 'bg-[#e5eeff] text-[#565e74]'
                }`}>
                  {myActiveAssignedIssues.length}
                </span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('created')
                  setStatusFilter('ALL')
                  setAttentionOnly(false)
                }}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all font-[Geist,sans-serif] flex items-center gap-1.5 ${
                  activeTab === 'created'
                    ? 'bg-white text-[#4450b7] font-semibold shadow-xs'
                    : 'text-[#454652] hover:text-[#0b1c30]'
                }`}
              >
                <span>Created by Me</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  activeTab === 'created' ? 'bg-[#dce9ff] text-[#4450b7]' : 'bg-[#e5eeff] text-[#565e74]'
                }`}>
                  {myActiveCreatedIssues.length}
                </span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('recent')
                  setStatusFilter('ALL')
                  setAttentionOnly(false)
                }}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all font-[Geist,sans-serif] flex items-center gap-1.5 ${
                  activeTab === 'recent'
                    ? 'bg-white text-[#4450b7] font-semibold shadow-xs'
                    : 'text-[#454652] hover:text-[#0b1c30]'
                }`}
              >
                <span>Recent Activity</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  activeTab === 'recent' ? 'bg-[#dce9ff] text-[#4450b7]' : 'bg-[#e5eeff] text-[#565e74]'
                }`}>
                  {allIssues.length}
                </span>
              </button>
            </div>

            {/* Right: Active-only toggle & Search */}
            <div className="flex items-center gap-3">
              {activeTab !== 'recent' && (
                <label className="flex items-center gap-2 text-[12px] text-[#454652] cursor-pointer select-none font-[Inter,sans-serif]">
                  <input
                    type="checkbox"
                    checked={activeOnly}
                    onChange={(e) => setActiveOnly(e.target.checked)}
                    className="rounded accent-[#4450b7] text-[#4450b7]"
                  />
                  <span>Active only</span>
                </label>
              )}

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

          {/* Secondary Status Summary Bar */}
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

              {attentionOnly && (
                <button
                  type="button"
                  onClick={() => setAttentionOnly(false)}
                  className="h-6 px-2.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1.5 hover:bg-rose-200 transition-colors cursor-pointer"
                  title="Clear high priority filter"
                >
                  <Flame className="w-3 h-3 text-rose-600" />
                  <span>Urgent & High Priority</span>
                  <span className="text-rose-600 font-bold ml-0.5">×</span>
                </button>
              )}
            </div>

            <span className="text-[11px] text-[#767684] font-[Inter,sans-serif]">
              Showing <strong className="text-[#0b1c30] font-semibold">{displayedIssues.length}</strong> {displayedIssues.length === 1 ? 'issue' : 'issues'}
              {attentionOnly && <span className="text-rose-600 font-semibold ml-1.5">(Urgent & High Priority)</span>}
            </span>
          </div>

          {/* Loading Skeleton */}
          {loading && (
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
          {!loading && displayedIssues.length > 0 && (
            <div className="divide-y divide-[#e5eeff]">
              {displayedIssues.map((issue) => {
                return (
                  <div
                    key={issue.issueId}
                    onClick={() => navigate(`/issues/${issue.issueId}`)}
                    className="px-4 py-3 hover:bg-[#eff4ff]/50 transition-colors cursor-pointer flex items-center justify-between gap-4 group"
                  >
                    {/* Left: Priority, Key, Title, Project */}
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

                    {/* Right: Assignee/Creator info, Status, Date */}
                    <div className="flex items-center gap-3 shrink-0">
                      {activeTab === 'created' ? (
                        <div className="hidden md:flex items-center gap-1.5 text-[11px] text-[#565e74]">
                          <span className="text-[#767684]">Assignee:</span>
                          <Avatar name={issue.assignedTo?.username} size="xs" />
                          <span className="font-medium text-[#0b1c30]">{issue.assignedTo?.username || 'Unassigned'}</span>
                        </div>
                      ) : (
                        <div className="hidden md:flex items-center gap-1.5 text-[11px] text-[#565e74]">
                          <span className="text-[#767684]">By:</span>
                          <Avatar name={issue.createdBy?.username} size="xs" />
                          <span className="font-medium text-[#0b1c30]">{issue.createdBy?.username || '—'}</span>
                        </div>
                      )}

                      <StatusBadge status={issue.status} />

                      <span className="text-[11px] text-[#767684] w-20 text-right hidden sm:block font-[Inter,sans-serif]">
                        {formatRelativeTime(issue.updatedAt || issue.createdAt)}
                      </span>

                      <ChevronRight className="w-4 h-4 text-[#c6c5d5] group-hover:text-[#4450b7] group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Empty State */}
          {!loading && displayedIssues.length === 0 && (
            <div className="text-center py-16 px-4">
              {activeTab === 'assigned' ? (
                <CheckCircle2 className="w-10 h-10 mx-auto text-[#c6c5d5]" />
              ) : (
                <Inbox className="w-10 h-10 mx-auto text-[#c6c5d5]" />
              )}
              <p className="mt-2 text-[15px] font-semibold text-[#0b1c30] font-[Geist,sans-serif]">
                {searchQuery || statusFilter !== 'ALL' || attentionOnly
                  ? 'No issues match your filters'
                  : activeTab === 'assigned'
                  ? (activeOnly ? 'All clear! No active issues assigned to you' : 'No issues assigned to you')
                  : activeTab === 'created'
                  ? (activeOnly ? 'No open issues reported by you' : 'You haven’t reported any issues yet')
                  : 'No recent activity'}
              </p>
              <p className="text-[12px] text-[#565e74] mt-1 max-w-sm mx-auto font-[Inter,sans-serif]">
                {searchQuery || statusFilter !== 'ALL' || attentionOnly
                  ? 'Try changing or clearing your search criteria.'
                  : 'Issues assigned to or created by you will appear here for easy tracking.'}
              </p>
              {(searchQuery || statusFilter !== 'ALL' || !activeOnly || attentionOnly) && (
                <button
                  onClick={() => {
                    setSearchQuery('')
                    setStatusFilter('ALL')
                    setActiveOnly(true)
                    setAttentionOnly(false)
                  }}
                  className="mt-3.5 h-8 px-3.5 border border-[#c6c5d5] text-[#0b1c30] text-[12px] font-medium rounded-lg hover:bg-[#f8f9ff] transition-colors font-[Geist,sans-serif]"
                >
                  Reset Filters
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* New Issue Modal */}
      <Modal open={showNewIssue} onClose={() => setShowNewIssue(false)} title="Create New Issue">
        <form onSubmit={handleCreateIssue} className="p-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-[#454652] uppercase tracking-wider font-[Geist,sans-serif]">
              Project *
            </label>
            <select
              required
              value={issueForm.projectId}
              onChange={(e) => setIssueForm((prev) => ({ ...prev, projectId: e.target.value }))}
              className="w-full h-10 px-3 rounded-xl bg-[#f8f9ff] border border-[#c6c5d5] text-[13px] text-[#0b1c30] outline-none focus:border-[#4450b7] transition-all font-[Inter,sans-serif]"
            >
              {projects.map((p) => (
                <option key={p.projId} value={p.projId}>
                  {p.projTitle}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-[#454652] uppercase tracking-wider font-[Geist,sans-serif]">
              Issue Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Fix auth token refresh race condition"
              value={issueForm.issueTitle}
              onChange={(e) => setIssueForm((prev) => ({ ...prev, issueTitle: e.target.value }))}
              className="w-full h-10 px-3 rounded-xl bg-[#f8f9ff] border border-[#c6c5d5] text-[13px] text-[#0b1c30] outline-none focus:border-[#4450b7] transition-all font-[Inter,sans-serif]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-[#454652] uppercase tracking-wider font-[Geist,sans-serif]">
              Description
            </label>
            <textarea
              placeholder="Provide context, reproduction steps, or details..."
              rows={3}
              value={issueForm.issueDesc}
              onChange={(e) => setIssueForm((prev) => ({ ...prev, issueDesc: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl bg-[#f8f9ff] border border-[#c6c5d5] text-[13px] text-[#0b1c30] outline-none focus:border-[#4450b7] transition-all resize-none font-[Inter,sans-serif]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-[#454652] uppercase tracking-wider font-[Geist,sans-serif]">
                Priority
              </label>
              <select
                value={issueForm.priority}
                onChange={(e) => setIssueForm((prev) => ({ ...prev, priority: e.target.value }))}
                className="w-full h-10 px-3 rounded-xl bg-[#f8f9ff] border border-[#c6c5d5] text-[13px] text-[#0b1c30] outline-none focus:border-[#4450b7] transition-all font-[Inter,sans-serif]"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-[#454652] uppercase tracking-wider font-[Geist,sans-serif]">
                Assignee *
              </label>
              <select
                required
                value={issueForm.assignedToId}
                onChange={(e) => setIssueForm((prev) => ({ ...prev, assignedToId: e.target.value }))}
                className="w-full h-10 px-3 rounded-xl bg-[#f8f9ff] border border-[#c6c5d5] text-[13px] text-[#0b1c30] outline-none focus:border-[#4450b7] transition-all font-[Inter,sans-serif]"
              >
                {users.map((u) => (
                  <option key={u.userId} value={u.userId}>
                    {u.username} ({u.email || 'Member'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowNewIssue(false)}
              className="flex-1 h-10 border border-[#c6c5d5] text-[#0b1c30] text-[13px] font-medium rounded-xl hover:bg-[#f8f9ff] transition-colors font-[Geist,sans-serif]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creatingIssue}
              className="flex-1 h-10 bg-[#4450b7] hover:bg-[#3540a0] disabled:opacity-60 text-white text-[13px] font-semibold rounded-xl transition-all font-[Geist,sans-serif] shadow-sm"
            >
              {creatingIssue ? 'Creating...' : 'Create Issue'}
            </button>
          </div>
        </form>
      </Modal>

      {/* App-styled Alert Modal (Item 3) */}
      <AlertModal
        isOpen={alertState.isOpen}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
        onClose={() => setAlertState((prev) => ({ ...prev, isOpen: false }))}
      />
    </>
  )
}
