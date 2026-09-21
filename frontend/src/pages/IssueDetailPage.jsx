import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  Edit3,
  Trash2,
  CornerDownRight,
  MessageSquare,
  ArrowLeft,
  FolderKanban,
  Send,
  AlertCircle,
  Home,
} from 'lucide-react'
import StatusBadge from '../components/StatusBadge'
import PriorityBadge from '../components/PriorityBadge'
import Avatar from '../components/Avatar'
import ConfirmModal from '../components/ConfirmModal'
import AlertModal from '../components/AlertModal'
import ErrorState from '../components/ErrorState'
import { stripContentWrapper } from '../utils/text'
import {
  apiUpdateIssue,
  apiDeleteIssue,
  apiAddComment,
  apiUpdateComment,
  apiDeleteComment,
} from '../api/client'
import { useIssue, useComments, useUsers, useProject } from '../api/queries'
import { useAuth } from '../context/AuthContext'

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDateShort(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function IssueDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  // Issue editing state
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)

  // Comments state
  const [commentText, setCommentText] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [editingCommentId, setEditingCommentId] = useState(null)
  const [editingCommentText, setEditingCommentText] = useState('')

  // Reply state (Item 1)
  const [replyingToId, setReplyingToId] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [submittingReply, setSubmittingReply] = useState(false)

  // Modals state (Item 3: replace native alert/confirm)
  const [showDeleteIssueModal, setShowDeleteIssueModal] = useState(false)
  const [deletingIssue, setDeletingIssue] = useState(false)
  const [commentToDelete, setCommentToDelete] = useState(null)
  const [deletingComment, setDeletingComment] = useState(false)
  const [alertState, setAlertState] = useState({ open: false, title: '', message: '', type: 'info' })

  const commentInputRef = useRef(null)

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

  // React Query hooks
  const { data: issue, isLoading: issueLoading, error: issueError, refetch: refetchIssue } = useIssue(id)
  const { data: comments = [], isLoading: commentsLoading, refetch: refetchComments } = useComments(id)
  // Fetch users only when editing drawer is active
  const { data: allUsers = [] } = useUsers({ enabled: editing })
  // Fetch project details to know valid project members for assignee
  const { data: projectDetails } = useProject(issue?.project?.projId, { enabled: !!issue?.project?.projId })

  const assignableUsers = useMemo(() => {
    if (projectDetails?.projectMembers && projectDetails.projectMembers.length > 0) {
      return projectDetails.projectMembers
    }
    return allUsers
  }, [projectDetails?.projectMembers, allUsers])

  const loading = issueLoading || commentsLoading
  const error = issueError?.response?.data || issueError?.message || ''

  // Sync edit form when issue loads
  useEffect(() => {
    if (issue) {
      setEditForm({
        issueTitle: stripContentWrapper(issue.issueTitle ?? ''),
        issueDesc: stripContentWrapper(issue.issueDesc ?? ''),
        status: issue.status ?? 'OPEN',
        priority: issue.priority ?? 'MEDIUM',
        assignedToId: issue.assignedTo?.userId ?? '',
      })
    }
  }, [issue])

  // Handle 404
  useEffect(() => {
    if (issueError?.response?.status === 404) {
      navigate('/')
    }
  }, [issueError, navigate])

  const load = () => {
    refetchIssue()
    refetchComments()
  }

  // Permissions checks
  const isIssueCreator = useMemo(() => {
    return !!(user?.username && issue?.createdBy?.username === user.username)
  }, [user?.username, issue?.createdBy?.username])

  // Save edited issue (Item 4 & 11)
  const handleSave = async () => {
    const assignedUserId = editForm.assignedToId
      ? parseInt(editForm.assignedToId)
      : allUsers.find((u) => u.username === user?.username)?.userId ?? issue?.assignedTo?.userId ?? null

    if (!assignedUserId) {
      showAlert('Please select an assignee. The system requires one.', 'Assignee Required')
      return
    }

    setSaving(true)
    try {
      const payload = {
        issueId: parseInt(id),
        issueTitle: stripContentWrapper(editForm.issueTitle).trim(),
        issueDesc: stripContentWrapper(editForm.issueDesc).trim(),
        status: editForm.status,
        priority: editForm.priority,
        project: issue?.project?.projId ? { projId: issue.project.projId } : undefined,
        assignedTo: { userId: assignedUserId, enabled: true },
        createdBy: issue?.createdBy?.userId ? { userId: issue.createdBy.userId, enabled: true } : undefined,
      }
      await apiUpdateIssue(id, payload)
      setEditing(false)
      await load()
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        (typeof err.response?.data === 'string' ? err.response.data : null) ||
        err.message ||
        'Failed to update issue.'
      showAlert(msg, 'Update Failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  // Delete issue (Item 3 & 4)
  const executeDeleteIssue = async () => {
    setDeletingIssue(true)
    try {
      await apiDeleteIssue(id)
      setShowDeleteIssueModal(false)
      const projId = issue?.project?.projId
      navigate(projId ? `/projects/${projId}` : '/')
    } catch (err) {
      showAlert(err.response?.data || err.message || 'Failed to delete issue.', 'Delete Failed')
    } finally {
      setDeletingIssue(false)
    }
  }

  // Add top-level comment
  const handleAddComment = async (e) => {
    e.preventDefault()
    const text = stripContentWrapper(commentText.trim())
    if (!text) return
    setSubmittingComment(true)
    try {
      await apiAddComment(id, text)
      setCommentText('')
      await refetchComments()
    } catch (err) {
      showAlert(err.response?.data || err.message || 'Failed to add comment.', 'Comment Failed')
    } finally {
      setSubmittingComment(false)
    }
  }

  // Add reply to comment (Item 1)
  const handleSendReply = async (parentCommentId) => {
    const text = stripContentWrapper(replyText.trim())
    if (!text) return
    setSubmittingReply(true)
    try {
      await apiAddComment(id, text, parentCommentId)
      setReplyText('')
      setReplyingToId(null)
      await refetchComments()
    } catch (err) {
      showAlert(err.response?.data || err.message || 'Failed to post reply.', 'Reply Failed')
    } finally {
      setSubmittingReply(false)
    }
  }

  // Edit comment (Item 2 & 11)
  const handleEditComment = async (commentId) => {
    const text = stripContentWrapper(editingCommentText.trim())
    if (!text) return
    try {
      await apiUpdateComment(id, commentId, text)
      setEditingCommentId(null)
      setEditingCommentText('')
      await refetchComments()
    } catch (err) {
      showAlert(err.response?.data || err.message || 'Failed to update comment.', 'Update Failed')
    }
  }

  // Delete comment (Item 2 & 3)
  const executeDeleteComment = async () => {
    if (!commentToDelete) return
    setDeletingComment(true)
    try {
      await apiDeleteComment(id, commentToDelete.commentId)
      await refetchComments()
      setCommentToDelete(null)
    } catch (err) {
      showAlert(err.response?.data || err.message || 'Failed to delete comment.', 'Delete Failed')
    } finally {
      setDeletingComment(false)
    }
  }

  // Organize comments into threaded structure (Item 1)
  const { rootComments, repliesByParent } = useMemo(() => {
    const roots = []
    const repliesMap = new Map()

    comments.forEach((c) => {
      const parentId = c.repliedTo?.commentId
      if (parentId) {
        if (!repliesMap.has(parentId)) repliesMap.set(parentId, [])
        repliesMap.get(parentId).push(c)
      } else {
        roots.push(c)
      }
    })

    return { rootComments: roots, repliesByParent: repliesMap }
  }, [comments])

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#4450b7] border-t-transparent animate-spin" />
          <p className="text-[13px] text-[#565e74] font-[Inter,sans-serif]">Loading issue details...</p>
        </div>
      </div>
    )
  }

  if (!loading && (!issue || issueError)) {
    const isServerDown = Boolean(
      issueError && (
        !issueError.response ||
        issueError.response.status >= 500 ||
        issueError.code === 'ERR_NETWORK' ||
        issueError.code === 'ECONNABORTED'
      )
    )
    const isNotFound = issueError?.response?.status === 404 || (!issue && !issueError && !isServerDown)

    return (
      <div className="p-6 max-w-4xl mx-auto min-h-[60vh] flex items-center justify-center">
        <ErrorState
          variant={isNotFound ? 'not-found' : isServerDown ? 'server-down' : 'error'}
          title={isNotFound ? 'Issue Not Found' : isServerDown ? 'Server Unreachable' : 'Failed to Load Issue'}
          message={
            isNotFound
              ? `Issue #${id} does not exist, has been deleted, or you don't have permission to view it.`
              : isServerDown
              ? 'Cannot connect to the Pulse backend server. The Spring Boot application might be offline or restarting.'
              : (error || 'An unexpected error occurred while loading this issue.')
          }
          error={issueError}
          onRetry={() => {
            refetchIssue()
            refetchComments()
          }}
          action={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="h-9 px-3.5 bg-[#eff4ff] hover:bg-[#e5eeff] text-[#0b1c30] text-[13px] font-medium rounded-xl flex items-center justify-center gap-1.5 border border-[#c6c5d5]/60 transition-all font-[Geist,sans-serif]"
              >
                <ArrowLeft className="w-4 h-4" />
                Go Back
              </button>
              <button
                type="button"
                onClick={() => navigate('/projects')}
                className="h-9 px-3.5 bg-white hover:bg-slate-50 text-[#565e74] hover:text-[#0b1c30] text-[13px] font-medium rounded-xl flex items-center justify-center gap-1.5 border border-[#c6c5d5]/60 transition-all font-[Geist,sans-serif]"
              >
                <FolderKanban className="w-4 h-4" />
                All Projects
              </button>
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="h-9 px-3.5 bg-white hover:bg-slate-50 text-[#565e74] hover:text-[#0b1c30] text-[13px] font-medium rounded-xl flex items-center justify-center gap-1.5 border border-[#c6c5d5]/60 transition-all font-[Geist,sans-serif]"
              >
                <Home className="w-4 h-4" />
                Dashboard
              </button>
            </div>
          }
        />
      </div>
    )
  }

  const project = issue?.project

  // Render a single comment card
  const renderComment = (comment, isReply = false) => {
    const isCommentAuthor = user?.username && comment.commentAuthor?.username === user.username
    const cleanedText = stripContentWrapper(comment.commentData)
    const isEditingThis = editingCommentId === comment.commentId
    const isReplyingThis = replyingToId === comment.commentId
    const childReplies = repliesByParent.get(comment.commentId) || []

    return (
      <div key={comment.commentId} className={`flex flex-col ${isReply ? 'mt-3 pl-3 sm:pl-4 border-l-2 border-[#dce9ff]' : ''}`}>
        <div className="flex gap-3">
          <Avatar name={comment.commentAuthor?.username} size={isReply ? 'sm' : 'md'} className="shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-[13px] font-semibold text-[#0b1c30] font-[Geist,sans-serif]">
                {comment.commentAuthor?.username ?? 'Unknown'}
              </span>
              {comment.repliedTo && (
                <span className="inline-flex items-center gap-1 text-[11px] text-[#565e74] bg-[#eff4ff] px-1.5 py-0.2 rounded font-[Inter,sans-serif]">
                  <CornerDownRight className="w-3 h-3 text-[#4450b7]" />
                  <span>replying to @{comment.repliedTo.commentAuthor?.username || 'user'}</span>
                </span>
              )}
              <span className="text-[11px] text-[#767684] font-[Inter,sans-serif]">
                {formatDate(comment.createdAt)}
              </span>
              {comment.modifiedAt !== comment.createdAt && (
                <span className="text-[10px] text-[#767684] italic font-[Inter,sans-serif]">(edited)</span>
              )}
            </div>

            {/* Comment Body or Edit box */}
            {isEditingThis ? (
              <div className="flex flex-col gap-2 mt-1.5">
                <textarea
                  rows={3}
                  value={editingCommentText}
                  onChange={(e) => setEditingCommentText(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#f8f9ff] border border-[#c6c5d5] text-[13px] text-[#0b1c30] outline-none focus:border-[#4450b7] transition-all resize-none font-[Inter,sans-serif]"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCommentId(null)
                      setEditingCommentText('')
                    }}
                    className="h-7 px-3 text-[11px] text-[#565e74] bg-[#eff4ff] rounded-lg border border-[#e5eeff] hover:bg-[#e5eeff] transition-colors font-[Geist,sans-serif]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEditComment(comment.commentId)}
                    className="h-7 px-3 text-[11px] text-white bg-[#4450b7] hover:bg-[#3540a0] rounded-lg transition-colors font-[Geist,sans-serif]"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            ) : (
              <div className="group relative">
                <div className="bg-[#f8f9ff] rounded-xl px-3.5 py-2.5 border border-[#e5eeff] text-[13px] text-[#0b1c30] leading-relaxed font-[Inter,sans-serif] whitespace-pre-wrap">
                  {cleanedText}
                </div>

                {/* Comment Actions: Reply (Item 1), Edit/Delete if Author (Item 2) */}
                <div className="flex items-center gap-2 mt-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setReplyingToId(isReplyingThis ? null : comment.commentId)
                      setReplyText('')
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-[#565e74] hover:text-[#4450b7] transition-colors font-[Geist,sans-serif]"
                  >
                    <CornerDownRight className="w-3 h-3" />
                    <span>Reply</span>
                  </button>

                  {/* Only comment author can edit/delete (Item 2) */}
                  {isCommentAuthor && (
                    <>
                      <span className="text-[#c6c5d5] text-[10px]">·</span>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCommentId(comment.commentId)
                          setEditingCommentText(cleanedText)
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-[#565e74] hover:text-[#0b1c30] transition-colors font-[Geist,sans-serif]"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>

                      <span className="text-[#c6c5d5] text-[10px]">·</span>
                      <button
                        type="button"
                        onClick={() => setCommentToDelete(comment)}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-[#565e74] hover:text-rose-600 transition-colors font-[Geist,sans-serif]"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Delete</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Inline Reply Form (Item 1) */}
            {isReplyingThis && (
              <div className="mt-3 p-3 rounded-xl bg-[#eff4ff]/70 border border-[#dce9ff] flex flex-col gap-2">
                <div className="flex items-center justify-between text-[11px] text-[#4450b7] font-medium font-[Geist,sans-serif]">
                  <span className="flex items-center gap-1">
                    <CornerDownRight className="w-3.5 h-3.5" />
                    Replying to @{comment.commentAuthor?.username || 'user'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setReplyingToId(null)
                      setReplyText('')
                    }}
                    className="text-[#767684] hover:text-[#0b1c30]"
                  >
                    Cancel
                  </button>
                </div>
                <textarea
                  rows={2}
                  autoFocus
                  placeholder={`Write a reply to @${comment.commentAuthor?.username || 'user'}...`}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-[#c6c5d5] text-[13px] text-[#0b1c30] outline-none focus:border-[#4450b7] transition-all resize-none font-[Inter,sans-serif]"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    disabled={submittingReply || !replyText.trim()}
                    onClick={() => handleSendReply(comment.commentId)}
                    className="h-7 px-3.5 bg-[#4450b7] hover:bg-[#3540a0] disabled:opacity-50 text-white text-[11px] font-semibold rounded-lg flex items-center gap-1 transition-colors font-[Geist,sans-serif]"
                  >
                    <Send className="w-3 h-3" />
                    {submittingReply ? 'Replying...' : 'Post Reply'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Nested Child Replies (Item 1) */}
        {childReplies.length > 0 && (
          <div className="flex flex-col gap-2.5 mt-2">
            {childReplies.map((reply) => renderComment(reply, true))}
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      <div className="p-6 max-w-[1400px] mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-[12px] text-[#565e74] mb-4 font-[Inter,sans-serif]">
          <Link to="/" className="hover:text-[#0b1c30] flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" />
            Dashboard
          </Link>
          <span className="text-[#c6c5d5]">/</span>
          {project && (
            <>
              <Link to={`/projects/${project.projId}`} className="hover:text-[#0b1c30] flex items-center gap-1">
                <FolderKanban className="w-3.5 h-3.5 text-[#565e74]" />
                {project.projTitle}
              </Link>
              <span className="text-[#c6c5d5]">/</span>
            </>
          )}
          <span className="text-[#0b1c30] font-semibold">#{id}</span>
        </div>

        {error && (
          <div className="mb-4 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-[13px] text-rose-700 flex items-center gap-2 font-[Inter,sans-serif]">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex flex-col xl:flex-row gap-5 items-start">
          {/* Main content */}
          <div className="flex-1 min-w-0 flex flex-col gap-5 w-full">
            {/* Issue Header / Edit Card */}
            <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#e5eeff] shadow-xs">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-[11px] text-[#767684] bg-[#eff4ff] px-2 py-0.5 rounded-md border border-[#e5eeff] font-medium">
                    #{id}
                  </span>
                  <StatusBadge status={issue?.status} />
                  <PriorityBadge priority={issue?.priority} />
                </div>

                {/* Only issue creator can edit or delete (Item 4) */}
                {isIssueCreator && (
                  <div className="flex items-center gap-1.5">
                    {!editing ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setEditing(true)}
                          className="h-7.5 px-3 flex items-center gap-1.5 text-[12px] font-medium text-[#454652] hover:text-[#0b1c30] bg-white hover:bg-[#eff4ff] rounded-lg border border-[#c6c5d5]/70 transition-colors font-[Geist,sans-serif]"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowDeleteIssueModal(true)}
                          className="h-7.5 px-3 flex items-center gap-1.5 text-[12px] font-medium text-rose-600 bg-white hover:bg-rose-50 rounded-lg border border-rose-200 transition-colors font-[Geist,sans-serif]"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setEditing(false)}
                          className="h-7.5 px-3 text-[12px] font-medium text-[#565e74] bg-[#eff4ff] hover:bg-[#e5eeff] rounded-lg border border-[#e5eeff] transition-colors font-[Geist,sans-serif]"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleSave}
                          disabled={saving}
                          className="h-7.5 px-3.5 text-[12px] font-semibold text-white bg-[#4450b7] hover:bg-[#3540a0] disabled:opacity-60 rounded-lg transition-colors font-[Geist,sans-serif]"
                        >
                          {saving ? 'Saving...' : 'Save'}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {editing ? (
                <div className="flex flex-col gap-3.5">
                  <input
                    type="text"
                    value={editForm.issueTitle}
                    onChange={(e) => setEditForm((f) => ({ ...f, issueTitle: e.target.value }))}
                    className="w-full h-9.5 px-3 rounded-lg bg-[#f8f9ff] border border-[#c6c5d5] text-[15px] font-semibold text-[#0b1c30] outline-none focus:border-[#4450b7] transition-all font-[Geist,sans-serif]"
                  />
                  <textarea
                    rows={4}
                    value={editForm.issueDesc}
                    onChange={(e) => setEditForm((f) => ({ ...f, issueDesc: e.target.value }))}
                    placeholder="Issue description..."
                    className="w-full px-3 py-2 rounded-lg bg-[#f8f9ff] border border-[#c6c5d5] text-[13px] text-[#0b1c30] outline-none focus:border-[#4450b7] transition-all resize-none font-[Inter,sans-serif]"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-[#454652] uppercase tracking-wider block mb-1 font-[Geist,sans-serif]">
                        Status
                      </label>
                      <select
                        value={editForm.status}
                        onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}
                        className="w-full h-8.5 px-2 rounded-lg bg-[#f8f9ff] border border-[#c6c5d5] text-[12px] outline-none focus:border-[#4450b7] transition-all font-[Inter,sans-serif]"
                      >
                        {['OPEN', 'IN_PROGRESS', 'BLOCKED', 'RESOLVED', 'CLOSED'].map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-[#454652] uppercase tracking-wider block mb-1 font-[Geist,sans-serif]">
                        Priority
                      </label>
                      <select
                        value={editForm.priority}
                        onChange={(e) => setEditForm((f) => ({ ...f, priority: e.target.value }))}
                        className="w-full h-8.5 px-2 rounded-lg bg-[#f8f9ff] border border-[#c6c5d5] text-[12px] outline-none focus:border-[#4450b7] transition-all font-[Inter,sans-serif]"
                      >
                        {['URGENT', 'HIGH', 'MEDIUM', 'LOW'].map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-[#454652] uppercase tracking-wider block mb-1 font-[Geist,sans-serif]">
                        Assignee
                      </label>
                      <select
                        value={editForm.assignedToId}
                        onChange={(e) => setEditForm((f) => ({ ...f, assignedToId: e.target.value }))}
                        className="w-full h-8.5 px-2 rounded-lg bg-[#f8f9ff] border border-[#c6c5d5] text-[12px] outline-none focus:border-[#4450b7] transition-all font-[Inter,sans-serif]"
                      >
                        <option value="">— Select Assignee —</option>
                        {assignableUsers.map((u) => (
                          <option key={u.userId} value={u.userId}>
                            {u.username}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <h1 className="text-[22px] font-semibold text-[#0b1c30] tracking-tight font-[Geist,sans-serif] mb-2.5">
                    {stripContentWrapper(issue?.issueTitle)}
                  </h1>
                  {issue?.issueDesc ? (
                    <p className="text-[13px] text-[#454652] leading-relaxed font-[Inter,sans-serif] whitespace-pre-wrap">
                      {stripContentWrapper(issue.issueDesc)}
                    </p>
                  ) : (
                    <p className="text-[13px] text-[#767684] italic font-[Inter,sans-serif]">
                      No description provided.
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Discussion / Comments Section */}
            <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#e5eeff] shadow-xs">
              <h2 className="text-[15px] font-semibold text-[#0b1c30] mb-5 flex items-center gap-2 font-[Geist,sans-serif]">
                <MessageSquare className="w-4 h-4 text-[#4450b7]" />
                Discussion
                <span className="px-2 py-0.2 rounded-full bg-[#eff4ff] text-[#4450b7] text-[11px] font-mono font-medium">
                  {comments.length}
                </span>
              </h2>

              {/* Comments Thread */}
              <div className="flex flex-col gap-4 mb-6">
                {rootComments.length === 0 && (
                  <div className="text-center py-10 border border-dashed border-[#e5eeff] rounded-xl">
                    <MessageSquare className="w-8 h-8 text-[#c6c5d5] mx-auto mb-2" />
                    <p className="text-[13px] text-[#565e74] font-[Inter,sans-serif]">
                      No comments yet. Start the discussion below!
                    </p>
                  </div>
                )}
                {rootComments.map((comment) => renderComment(comment, false))}
              </div>

              {/* Main New Comment Composer */}
              <form onSubmit={handleAddComment} className="flex gap-3 items-start border-t border-[#e5eeff] pt-5">
                <Avatar name={user?.username} size="md" className="shrink-0 mt-0.5" />
                <div className="flex-1 flex flex-col gap-2">
                  <textarea
                    ref={commentInputRef}
                    rows={3}
                    placeholder="Leave a comment... (Ctrl+Enter to submit)"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleAddComment(e)
                    }}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#f8f9ff] border border-[#c6c5d5] text-[13px] text-[#0b1c30] placeholder:text-[#767684] outline-none focus:border-[#4450b7] focus:ring-2 focus:ring-[#4450b7]/20 transition-all resize-none font-[Inter,sans-serif]"
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[#767684] font-[Inter,sans-serif]">
                      <kbd className="font-mono bg-[#eff4ff] px-1.5 py-0.5 rounded text-[10px] border border-[#e5eeff]">
                        Ctrl+Enter
                      </kbd>{' '}
                      to submit
                    </span>
                    <button
                      type="submit"
                      disabled={submittingComment || !commentText.trim()}
                      className="h-8.5 px-4 bg-[#4450b7] hover:bg-[#3540a0] disabled:opacity-50 text-white text-[12px] font-semibold rounded-lg transition-all font-[Geist,sans-serif] flex items-center gap-1.5 shadow-xs"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {submittingComment ? 'Posting...' : 'Comment'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>

          {/* Right Inspector Sidebar */}
          <aside className="w-full xl:w-[290px] shrink-0 flex flex-col gap-4">
            <div className="bg-white rounded-2xl p-5 border border-[#e5eeff] shadow-xs">
              <h3 className="text-[13px] font-semibold text-[#0b1c30] mb-3 pb-2.5 border-b border-[#e5eeff] font-[Geist,sans-serif]">
                Issue Details
              </h3>
              <div className="flex flex-col divide-y divide-[#f1f5ff]">
                {[
                  { label: 'STATUS', value: <StatusBadge status={issue?.status} /> },
                  { label: 'PRIORITY', value: <PriorityBadge priority={issue?.priority} /> },
                  {
                    label: 'ASSIGNEE',
                    value: issue?.assignedTo ? (
                      <div className="flex items-center gap-1.5">
                        <Avatar name={issue.assignedTo.username} size="xs" />
                        <span className="text-[12px] text-[#0b1c30] font-medium font-[Inter,sans-serif]">
                          {issue.assignedTo.username}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[12px] text-[#767684] italic font-[Inter,sans-serif]">Unassigned</span>
                    ),
                  },
                  {
                    label: 'CREATED BY',
                    value: issue?.createdBy ? (
                      <div className="flex items-center gap-1.5">
                        <Avatar name={issue.createdBy.username} size="xs" />
                        <span className="text-[12px] text-[#0b1c30] font-medium font-[Inter,sans-serif]">
                          {issue.createdBy.username}
                          {isIssueCreator && <span className="ml-1 text-[10px] text-[#4450b7] font-semibold">(You)</span>}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[12px] text-[#767684] italic font-[Inter,sans-serif]">—</span>
                    ),
                  },
                  {
                    label: 'PROJECT',
                    value: project ? (
                      <Link
                        to={`/projects/${project.projId}`}
                        className="text-[12px] text-[#4450b7] hover:underline font-medium font-[Inter,sans-serif] flex items-center gap-1"
                      >
                        <FolderKanban className="w-3.5 h-3.5" />
                        {project.projTitle}
                      </Link>
                    ) : (
                      '—'
                    ),
                  },
                  {
                    label: 'CREATED',
                    value: (
                      <span className="text-[12px] text-[#565e74] font-[Inter,sans-serif]">
                        {formatDateShort(issue?.createdAt)}
                      </span>
                    ),
                  },
                  {
                    label: 'UPDATED',
                    value: (
                      <span className="text-[12px] text-[#565e74] font-[Inter,sans-serif]">
                        {formatDateShort(issue?.updatedAt)}
                      </span>
                    ),
                  },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between py-2.5 gap-2">
                    <span className="text-[10px] font-semibold text-[#767684] uppercase tracking-wider shrink-0 font-[Geist,sans-serif]">
                      {label}
                    </span>
                    <div className="text-right">{value}</div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Delete Issue Confirmation Modal (Item 3 & 4) */}
      <ConfirmModal
        open={showDeleteIssueModal}
        onClose={() => setShowDeleteIssueModal(false)}
        onConfirm={executeDeleteIssue}
        title="Delete Issue?"
        message="Are you sure you want to delete this issue? This cannot be undone and will remove all discussion history."
        confirmText="Yes, Delete Issue"
        variant="danger"
        loading={deletingIssue}
      />

      {/* Delete Comment Confirmation Modal (Item 2 & 3) */}
      <ConfirmModal
        open={!!commentToDelete}
        onClose={() => setCommentToDelete(null)}
        onConfirm={executeDeleteComment}
        title="Delete Comment?"
        message="Are you sure you want to delete this comment? This action cannot be undone."
        confirmText="Yes, Delete Comment"
        variant="danger"
        loading={deletingComment}
      />

      {/* App-Styled Alert Modal (Item 3) */}
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
