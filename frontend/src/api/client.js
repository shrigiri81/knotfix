import axios from 'axios'
import { queryClient } from '../queryClient'

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

// Recursively ensure any User entity payload (having userId) includes enabled: true
// so Spring Boot / Jackson never encounters a null for the primitive boolean enabled field
function ensureUserEnabled(obj) {
  if (!obj || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) {
    obj.forEach(ensureUserEnabled)
    return obj
  }
  if ('userId' in obj && typeof obj.enabled !== 'boolean') {
    obj.enabled = true
  }
  for (const key of Object.keys(obj)) {
    if (obj[key] && typeof obj[key] === 'object') {
      ensureUserEnabled(obj[key])
    }
  }
  return obj
}

// Attach JWT to every request and sanitize payloads for strict Jackson primitive deserialization
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('jwt_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  if (config.data && typeof config.data === 'object') {
    ensureUserEnabled(config.data)
  }
  return config
})

// Handle server connectivity status and 401 auth expiration
api.interceptors.response.use(
  (res) => {
    // Dispatch server-online event on successful response
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('pulse:server-online'))
    }
    return res
  },
  (err) => {
    // Check for server down / network failure / 502/503/504 gateway errors
    if (!err.response || err.code === 'ERR_NETWORK' || err.code === 'ECONNABORTED' || (err.response?.status >= 502 && err.response?.status <= 504)) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('pulse:server-offline', {
            detail: {
              status: err.response?.status,
              message: err.message || 'Unable to connect to backend server',
            },
          })
        )
      }
    }

    if (err.response?.status === 401) {
      localStorage.removeItem('jwt_token')
      localStorage.removeItem('jwt_user')
      queryClient.clear()
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)

// ─── Auth ─────────────────────────────────────────────────────────────────────
// POST /api/login → returns JWT string
export const apiLogin = (username, password) =>
  api.post('/login', { username, password })

// POST /api/register → returns Users entity
export const apiRegister = async (username, email, password) => {
  const res = await api.post('/register', { username, email, password })
  queryClient.invalidateQueries({ queryKey: ['users'] })
  return res
}

// ─── Projects ─────────────────────────────────────────────────────────────────
// GET /api/projects → List<Projects>
//   Projects: { projId, projTitle, projDesc, createdAt, updatedAt,
//               ownerId: Users, projectMembers: Users[], issues: Issues[] }
export const apiGetProjects = () => api.get('/projects')

// GET /api/projects/{id} → Projects
export const apiGetProject = (id) => api.get(`/projects/${id}`)

// POST /api/projects?projectMembersUserIds=1&projectMembersUserIds=2 → Projects
// memberIds must be a non-empty list of valid user IDs
export const apiCreateProject = async (project, memberIds) => {
  const res = await api.post(`/projects?${memberIds.map((id) => `projectMembersUserIds=${id}`).join('&')}`, project)
  queryClient.invalidateQueries({ queryKey: ['projects'] })
  return res
}

// PUT /api/projects/{id}?projectMembersUserIds=1 → Projects
export const apiUpdateProject = async (id, project, memberIds) => {
  const res = await api.put(`/projects/${id}?${memberIds.map((mid) => `projectMembersUserIds=${mid}`).join('&')}`, project)
  queryClient.invalidateQueries({ queryKey: ['projects'] })
  return res
}

// DELETE /api/projects/{id} → String
export const apiDeleteProject = async (id) => {
  // Clean up any child issues so foreign key constraints in database don't block deletion
  try {
    const issuesRes = await api.get('/issues')
    const projectIssues = (issuesRes.data || []).filter(
      (i) => i.project?.projId === parseInt(id) || i.project?.projId === id
    )
    for (const issue of projectIssues) {
      try {
        await api.delete(`/issues/${issue.issueId}/`)
      } catch {}
    }
  } catch {}

  const res = await api.delete(`/projects/${id}`)
  if (typeof res?.data === 'string' && (res.data.includes('Failed') || res.data.includes('error'))) {
    throw new Error(res.data)
  }
  queryClient.invalidateQueries({ queryKey: ['projects'] })
  queryClient.invalidateQueries({ queryKey: ['issues'] })
  return res
}

