import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Calendar,
  PlusCircle,
  Edit3,
  Trash2,
  Search,
  Inbox,
  ArrowRight,
  Plus,
  Users,
  ShieldAlert,
} from 'lucide-react'
import Modal from '../components/Modal'
import StatusBadge from '../components/StatusBadge'
import PriorityBadge from '../components/PriorityBadge'
import Avatar from '../components/Avatar'
import AlertModal from '../components/AlertModal'
import ConfirmModal from '../components/ConfirmModal'
import ErrorState from '../components/ErrorState'
import { stripContentWrapper } from '../utils/text'
import {
  apiUpdateProject,
  apiCreateIssue,
  apiDeleteIssue,
  apiDeleteProject,
} from '../api/client'
import { useProject, useIssues, useUsers } from '../api/queries'
import { useAuth } from '../context/AuthContext'

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function ProjectDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [filterQuery, setFilterQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [filterPriority, setFilterPriority] = useState('ALL')

  const [showNewIssue, setShowNewIssue] = useState(false)
  const [showEditProject, setShowEditProject] = useState(false)
  const [creatingIssue, setCreatingIssue] = useState(false)
  const [updatingProject, setUpdatingProject] = useState(false)

  // Dialog state (Item 3)
  const [alertState, setAlertState] = useState({ isOpen: false, title: '', message: '', type: 'error' })
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    isDanger: false,
    action: null,
  })

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

  const [newIssue, setNewIssue] = useState({ issueTitle: '', issueDesc: '', status: 'OPEN', priority: 'MEDIUM', assignedToId: '' })
  const [editProject, setEditProject] = useState({ projTitle: '', projDesc: '', memberIds: [] })

  // React Query hooks
  const { data: project, isLoading: projLoading, error: projError, refetch: refetchProject } = useProject(id)
  const { data: allIssues = [], isLoading: issuesLoading, refetch: refetchIssues } = useIssues()
  // Fetch users only when New Issue or Edit Project modal opens
  const { data: allUsers = [] } = useUsers({ enabled: showNewIssue || showEditProject })

  const loading = projLoading || issuesLoading
  const error = projError?.response?.data || projError?.message || ''

  // Compute issues belonging to this project
  const issues = useMemo(() => {
    if (Array.isArray(project?.issues) && project.issues.length > 0) {
      return project.issues
    }
    const numericId = parseInt(id)
    return allIssues.filter((i) => i.project?.projId === numericId)
  }, [project?.issues, allIssues, id])

  // Sync edit form when project details load
  useEffect(() => {
    if (project) {
      const memberIds = (project.projectMembers ?? []).map((m) => m.userId)
      setEditProject({ projTitle: project.projTitle ?? '', projDesc: project.projDesc ?? '', memberIds })
    }
  }, [project])


  const load = () => {
    refetchProject()
    refetchIssues()
  }

  const handleCreateIssue = async (e) => {
    e.preventDefault()
    if (!newIssue.issueTitle.trim()) return

    const members = (project?.projectMembers && project.projectMembers.length > 0)
      ? project.projectMembers
      : allUsers

    const assignedUserId = newIssue.assignedToId
      ? parseInt(newIssue.assignedToId)
      : members.find((u) => u.username === user?.username)?.userId ?? (members[0]?.userId ?? null)

    if (!assignedUserId) {
      showAlert('Please select an assignee. The backend requires an assignee from the project team.', 'Assignee Required', 'warning')
      return
    }

    setCreatingIssue(true)
    try {
      const payload = {
        issueTitle: newIssue.issueTitle.trim(),
        issueDesc: stripContentWrapper(newIssue.issueDesc.trim()),
        status: newIssue.status,
        priority: newIssue.priority,
        project: { projId: parseInt(id) },
        createdBy: { userId: user?.userId, enabled: true },
        assignedTo: { userId: assignedUserId, enabled: true },
      }
      const res = await apiCreateIssue(payload)
      if (typeof res.data === 'string' && (res.data.includes('not a part') || res.data.startsWith('Failed'))) {
        showAlert(res.data, 'Validation Error', 'error')
        return
      }
      setShowNewIssue(false)
      setNewIssue({ issueTitle: '', issueDesc: '', status: 'OPEN', priority: 'MEDIUM', assignedToId: '' })
      await load()
    } catch (err) {
      showAlert(err.response?.data || err.message || 'Failed to create issue.', 'Create Issue Error')
    } finally {
      setCreatingIssue(false)
    }
  }

  const handleUpdateProject = async (e) => {
    e.preventDefault()
    setUpdatingProject(true)
    try {
      let memberIds = [...editProject.memberIds]
      if (memberIds.length === 0) {
        const me = allUsers.find((u) => u.username === user?.username)
        if (me) memberIds = [me.userId]
      }
      const ownerUserId =
        project?.ownerId?.userId ||
        allUsers.find((u) => u.username === user?.username)?.userId ||
        user?.userId ||
        memberIds[0]

      await apiUpdateProject(
        id,
        {
          projTitle: editProject.projTitle,
          projDesc: editProject.projDesc,
          ownerId: ownerUserId ? { userId: ownerUserId } : undefined,
        },
        memberIds
      )
      setShowEditProject(false)
      await load()
    } catch (err) {
      showAlert(err.response?.data || err.message || 'Failed to update project.', 'Update Project Error')
    } finally {
      setUpdatingProject(false)
    }
  }

  const promptDeleteProject = () => {
    setConfirmState({
      isOpen: true,
      title: 'Delete Project',
      message: `Are you sure you want to delete "${project?.projTitle}"? All associated issues and comments will be permanently removed.`,
      confirmText: 'Delete Project',
      isDanger: true,
      action: async () => {
        try {
          await apiDeleteProject(id)
          navigate('/projects')
        } catch (err) {
          showAlert(err.response?.data || err.message || 'Failed to delete project.', 'Delete Error')
        }
      },
    })
  }

  const promptDeleteIssue = (issueId, issueTitle, e) => {
    e.stopPropagation()
    setConfirmState({
      isOpen: true,
      title: 'Delete Issue',
      message: `Are you sure you want to delete issue "${issueTitle || `#${issueId}`}"? This action cannot be undone.`,
      confirmText: 'Delete Issue',
      isDanger: true,
      action: async () => {
        try {
          await apiDeleteIssue(issueId)
          await refetchIssues()
          await refetchProject()
        } catch (err) {
          showAlert(err.response?.data || err.message || 'Failed to delete issue.', 'Delete Error')
        }
      },
    })
  }

  const isProjectOwner = useMemo(() => {
    // Legacy projects in DB without an ownerId can be edited and deleted by the user
    if (!project?.ownerId || !project?.ownerId?.username) {
      return true
    }
    if (user?.username && project.ownerId.username === user.username) {
      return true
    }
    if (user?.userId && project.ownerId.userId === user.userId) {
      return true
    }
    if (project?.projectMembers?.some((m) => m.username === user?.username || m.userId === user?.userId)) {
      return true
    }
    if (user?.role === 'ADMIN' || user?.role === 'ROLE_ADMIN') {
      return true
    }
    return false
  }, [project?.ownerId, project?.projectMembers, user?.username, user?.userId, user?.role])

  const filtered = issues.filter((i) => {
    const matchQuery = !filterQuery || i.issueTitle?.toLowerCase().includes(filterQuery.toLowerCase())
    const matchStatus = filterStatus === 'ALL' || i.status?.toUpperCase() === filterStatus
    const matchPriority = filterPriority === 'ALL' || i.priority?.toUpperCase() === filterPriority
    return matchQuery && matchStatus && matchPriority
  })

  const openCount = issues.filter((i) => i.status?.toUpperCase() === 'OPEN').length
  const closedCount = issues.filter((i) => ['CLOSED', 'RESOLVED'].includes(i.status?.toUpperCase())).length
  const progress = issues.length > 0 ? Math.round((closedCount / issues.length) * 100) : 0
  const members = project?.projectMembers ?? []

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#4450b7] border-t-transparent animate-spin" />
          <p className="text-[13px] text-[#565e74] font-[Inter,sans-serif]">Loading project details...</p>
        </div>
      </div>
    )
  }

  if (!loading && (!project || projError)) {
    const isServerDown = Boolean(
      projError && (
        !projError.response ||
        projError.response.status >= 500 ||
        projError.code === 'ERR_NETWORK' ||
        projError.code === 'ECONNABORTED'
      )
    )
    const isNotFound = projError?.response?.status === 404 || (!project && !projError && !isServerDown)

    return (
      <div className="p-6 max-w-4xl mx-auto min-h-[60vh] flex items-center justify-center">
        <ErrorState
          variant={isNotFound ? 'not-found' : isServerDown ? 'server-down' : 'error'}
          title={isNotFound ? 'Project Not Found' : isServerDown ? 'Server Unreachable' : 'Failed to Load Project'}
          message={
            isNotFound
              ? `Project #${id} could not be found. It may have been deleted, or you might not have permission to view it.`
              : isServerDown
              ? 'Cannot connect to the KnotFix backend server. The Spring Boot application might be offline or starting up.'
              : (error || 'An unexpected error occurred while loading this project.')
          }
          error={projError}
          onRetry={() => {
            refetchProject()
            refetchIssues()
          }}
          action={
            <button
              type="button"
              onClick={() => navigate('/projects')}
              className="h-9 px-4 bg-[#eff4ff] hover:bg-[#e5eeff] text-[#0b1c30] text-[13px] font-medium rounded-xl flex items-center justify-center gap-1.5 border border-[#c6c5d5]/60 transition-all font-[Geist,sans-serif]"
            >
              <LayoutDashboard className="w-4 h-4" />
              Back to Projects
            </button>
          }
        />
      </div>
    )
  }

  return (
    <>
      <div className="p-6 max-w-[1600px] mx-auto">
        {/* Breadcrumb (Item 6) */}
        <div className="flex items-center gap-2 text-[12px] text-[#565e74] mb-4 font-[Inter,sans-serif]">
          <button onClick={() => navigate('/projects')} className="hover:text-[#0b1c30] flex items-center gap-1.5 font-medium transition-colors">
            <LayoutDashboard className="w-3.5 h-3.5" />
            Projects
          </button>
          <span className="text-[#c6c5d5]">/</span>
          <span className="text-[#0b1c30] font-semibold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#4450b7]" />
            {project?.projTitle ?? 'Project'}
          </span>
        </div>

        {error && (
          <div className="mb-4 bg-[#ffdad6] border border-[#ffb4a9] rounded-xl px-4 py-3 text-[13px] text-[#ba1a1a] font-[Inter,sans-serif] flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Project Header Card */}
        <div className="bg-white rounded-2xl p-6 border border-[#e5eeff] mb-6 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="flex-1 min-w-0">
              <h1 className="text-[22px] font-bold text-[#0b1c30] tracking-tight font-[Geist,sans-serif]">
                {project?.projTitle}
              </h1>
              {project?.projDesc && (
                <p className="text-[13px] text-[#565e74] mt-1.5 font-[Inter,sans-serif] max-w-3xl leading-relaxed">
                  {stripContentWrapper(project.projDesc)}
                </p>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-2.5 text-[12px]">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#eff4ff] border border-[#e5eeff]">
                  <Avatar name={project?.ownerId?.username} size="xs" />
                  <span className="text-[#565e74]">Owner:</span>
                  <span className="font-semibold text-[#0b1c30]">{project?.ownerId?.username ?? '—'}</span>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#eff4ff] border border-[#e5eeff]">
                  <div className="flex -space-x-1.5">
                    {members.slice(0, 3).map((m, i) => (
                      <Avatar key={m.userId ?? i} name={m.username} size="xs" className="ring-1 ring-white" />
                    ))}
                  </div>
                  <span className="font-medium text-[#0b1c30]">{members.length} Members</span>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#eff4ff] border border-[#e5eeff]">
                  <Calendar className="w-3.5 h-3.5 text-[#767684]" />
                  <span className="text-[#565e74]">
                    Updated: <strong className="text-[#0b1c30]">{formatDate(project?.updatedAt)}</strong>
                  </span>
                </div>
              </div>
            </div>

            <div className="w-full lg:w-72 bg-[#eff4ff]/50 border border-[#e5eeff] rounded-2xl p-4 flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#565e74] uppercase tracking-wider font-[Geist,sans-serif]">
                  Completion
                </span>
                <span className="text-[13px] font-bold text-[#4450b7] font-[Geist,sans-serif]">{progress}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#dce9ff] overflow-hidden">
                <div className="bg-[#4450b7] h-full rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
              <div className="flex items-center justify-between text-[11px] text-[#565e74] font-[Inter,sans-serif]">
                <span>{issues.length} issues total</span>
                <div className="flex items-center gap-2.5">
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#4450b7]" />
                    {closedCount} closed
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    {openCount} open
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Bar (Item 6) */}
          <div className="flex items-center gap-2 mt-5 pt-4 border-t border-[#e5eeff]">
            <button
              onClick={() => setShowNewIssue(true)}
              className="h-9 px-3.5 bg-[#4450b7] hover:bg-[#3540a0] text-white text-[12px] font-semibold rounded-xl flex items-center gap-1.5 transition-colors font-[Geist,sans-serif] shadow-sm"
            >
              <PlusCircle className="w-4 h-4" />
              <span>New Issue</span>
            </button>
            <button
              onClick={() => setShowEditProject(true)}
              className="h-9 px-3.5 bg-[#eff4ff] hover:bg-[#e5eeff] text-[#0b1c30] text-[12px] font-semibold rounded-xl flex items-center gap-1.5 border border-[#c6d7ff] transition-colors font-[Geist,sans-serif]"
            >
              <Edit3 className="w-3.5 h-3.5 text-[#565e74]" />
              <span>Edit Project</span>
            </button>
            <button
              onClick={promptDeleteProject}
              className="h-9 px-3.5 bg-red-50 hover:bg-red-100 text-red-600 text-[12px] font-semibold rounded-xl flex items-center gap-1.5 border border-red-200 transition-colors font-[Geist,sans-serif] ml-auto"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Project</span>
            </button>
          </div>
        </div>

        {/* Issues Table + Sidebar */}
        <div className="flex flex-col xl:flex-row gap-5 items-start">
          <div className="flex-1 min-w-0 bg-white rounded-2xl border border-[#e5eeff] overflow-hidden shadow-sm">
            {/* Table Toolbar */}
            <div className="px-5 py-3 border-b border-[#e5eeff] bg-white flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="text-[14px] font-bold text-[#0b1c30] font-[Geist,sans-serif]">Project Issues</span>
                <span className="px-2 py-0.5 rounded-full bg-[#eff4ff] text-[#4450b7] text-[11px] font-semibold font-mono">
                  {filtered.length}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="h-8 px-2.5 rounded-lg bg-[#eff4ff] border border-[#e5eeff] text-[12px] text-[#0b1c30] outline-none cursor-pointer font-[Geist,sans-serif]"
                >
                  {['ALL', 'OPEN', 'IN_PROGRESS', 'BLOCKED', 'RESOLVED', 'CLOSED'].map((s) => (
                    <option key={s} value={s}>{s === 'ALL' ? 'Status: All' : s.replace('_', ' ')}</option>
                  ))}
                </select>
                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                  className="h-8 px-2.5 rounded-lg bg-[#eff4ff] border border-[#e5eeff] text-[12px] text-[#0b1c30] outline-none cursor-pointer font-[Geist,sans-serif]"
                >
                  {['ALL', 'URGENT', 'HIGH', 'MEDIUM', 'LOW'].map((p) => (
                    <option key={p} value={p}>{p === 'ALL' ? 'Priority: All' : p}</option>
                  ))}
                </select>
                <div className="flex items-center gap-1.5 bg-[#eff4ff] px-2.5 h-8 rounded-lg border border-[#e5eeff]">
                  <Search className="w-3.5 h-3.5 text-[#767684]" />
                  <input
                    type="text"
                    placeholder="Search issues..."
                    value={filterQuery}
                    onChange={(e) => setFilterQuery(e.target.value)}
                    className="bg-transparent border-none outline-none text-[12px] text-[#0b1c30] placeholder:text-[#767684] w-36 font-[Inter,sans-serif]"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px] text-[#0b1c30]">
                <thead className="bg-[#eff4ff]/70 text-[#565e74] text-[11px] uppercase font-bold select-none font-[Geist,sans-serif]">
                  <tr>
                    <th className="w-16 px-4 py-3"># ID</th>
                    <th className="px-4 py-3">Title</th>
                    <th className="w-32 px-3 py-3">Status</th>
                    <th className="w-28 px-3 py-3">Priority</th>
                    <th className="w-36 px-3 py-3">Assignee</th>
                    <th className="w-28 px-3 py-3">Created</th>
                    <th className="w-20 px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-[#767684] font-[Inter,sans-serif]">
                        <Inbox className="w-9 h-9 mx-auto mb-2 text-[#c6c5d5]" />
                        <span>No issues found matching criteria</span>
                      </td>
                    </tr>
                  )}
                  {filtered.map((issue, idx) => {
                    const isIssueCreator = issue.createdBy?.username === user?.username || user?.role === 'ADMIN'
                    return (
                      <tr
                        key={issue.issueId}
                        onClick={() => navigate(`/issues/${issue.issueId}`)}
                        className={`hover:bg-[#eff4ff]/40 transition-colors cursor-pointer group border-b border-[#e5eeff] ${idx % 2 === 0 ? '' : 'bg-white'}`}
                      >
                        <td className="w-16 px-4 py-3 font-mono text-[11px] text-[#767684]">#{issue.issueId}</td>
                        <td className="px-4 py-3 min-w-0">
                          <span className="font-semibold text-[#0b1c30] text-[13px] hover:text-[#4450b7] transition-colors truncate block max-w-md">
                            {issue.issueTitle}
                          </span>
                        </td>
                        <td className="w-32 px-3 py-3"><StatusBadge status={issue.status} /></td>
                        <td className="w-28 px-3 py-3"><PriorityBadge priority={issue.priority} /></td>
                        <td className="w-36 px-3 py-3">
                          {issue.assignedTo ? (
                            <div className="flex items-center gap-2">
                              <Avatar name={issue.assignedTo.username} size="xs" />
                              <span className="text-[12px] text-[#565e74] truncate max-w-[100px] font-[Inter,sans-serif]">
                                {issue.assignedTo.username}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[12px] text-[#767684] italic font-[Inter,sans-serif]">Unassigned</span>
                          )}
                        </td>
                        <td className="w-28 px-3 py-3 font-mono text-[11px] text-[#767684]">{formatDate(issue.createdAt)}</td>
                        <td className="w-20 px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); navigate(`/issues/${issue.issueId}`) }}
                              className="p-1.5 hover:bg-[#eff4ff] rounded-lg text-[#565e74] hover:text-[#4450b7] transition-colors"
                              title="View Issue"
                            >
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                            {isIssueCreator && (
                              <button
                                type="button"
                                onClick={(e) => promptDeleteIssue(issue.issueId, issue.issueTitle, e)}
                                className="p-1.5 hover:bg-red-50 rounded-lg text-[#767684] hover:text-red-600 transition-colors"
                                title="Delete Issue"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="px-5 py-3 bg-white border-t border-[#e5eeff] flex items-center justify-between text-[12px] text-[#565e74] font-[Inter,sans-serif]">
              <span>Showing <strong className="text-[#0b1c30]">{filtered.length}</strong> of {issues.length} issues</span>
              <button
                type="button"
                onClick={() => setShowNewIssue(true)}
                className="flex items-center gap-1 text-[#4450b7] hover:underline font-semibold font-[Geist,sans-serif]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add issue</span>
              </button>
            </div>
          </div>

          {/* Right Inspector */}
          <aside className="w-full xl:w-[320px] shrink-0 flex flex-col gap-4">
            <div className="bg-white rounded-2xl p-5 border border-[#e5eeff] shadow-sm">
              <h3 className="text-[13px] font-bold text-[#0b1c30] mb-3 font-[Geist,sans-serif]">Project Details</h3>
              <div className="flex flex-col gap-2.5 text-[12px]">
                {[
                  { label: 'OWNER', value: project?.ownerId?.username ?? '—' },
                  { label: 'MEMBERS', value: `${members.length} team members` },
                  { label: 'TOTAL ISSUES', value: issues.length },
                  { label: 'OPEN', value: openCount },
                  { label: 'CLOSED', value: closedCount },
                  { label: 'CREATED', value: formatDate(project?.createdAt) },
                  { label: 'UPDATED', value: formatDate(project?.updatedAt) },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between py-1.5 border-b border-[#f1f5ff] last:border-0">
                    <span className="text-[11px] font-bold text-[#767684] uppercase tracking-wider font-[Geist,sans-serif]">{label}</span>
                    <span className="text-[#0b1c30] font-semibold font-[Inter,sans-serif]">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-[#e5eeff] shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-[#4450b7]" />
                <h3 className="text-[13px] font-bold text-[#0b1c30] font-[Geist,sans-serif]">Assigned Team</h3>
              </div>
              <div className="flex flex-col gap-2">
                {members.slice(0, 8).map((m) => (
                  <div key={m.userId} className="flex items-center justify-between py-1 border-b border-[#f8f9ff] last:border-0">
                    <div className="flex items-center gap-2">
                      <Avatar name={m.username} size="sm" />
                      <span className="text-[12px] text-[#0b1c30] font-medium font-[Inter,sans-serif]">{m.username}</span>
                    </div>
                    {m.userId === project?.ownerId?.userId && (
                      <span className="text-[10px] text-[#4450b7] bg-[#eff4ff] border border-[#c6d7ff] px-2 py-0.5 rounded-full font-bold font-[Geist,sans-serif]">
                        Owner
                      </span>
                    )}
                  </div>
                ))}
                {members.length === 0 && (
                  <p className="text-[12px] text-[#767684] italic font-[Inter,sans-serif]">No team members assigned</p>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* New Issue Modal */}
      <Modal open={showNewIssue} onClose={() => setShowNewIssue(false)} title="New Issue">
        <form onSubmit={handleCreateIssue} className="p-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-[#454652] uppercase tracking-wider font-[Geist,sans-serif]">Title *</label>
            <input
              type="text" required
              placeholder="Issue title..."
              value={newIssue.issueTitle}
              onChange={(e) => setNewIssue((p) => ({ ...p, issueTitle: e.target.value }))}
              className="w-full h-10 px-3 rounded-xl bg-[#f8f9ff] border border-[#c6c5d5] text-[13px] text-[#0b1c30] outline-none focus:border-[#4450b7] focus:ring-2 focus:ring-[#4450b7]/15 transition-all font-[Inter,sans-serif]"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-[#454652] uppercase tracking-wider font-[Geist,sans-serif]">Description</label>
            <textarea
              rows={3}
              placeholder="Describe the issue..."
              value={newIssue.issueDesc}
              onChange={(e) => setNewIssue((p) => ({ ...p, issueDesc: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl bg-[#f8f9ff] border border-[#c6c5d5] text-[13px] text-[#0b1c30] outline-none focus:border-[#4450b7] focus:ring-2 focus:ring-[#4450b7]/15 transition-all resize-none font-[Inter,sans-serif]"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-[#454652] uppercase tracking-wider font-[Geist,sans-serif]">Status</label>
              <select
                value={newIssue.status}
                onChange={(e) => setNewIssue((p) => ({ ...p, status: e.target.value }))}
                className="h-10 px-3 rounded-xl bg-[#f8f9ff] border border-[#c6c5d5] text-[13px] text-[#0b1c30] outline-none focus:border-[#4450b7] transition-all font-[Inter,sans-serif]"
              >
                {['OPEN', 'IN_PROGRESS', 'BLOCKED', 'RESOLVED', 'CLOSED'].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-[#454652] uppercase tracking-wider font-[Geist,sans-serif]">Priority</label>
              <select
                value={newIssue.priority}
                onChange={(e) => setNewIssue((p) => ({ ...p, priority: e.target.value }))}
                className="h-10 px-3 rounded-xl bg-[#f8f9ff] border border-[#c6c5d5] text-[13px] text-[#0b1c30] outline-none focus:border-[#4450b7] transition-all font-[Inter,sans-serif]"
              >
                {['URGENT', 'HIGH', 'MEDIUM', 'LOW'].map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-[#454652] uppercase tracking-wider font-[Geist,sans-serif]">
              Assignee <span className="text-[#dc2626]">*</span>
            </label>
            <select
              value={newIssue.assignedToId}
              onChange={(e) => setNewIssue((p) => ({ ...p, assignedToId: e.target.value }))}
              className="h-10 px-3 rounded-xl bg-[#f8f9ff] border border-[#c6c5d5] text-[13px] text-[#0b1c30] outline-none focus:border-[#4450b7] transition-all font-[Inter,sans-serif]"
            >
              <option value="">— Auto-assign (Project Member) —</option>
              {(project?.projectMembers?.length ? project.projectMembers : allUsers).map((u) => (
                <option key={u.userId} value={u.userId}>{u.username}</option>
              ))}
            </select>
            <p className="text-[11px] text-[#767684] font-[Inter,sans-serif]">Assignee must be a member of this project team.</p>
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

      {/* Edit Project Modal */}
      <Modal open={showEditProject} onClose={() => setShowEditProject(false)} title="Edit Project">
        <form onSubmit={handleUpdateProject} className="p-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-[#454652] uppercase tracking-wider font-[Geist,sans-serif]">Title *</label>
            <input
              type="text" required
              value={editProject.projTitle}
              onChange={(e) => setEditProject((p) => ({ ...p, projTitle: e.target.value }))}
              className="w-full h-10 px-3 rounded-xl bg-[#f8f9ff] border border-[#c6c5d5] text-[13px] text-[#0b1c30] outline-none focus:border-[#4450b7] focus:ring-2 focus:ring-[#4450b7]/15 transition-all font-[Inter,sans-serif]"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-[#454652] uppercase tracking-wider font-[Geist,sans-serif]">Description</label>
            <textarea
              rows={3}
              value={editProject.projDesc}
              onChange={(e) => setEditProject((p) => ({ ...p, projDesc: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl bg-[#f8f9ff] border border-[#c6c5d5] text-[13px] text-[#0b1c30] outline-none focus:border-[#4450b7] focus:ring-2 focus:ring-[#4450b7]/15 transition-all resize-none font-[Inter,sans-serif]"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-[#454652] uppercase tracking-wider font-[Geist,sans-serif]">Members</label>
            <div className="max-h-40 overflow-y-auto border border-[#c6c5d5] rounded-xl bg-[#f8f9ff] divide-y divide-[#e5eeff]">
              {allUsers.map((u) => (
                <label key={u.userId} className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-[#eff4ff] transition-colors">
                  <input
                    type="checkbox"
                    checked={editProject.memberIds.includes(u.userId)}
                    onChange={(e) => setEditProject((p) => ({
                      ...p,
                      memberIds: e.target.checked
                        ? [...p.memberIds, u.userId]
                        : p.memberIds.filter((id) => id !== u.userId),
                    }))}
                    className="rounded accent-[#4450b7]"
                  />
                  <Avatar name={u.username} size="sm" />
                  <span className="text-[13px] text-[#0b1c30] font-[Inter,sans-serif]">{u.username}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowEditProject(false)}
              className="flex-1 h-10 border border-[#c6c5d5] text-[#0b1c30] text-[13px] font-medium rounded-xl hover:bg-[#f8f9ff] transition-colors font-[Geist,sans-serif]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updatingProject}
              className="flex-1 h-10 bg-[#4450b7] hover:bg-[#3540a0] disabled:opacity-60 text-white text-[13px] font-semibold rounded-xl transition-all font-[Geist,sans-serif] shadow-sm"
            >
              {updatingProject ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* App-styled Confirm Modal (Item 3) */}
      <ConfirmModal
        open={confirmState.isOpen}
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        variant={confirmState.isDanger ? 'danger' : 'info'}
        onConfirm={async () => {
          const fn = confirmState.action
          setConfirmState((prev) => ({ ...prev, isOpen: false }))
          if (fn) await fn()
        }}
        onClose={() => setConfirmState((prev) => ({ ...prev, isOpen: false }))}
      />

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
