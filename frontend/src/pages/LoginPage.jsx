import { useState } from 'react'
import { Link, useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { login, user } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Already logged in — send to dashboard
  if (user) return <Navigate to="/" replace />

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.username || !form.password) { setError('Please fill in all fields.'); return }
    setError('')
    setLoading(true)
    try {
      await login(form.username, form.password)
      navigate('/')
    } catch (err) {
      setError(err.response?.data || 'Invalid credentials. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f8f9ff] flex items-center justify-center p-4">
      {/* Background pattern */}
      <div className="fixed inset-0 bg-[#f8f9ff]" style={{
        backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(68,80,183,0.05) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(94,106,210,0.05) 0%, transparent 50%)'
      }} />

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-[#4450b7] text-white font-bold text-lg font-[Geist,sans-serif] mb-3">K</div>
          <h1 className="text-[28px] font-semibold text-[#0b1c30] tracking-tight font-[Geist,sans-serif]">Welcome back</h1>
          <p className="text-[14px] text-[#565e74] mt-1 font-[Inter,sans-serif]">Sign in to your KnotFix workspace</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-xl border border-[#e5eeff] p-6" style={{ boxShadow: '0 4px 24px rgba(11,28,48,0.06), 0 0 0 1px rgba(226,232,240,0.8)' }}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && (
              <div className="bg-[#ffdad6] border border-[#ffb4a9] rounded-lg px-3 py-2.5 text-[13px] text-[#ba1a1a] font-[Inter,sans-serif]">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-[#454652] uppercase tracking-wider font-[Geist,sans-serif]">Username</label>
              <input
                type="text"
                autoComplete="username"
                placeholder="your_username"
                value={form.username}
                onChange={(e) => setForm(f => ({ ...f, username: e.target.value }))}
                className="w-full h-9 px-3 rounded-lg bg-[#f8f9ff] border border-[#c6c5d5] text-[13px] text-[#0b1c30] placeholder:text-[#767684] outline-none focus:border-[#4450b7] focus:ring-2 focus:ring-[#4450b7]/20 transition-all font-[Inter,sans-serif]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-[#454652] uppercase tracking-wider font-[Geist,sans-serif]">Password</label>
              <input
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                className="w-full h-9 px-3 rounded-lg bg-[#f8f9ff] border border-[#c6c5d5] text-[13px] text-[#0b1c30] placeholder:text-[#767684] outline-none focus:border-[#4450b7] focus:ring-2 focus:ring-[#4450b7]/20 transition-all font-[Inter,sans-serif]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="h-9 w-full bg-[#4450b7] hover:bg-[#3540a0] disabled:opacity-60 text-white font-semibold text-[13px] rounded-lg transition-all active:scale-[0.99] font-[Geist,sans-serif] mt-1"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-[13px] text-[#565e74] mt-5 font-[Inter,sans-serif]">
            Don't have an account?{' '}
            <Link to="/register" className="text-[#4450b7] font-medium hover:underline">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
