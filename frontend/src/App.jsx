import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './queryClient'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ServerStatusProvider } from './context/ServerStatusContext'
import ErrorBoundary from './components/ErrorBoundary'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import ProjectDetailPage from './pages/ProjectDetailPage'
import Layout from './components/Layout'
import ProjectsPage from './pages/ProjectsPage'
import IssueDetailPage from './pages/IssueDetailPage'
import ProfilePage from './pages/ProfilePage'
import NotFoundPage from './pages/NotFoundPage'
import MyIssuesPage from './pages/MyIssuesPage'

function PrivateRoute({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return children || null
}

function AppRouteFallback() {
  const { user } = useAuth()
  if (user) {
    return (
      <Layout>
        <NotFoundPage />
      </Layout>
    )
  }
  return <NotFoundPage />
}

function AppRoutes() {
  return (
    <Routes>
      {/* Auth routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Main application pages - persistent Layout shell */}
      <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/:id" element={<ProjectDetailPage />} />
        <Route path="/issues/:id" element={<IssueDetailPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/my-issues" element={<MyIssuesPage />} />
      </Route>

      {/* 404 Not Found fallback */}
      <Route path="*" element={<AppRouteFallback />} />
    </Routes>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ServerStatusProvider>
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </ServerStatusProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
