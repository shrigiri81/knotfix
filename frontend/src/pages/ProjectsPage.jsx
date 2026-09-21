import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FolderKanban, Plus, Search, Trash2, ArrowRight, LogIn } from 'lucide-react'
import Modal from '../components/Modal'
import ConfirmModal from '../components/ConfirmModal'
import AlertModal from '../components/AlertModal'
import ErrorState from '../components/ErrorState'
import Avatar from '../components/Avatar'
import { stripContentWrapper } from '../utils/text'
import { apiCreateProject, apiDeleteProject, apiSearch } from '../api/client'
import { useProjects, useIssues, useUsers } from '../api/queries'
import { useAuth } from '../context/AuthContext'

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function ProjectsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [filter, setFilter] = useState('')
  const [newProject, setNewProject] = useState({ projTitle: '', projDesc: '' })
  const [selectedMembers, setSelectedMembers] = useState([])

  // Modal states (Item 3)
  const [projectToDelete, setProjectToDelete] = useState(null)
  const [deletingProject, setDeletingProject] = useState(false)
  const [alertState, setAlertState] = useState({ open: false, title: '', message: '', type: 'info' })

  // React Query hooks
  const { data: projects = [], isLoading: projectsLoading, error: projError, refetch: refetchProjects } = useProjects()
  const { data: allIssues = [], isLoading: issuesLoading } = useIssues()
  // Users fetched lazily only when New Project modal is opened
  const { data: users = [], isLoading: usersLoading } = useUsers({ enabled: showCreate })

  // Auto-select current user when modal opens and users become available
  useEffect(() => {
    if (showCreate && users.length > 0 && selectedMembers.length === 0) {
      const me = users.find((u) => u.username === user?.username)
      if (me?.userId) {
        setSelectedMembers([me.userId])
      } else if (user?.userId) {
        setSelectedMembers([user.userId])
      }
    }
  }, [showCreate, users, user?.username, user?.userId, selectedMembers.length])

  const loading = projectsLoading || issuesLoading
  const error = projError?.response?.data || projError?.message || ''
  const isAuthError = Boolean(projError?.response && (projError.response.status === 401 || projError.response.status === 403))
  const isServerError = Boolean(
    projError && (
      !projError.response ||
      projError.response.status >= 500 ||
      projError.code === 'ERR_NETWORK' ||
      projError.code === 'ECONNABORTED'
    )
  )

  const showAlert = (rawMessage, title = 'Notice', type = 'error') => {
    let message = rawMessage
    if (rawMessage && typeof rawMessage === 'object') {
      message = rawMessage.message || rawMessage.error || JSON.stringify(rawMessage)
    } else if (rawMessage !== null && rawMessage !== undefined) {
      message = String(rawMessage)
    } else {
      message = 'An unexpected error occurred.'
    }
    setAlertState({ open: true, title, message, type })
  }

  const load = () => {
    refetchProjects()
  }

  const handleCreateProject = async (e) => {
    e.preventDefault()
    if (!newProject.projTitle.trim()) return
    setCreating(true)
    try {
      let memberIds = [...selectedMembers]
      if (memberIds.length === 0) {
        const me = users.find((u) => u.username === user?.username)
        if (me?.userId) {
          memberIds = [me.userId]
        } else if (user?.userId) {
          memberIds = [user.userId]
        } else if (users.length > 0) {
          memberIds = [users[0].userId]
        }
      }

      // Emergency lookup if memberIds is still empty
      if (memberIds.length === 0 && user?.username) {
        try {
          const sRes = await apiSearch(user.username)
          const selfMatch = (sRes.data || []).find((r) => r.type === 'USER' && r.name === user.username)
          if (selfMatch?.id) {
            memberIds = [selfMatch.id]
          }
        } catch {}
      }

      if (memberIds.length === 0) {
        showAlert('Please select at least one team member to create the project.', 'Team Member Required', 'warning')
        setCreating(false)
        return
      }

      const ownerUserId =
        users.find((u) => u.username === user?.username)?.userId ||
        user?.userId ||
        memberIds[0]

      await apiCreateProject(
        {
          projTitle: stripContentWrapper(newProject.projTitle).trim(),
          projDesc: stripContentWrapper(newProject.projDesc).trim(),
          ownerId: { userId: ownerUserId, enabled: true },
        },
        memberIds
      )
      setShowCreate(false)
      setNewProject({ projTitle: '', projDesc: '' })
      setSelectedMembers([])
      await load()
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        (typeof err.response?.data === 'string' ? err.response.data : null) ||
        err.message ||
        'Failed to create project.'
      showAlert(msg, 'Creation Error', 'error')
    } finally {
      setCreating(false)
    }
  }

  const executeDeleteProject = async () => {
    if (!projectToDelete) return
    setDeletingProject(true)
    try {
      await apiDeleteProject(projectToDelete.projId)
      await refetchProjects()
      setProjectToDelete(null)
    } catch (err) {
      showAlert(err.message || err.response?.data || 'Failed to delete project.', 'Delete Error', 'error')
    } finally {
      setDeletingProject(false)
    }
  }

  const filtered = projects.filter((p) =>
    !filter ||
    p.projTitle?.toLowerCase().includes(filter.toLowerCase()) ||
    p.projDesc?.toLowerCase().includes(filter.toLowerCase())
  )

  if (!loading && projError && projects.length === 0) {
    return (
      <div className="p-6 max-w-4xl mx-auto min-h-[70vh] flex items-center justify-center">
        <ErrorState
          variant={isServerError ? 'server-down' : isAuthError ? 'unauthorized' : 'error'}
          title={
            isServerError
              ? 'Backend Server Unreachable'
              : isAuthError
              ? 'Access Restricted'
              : 'Failed to Load Projects'
          }
          message={
            isServerError
              ? 'Unable to connect to the KnotFix API server. The Spring Boot backend might be offline or starting up.'
              : isAuthError
              ? 'Your session might have expired. Please sign in to view projects.'
              : (error || 'An unexpected error occurred while loading projects.')
          }
          error={projError}
          onRetry={load}
          action={
            isAuthError ? (
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="h-9 px-4 bg-[#4450b7] hover:bg-[#3540a0] text-white text-[13px] font-semibold rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all font-[Geist,sans-serif]"
              >
                <LogIn className="w-4 h-4" />
                Sign In
              </button>
            ) : null
          }
        />
      </div>
    )
  }

  return (
    <>
      <div className="p-6 max-w-[1600px] mx-auto">
        {/* Page Header */}
        <section className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#4450b7]" />
                <h1 className="text-[22px] font-semibold text-[#0b1c30] tracking-tight font-[Geist,sans-serif]">Projects</h1>
                <span className="px-2 py-0.5 rounded-full bg-[#dce9ff] text-[#4450b7] text-[11px] font-semibold font-mono">
                  {projects.length} Total
                </span>
              </div>
              <p className="text-[13px] text-[#565e74] mt-1 font-[Inter,sans-serif]">
                Browse and manage all workspace projects you have access to.
              </p>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="h-9 px-4 bg-[#4450b7] hover:bg-[#3540a0] text-white text-[12px] font-semibold rounded-lg flex items-center gap-1.5 shadow-xs transition-all active:scale-[0.99] font-[Geist,sans-serif] self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              New Project
            </button>
          </div>

          {/* Filter & Stats bar */}
          <div className="flex items-center justify-between gap-3 bg-white border border-[#e5eeff] rounded-xl p-3 shadow-xs">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-[#767684] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search projects by name or description..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full h-8 pl-8 pr-3 rounded-lg bg-[#f8f9ff] text-[#0b1c30] text-[12px] placeholder:text-[#767684] border border-[#c6c5d5]/60 outline-none focus:border-[#4450b7] transition-colors font-[Inter,sans-serif]"
              />
            </div>
            <span className="text-[12px] text-[#565e74] font-[Inter,sans-serif]">
              Showing <strong className="text-[#0b1c30] font-semibold">{filtered.length}</strong> of {projects.length} projects
            </span>
          </div>
        </section>

        {/* Loading skeleton */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-[#e5eeff] p-5 h-52 animate-pulse flex flex-col justify-between">
                <div>
                  <div className="flex gap-3 mb-3">
                    <div className="w-9 h-9 rounded-lg bg-[#e5eeff]" />
                    <div className="flex-1">
                      <div className="h-3.5 bg-[#e5eeff] rounded w-2/3 mb-2" />
                      <div className="h-2.5 bg-[#e5eeff] rounded w-1/3" />
                    </div>
                  </div>
                  <div className="h-2.5 bg-[#e5eeff] rounded w-full mb-2" />
                  <div className="h-2.5 bg-[#e5eeff] rounded w-4/5" />
                </div>
                <div className="h-3 bg-[#e5eeff] rounded w-1/2" />
              </div>
            ))}
          </div>
        )}

        {/* Projects grid */}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((project) => {
              const issues = (project.issues && project.issues.length > 0)
                ? project.issues
                : allIssues.filter((i) => i.project?.projId === project.projId)
              const issueCount = issues.length
              const openCount = issues.filter((i) => {
                const s = i.status?.toUpperCase()
                return s === 'OPEN' || s === 'IN_PROGRESS' || s === 'BLOCKED'
              }).length
              const closedCount = issueCount - openCount
              const members = project.projectMembers ?? []
              const ownerName = project.ownerId?.username ?? '—'
              const progress = issueCount > 0 ? Math.round((closedCount / issueCount) * 100) : 0

              return (
                <div
                  key={project.projId}
                  onClick={() => navigate(`/projects/${project.projId}`)}
                  className="bg-white rounded-xl p-4.5 border border-[#e5eeff] hover:border-[#4450b7]/40 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                  style={{ boxShadow: '0 1px 4px rgba(11,28,48,0.04)' }}
                >
                  <div className="flex flex-col gap-3">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-[#dce9ff] text-[#4450b7] flex items-center justify-center shrink-0">
                            <FolderKanban className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <h2 className="text-[14px] font-semibold text-[#0b1c30] truncate font-[Geist,sans-serif] group-hover:text-[#4450b7] transition-colors">
                              {stripContentWrapper(project.projTitle)}
                            </h2>
                            <div className="flex items-center gap-1.5 text-[11px] text-[#565e74] mt-0.5 font-[Inter,sans-serif]">
                              <Avatar name={ownerName} size="xs" />
                              <span>{ownerName}</span>
                              <span>·</span>
                              <span>{formatDate(project.updatedAt || project.createdAt)}</span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setProjectToDelete(project)
                          }}
                          className="w-7 h-7 rounded-lg text-[#767684] hover:text-[#ba1a1a] hover:bg-[#ffdad6] flex items-center justify-center transition-all"
                          title="Delete project"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {project.projDesc ? (
                        <p className="text-[12px] text-[#565e74] mt-2.5 line-clamp-2 leading-relaxed font-[Inter,sans-serif]">
                          {stripContentWrapper(project.projDesc)}
                        </p>
                      ) : (
                        <p className="text-[12px] text-[#767684] italic mt-2.5 font-[Inter,sans-serif]">
                          No description provided.
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[11px] py-1.5 px-2.5 rounded-lg bg-[#eff4ff]/60 border border-[#e5eeff]">
                      <div className="flex items-center gap-2 text-[#565e74] font-[Inter,sans-serif]">
                        <span><strong className="text-[#0b1c30] font-semibold">{openCount}</strong> active</span>
                        <span>·</span>
                        <span><strong className="text-[#0b1c30] font-semibold">{closedCount}</strong> closed</span>
                      </div>
                      <span className="font-mono text-[#0b1c30] font-semibold">{progress}%</span>
                    </div>

                    <div className="w-full bg-[#dce9ff] rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-[#4450b7] h-full rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#e5eeff] flex items-center justify-between">
                    <div className="flex items-center -space-x-1.5">
                      {members.slice(0, 4).map((m, i) => (
                        <Avatar key={m.userId ?? i} name={m.username} size="sm" className="ring-2 ring-white" />
                      ))}
                      {members.length > 4 && (
                        <div className="w-6 h-6 rounded-full bg-[#dce9ff] text-[#4450b7] flex items-center justify-center text-[9px] font-bold ring-2 ring-white">
                          +{members.length - 4}
                        </div>
                      )}
                    </div>
                    <span className="text-[12px] text-[#4450b7] font-semibold group-hover:translate-x-0.5 transition-transform flex items-center gap-1 font-[Geist,sans-serif]">
                      Open Project
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              )
            })}

            {/* Create new card */}
            <div
              onClick={() => setShowCreate(true)}
              className="border-2 border-dashed border-[#c6c5d5]/60 hover:border-[#4450b7] bg-white/50 hover:bg-[#eff4ff]/40 rounded-xl p-5 transition-all flex flex-col items-center justify-center text-center cursor-pointer group min-h-[220px]"
            >
              <div className="w-10 h-10 rounded-full bg-[#dce9ff] group-hover:bg-[#4450b7] text-[#4450b7] group-hover:text-white flex items-center justify-center transition-all mb-2.5 shadow-xs">
                <Plus className="w-5 h-5" />
              </div>
              <h3 className="text-[14px] font-semibold text-[#0b1c30] font-[Geist,sans-serif]">New Project</h3>
              <p className="text-[12px] text-[#565e74] max-w-[200px] mt-1 font-[Inter,sans-serif]">
                Create a new project workspace for your team.
              </p>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && !error && (
          <div className="text-center py-20 bg-white rounded-2xl border border-[#e5eeff] mt-4">
            <FolderKanban className="w-12 h-12 text-[#c6c5d5] mx-auto" />
            <p className="mt-3 text-[16px] font-semibold text-[#0b1c30] font-[Geist,sans-serif]">
              {filter ? 'No matching projects found' : 'No projects yet'}
            </p>
            <p className="text-[13px] text-[#565e74] mt-1 max-w-sm mx-auto font-[Inter,sans-serif]">
              {filter ? `No projects matched "${filter}". Try clearing your search.` : 'Get started by creating your first project workspace.'}
            </p>
            {filter ? (
              <button
                onClick={() => setFilter('')}
                className="mt-4 h-8 px-4 border border-[#c6c5d5] text-[#0b1c30] text-[12px] font-medium rounded-lg hover:bg-[#f8f9ff] transition-colors font-[Geist,sans-serif]"
              >
                Clear Filter
              </button>
            ) : (
              <button
                onClick={() => setShowCreate(true)}
                className="mt-4 h-9 px-5 bg-[#4450b7] text-white text-[13px] font-semibold rounded-lg hover:bg-[#3540a0] transition-colors font-[Geist,sans-serif]"
              >
                Create Project
              </button>
            )}
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Project">
        <form onSubmit={handleCreateProject} className="p-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-[#454652] uppercase tracking-wider font-[Geist,sans-serif]">
              Project Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Website Redesign"
              value={newProject.projTitle}
              onChange={(e) => setNewProject((p) => ({ ...p, projTitle: e.target.value }))}
              className="w-full h-9 px-3 rounded-lg bg-[#f8f9ff] border border-[#c6c5d5] text-[13px] text-[#0b1c30] outline-none focus:border-[#4450b7] focus:ring-2 focus:ring-[#4450b7]/20 transition-all font-[Inter,sans-serif]"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-[#454652] uppercase tracking-wider font-[Geist,sans-serif]">
              Description
            </label>
            <textarea
              placeholder="Describe the project goals and scope..."
              rows={3}
              value={newProject.projDesc}
              onChange={(e) => setNewProject((p) => ({ ...p, projDesc: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg bg-[#f8f9ff] border border-[#c6c5d5] text-[13px] text-[#0b1c30] outline-none focus:border-[#4450b7] focus:ring-2 focus:ring-[#4450b7]/20 transition-all resize-none font-[Inter,sans-serif]"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-[#454652] uppercase tracking-wider font-[Geist,sans-serif]">
                Team Members *
              </label>
              <span className="text-[11px] text-[#4450b7] font-medium font-[Geist,sans-serif]">
                {selectedMembers.length} selected
              </span>
            </div>
            <div className="max-h-48 overflow-y-auto border border-[#c6c5d5] rounded-lg bg-[#f8f9ff] divide-y divide-[#e5eeff]">
              {usersLoading ? (
                <div className="p-4 text-center text-[12px] text-[#767684] font-[Inter,sans-serif]">
                  Loading team members...
                </div>
              ) : users.length === 0 ? (
                <div className="p-4 text-center text-[12px] text-[#767684] font-[Inter,sans-serif]">
                  No team members found.
                </div>
              ) : (
                users.map((u) => {
                  const isSelf = u.username === user?.username
                  return (
                    <label
                      key={u.userId}
                      className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-[#eff4ff] transition-colors"
                    >
                      <input
                        type="checkbox"
                        value={u.userId}
                        checked={selectedMembers.includes(u.userId)}
                        onChange={(e) =>
                          setSelectedMembers((prev) =>
                            e.target.checked
                              ? [...prev, u.userId]
                              : prev.filter((id) => id !== u.userId)
                          )
                        }
                        className="rounded accent-[#4450b7]"
                      />
                      <Avatar name={u.username} size="sm" />
                      <div className="flex flex-col min-w-0">
                        <span className="text-[13px] text-[#0b1c30] font-[Inter,sans-serif] flex items-center gap-1.5">
                          {u.username}
                          {isSelf && (
                            <span className="text-[10px] bg-[#eff4ff] text-[#4450b7] font-bold px-1.5 py-0.5 rounded border border-[#dce9ff]">
                              You
                            </span>
                          )}
                        </span>
                        {u.email && (
                          <span className="text-[11px] text-[#767684] truncate">
                            {u.email}
                          </span>
                        )}
                      </div>
                    </label>
                  )
                })
              )}
            </div>
            <p className="text-[11px] text-[#767684] font-[Inter,sans-serif]">
              You will be automatically added as a team member if no one else is selected.
            </p>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="flex-1 h-9 border border-[#c6c5d5] text-[#0b1c30] text-[13px] font-medium rounded-lg hover:bg-[#f8f9ff] transition-colors font-[Geist,sans-serif]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="flex-1 h-9 bg-[#4450b7] hover:bg-[#3540a0] disabled:opacity-60 text-white text-[13px] font-semibold rounded-lg transition-all font-[Geist,sans-serif]"
            >
              {creating ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Project Confirmation Modal (Item 3) */}
      <ConfirmModal
        open={!!projectToDelete}
        onClose={() => setProjectToDelete(null)}
        onConfirm={executeDeleteProject}
        title="Delete Project?"
        message={`Are you sure you want to delete "${projectToDelete?.projTitle}"? This cannot be undone.`}
        confirmText="Yes, Delete Project"
        variant="danger"
        loading={deletingProject}
      />

      {/* App Alert Modal (Item 3) */}
      <AlertModal
        open={alertState.open}
        onClose={() => setAlertState((prev) => ({ ...prev, open: false }))}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
      />
    </>
  )
}