// ─── Issues ───────────────────────────────────────────────────────────────────
// GET /api/issues → List<Issues>
//   Issues: { issueId, issueTitle, issueDesc, status, priority, createdAt, updatedAt,
//             project: Projects, createdBy: Users, assignedTo: Users, comments: Comments[] }
export const apiGetIssues = () => api.get('/issues')

// GET /api/issues/{id} → Issues
export const apiGetIssue = (id) => api.get(`/issues/${id}`)

// POST /api/issues → String  (returns "Issue added successfully" or error string)
// NOTE: backend requires issue.assignedTo to be non-null (service does getAssignedTo().getUserId())
// Always send assignedTo with a userId.
export const apiCreateIssue = async (issue) => {
  const res = await api.post('/issues', issue)
  queryClient.invalidateQueries({ queryKey: ['issues'] })
  queryClient.invalidateQueries({ queryKey: ['projects'] })
  return res
}

// PUT /api/issues/{id} → Issues
// NOTE: same constraint — assignedTo must be non-null
export const apiUpdateIssue = async (id, issue) => {
  const res = await api.put(`/issues/${id}`, issue)
  queryClient.invalidateQueries({ queryKey: ['issues'] })
  queryClient.invalidateQueries({ queryKey: ['projects'] })
  return res
}

// DELETE /api/issues/{id}/ → String
export const apiDeleteIssue = async (id) => {
  const res = await api.delete(`/issues/${id}/`)
  queryClient.invalidateQueries({ queryKey: ['issues'] })
  queryClient.invalidateQueries({ queryKey: ['projects'] })
  return res
}

// ─── Comments ─────────────────────────────────────────────────────────────────
// GET /api/issues/{issueId}/comments → List<Comments> (returns ALL comments, ignores issueId param)
//   Comments: { commentId, commentData, createdAt, modifiedAt,
//               commentAuthor: Users, issue: Issues, repliedTo: Comments }
// We filter by issue.issueId client-side.
export const apiGetComments = async (issueId) => {
  const res = await api.get(`/issues/${issueId}/comments`)
  const all = Array.isArray(res.data) ? res.data : []
  const numericId = parseInt(issueId)
  const hasIssueProperty = all.some((c) => c.issue?.issueId != null)
  return { ...res, data: hasIssueProperty ? all.filter((c) => c.issue?.issueId === numericId) : all }
}

// POST /api/issues/{issueId}/comments → Comments
// Body: CommentRequest { commentContent: string, repliedTo: integer | null }
export const apiAddComment = async (issueId, commentContent, repliedTo = null) => {
  const res = await api.post(`/issues/${issueId}/comments`, { commentContent, repliedTo })
  queryClient.invalidateQueries({ queryKey: ['comments', String(issueId)] })
  queryClient.invalidateQueries({ queryKey: ['issues'] })
  return res
}

// PATCH /api/issues/{issueId}/comments/{commentId} → Comments
// Sends plain text to prevent JSON.stringify from adding quotes to either ends
export const apiUpdateComment = async (issueId, commentId, commentData) => {
  const text = typeof commentData === 'string' ? commentData.trim() : String(commentData || '')
  const res = await api.patch(`/issues/${issueId}/comments/${commentId}`, text, {
    headers: { 'Content-Type': 'text/plain' },
  })
  queryClient.invalidateQueries({ queryKey: ['comments', String(issueId)] })
  return res
}

// DELETE /api/issues/{issueId}/comments/{commentId} → String
export const apiDeleteComment = async (issueId, commentId) => {
  const res = await api.delete(`/issues/${issueId}/comments/${commentId}`)
  queryClient.invalidateQueries({ queryKey: ['comments', String(issueId)] })
  return res
}

