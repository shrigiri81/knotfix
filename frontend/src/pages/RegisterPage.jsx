import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiRegister } from '../api/client'

export default function RegisterPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', email: '', password: '', confirmPassword: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.username || !form.email || !form.password) {
      setError('Please fill in all required fields.')
      return
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    setLoading(true)
    try {
      await apiRegister(form.username, form.email, form.password)
      navigate('/login', { state: { success: 'Account created! Please sign in.' } })
    } catch (err) {
      setError(err.response?.data || 'Registration failed. Username or email may already exist.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f8f9ff] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-[#f8f9ff]" style={{
        backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(68,80,183,0.05) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(94,106,210,0.05) 0%, transparent 50%)'
      }} />

      <div className="relative z-10 w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-[#4450b7] text-white font-bold text-lg font-[Geist,sans-serif] mb-3">K</div>
          <h1 className="text-[28px] font-semibold text-[#0b1c30] tracking-tight font-[Geist,sans-serif]">Create account</h1>
          <p className="text-[14px] text-[#565e74] mt-1 font-[Inter,sans-serif]">Join your team on KnotFix</p>
        </div>

        <div className="bg-white rounded-xl border border-[#e5eeff] p-6" style={{ boxShadow: '0 4px 24px rgba(11,28,48,0.06), 0 0 0 1px rgba(226,232,240,0.8)' }}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && (
              <div className="bg-[#ffdad6] border border-[#ffb4a9] rounded-lg px-3 py-2.5 text-[13px] text-[#ba1a1a] font-[Inter,sans-serif]">
                {error}
              </div>
            )}

            {[
              { key: 'username', label: 'Username', type: 'text', placeholder: 'your_username', autoComplete: 'username' },
              { key: 'email', label: 'Email', type: 'email', placeholder: 'you@company.com', autoComplete: 'email' },
              { key: 'password', label: 'Password', type: 'password', placeholder: '••••••••', autoComplete: 'new-password' },
              { key: 'confirmPassword', label: 'Confirm Password', type: 'password', placeholder: '••••••••', autoComplete: 'new-password' },
            ].map(({ key, label, type, placeholder, autoComplete }) => (
              <div key={key} className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-[#454652] uppercase tracking-wider font-[Geist,sans-serif]">{label}</label>
                <input
                  type={type}
                  autoComplete={autoComplete}
                  placeholder={placeholder}
                  value={form[key]}
                  onChange={(e) => setForm(f => ({ ...f, [key]: e.target.value }))}
                  className="w-full h-9 px-3 rounded-lg bg-[#f8f9ff] border border-[#c6c5d5] text-[13px] text-[#0b1c30] placeholder:text-[#767684] outline-none focus:border-[#4450b7] focus:ring-2 focus:ring-[#4450b7]/20 transition-all font-[Inter,sans-serif]"
                />
              </div>
            ))}

            <button
              type="submit"
              disabled={loading}
              className="h-9 w-full bg-[#4450b7] hover:bg-[#3540a0] disabled:opacity-60 text-white font-semibold text-[13px] rounded-lg transition-all active:scale-[0.99] font-[Geist,sans-serif] mt-1"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <p className="text-center text-[13px] text-[#565e74] mt-5 font-[Inter,sans-serif]">
            Already have an account?{' '}
            <Link to="/login" className="text-[#4450b7] font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