// ─── Users ────────────────────────────────────────────────────────────────────
// GET /api/users → List<Users>
//   Users: { userId, username, email, role, enabled }
export const apiGetUsers = async () => {
  try {
    const res = await api.get('/users')
    if (Array.isArray(res.data) && res.data.length > 0) {
      return res
    }
  } catch {
    // /api/users endpoint not exposed in backend
  }

  const usersMap = new Map()

  // Primary fallback: /api/search?query= searches across UsersRepository
  try {
    const searchRes = await api.get('/search?query=')
    if (Array.isArray(searchRes.data)) {
      searchRes.data
        .filter((item) => item.type === 'USER')
        .forEach((u) => {
          usersMap.set(u.id, {
            userId: u.id,
            username: u.name,
            email: `${u.name}@example.com`,
          })
        })
    }
  } catch (err) {
    console.warn('Fallback search users error:', err)
  }

  // Secondary enrichment: Extract users from projects (which have full ownerId and projectMembers)
  try {
    const cachedProjects = queryClient.getQueryData(['projects'])
    const projectsList = Array.isArray(cachedProjects?.data)
      ? cachedProjects.data
      : Array.isArray(cachedProjects)
      ? cachedProjects
      : null

    const projectsToScan = projectsList || (await api.get('/projects')).data
    if (Array.isArray(projectsToScan)) {
      projectsToScan.forEach((p) => {
        if (p.ownerId?.userId) {
          const prev = usersMap.get(p.ownerId.userId) || {}
          usersMap.set(p.ownerId.userId, {
            userId: p.ownerId.userId,
            username: p.ownerId.username || prev.username,
            email: p.ownerId.email || prev.email || '',
            role: p.ownerId.role || prev.role,
          })
        }
        if (Array.isArray(p.projectMembers)) {
          p.projectMembers.forEach((m) => {
            if (m.userId) {
              const prev = usersMap.get(m.userId) || {}
              usersMap.set(m.userId, {
                userId: m.userId,
                username: m.username || prev.username,
                email: m.email || prev.email || '',
                role: m.role || prev.role,
              })
            }
          })
        }
      })
    }
  } catch (err) {
    console.warn('Fallback projects users error:', err)
  }

  // Tertiary enrichment: Extract from issues
  try {
    const cachedIssues = queryClient.getQueryData(['issues'])
    const issuesList = Array.isArray(cachedIssues?.data)
      ? cachedIssues.data
      : Array.isArray(cachedIssues)
      ? cachedIssues
      : null
    if (Array.isArray(issuesList)) {
      issuesList.forEach((i) => {
        if (i.createdBy?.userId) {
          const prev = usersMap.get(i.createdBy.userId) || {}
          usersMap.set(i.createdBy.userId, {
            userId: i.createdBy.userId,
            username: i.createdBy.username || prev.username,
            email: i.createdBy.email || prev.email || '',
          })
        }
        if (i.assignedTo?.userId) {
          const prev = usersMap.get(i.assignedTo.userId) || {}
          usersMap.set(i.assignedTo.userId, {
            userId: i.assignedTo.userId,
            username: i.assignedTo.username || prev.username,
            email: i.assignedTo.email || prev.email || '',
          })
        }
      })
    }
  } catch {}

  return { data: Array.from(usersMap.values()) }
}

// GET /api/users/{id} → Users
export const apiGetUser = (id) => api.get(`/users/${id}`)

// PUT /api/users/{id} → Users
export const apiUpdateUser = async (id, user) => {
  const res = await api.put(`/users/${id}`, user)
  queryClient.invalidateQueries({ queryKey: ['users'] })
  return res
}

// DELETE /api/users/{id} → String
export const apiDeleteUser = async (id) => {
  const res = await api.delete(`/users/${id}`)
  queryClient.invalidateQueries({ queryKey: ['users'] })
  return res
}

// ─── Search ───────────────────────────────────────────────────────────────────
export const apiSearch = (query) => api.get(`/search?query=${encodeURIComponent(query)}`)

export default api
