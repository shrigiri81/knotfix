import React from 'react'
import { AlertTriangle, RotateCcw, Home, RefreshCw, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      copied: false,
      showStack: false,
    }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Pulse Application Error Boundary caught:', error, errorInfo)
    this.setState({ errorInfo })
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, copied: false, showStack: false })
  }

  handleReload = () => {
    window.location.reload()
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  handleCopy = () => {
    const { error, errorInfo } = this.state
    const details = [
      `Error: ${error?.message || String(error)}`,
      `Stack: ${error?.stack || ''}`,
      `Component Stack: ${errorInfo?.componentStack || ''}`,
    ].join('\n\n')

    navigator.clipboard.writeText(details)
    this.setState({ copied: true })
    setTimeout(() => this.setState({ copied: false }), 2000)
  }

  toggleStack = () => {
    this.setState((prev) => ({ showStack: !prev.showStack }))
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return typeof this.props.fallback === 'function'
          ? this.props.fallback({ error: this.state.error, reset: this.handleReset })
          : this.props.fallback
      }

      const { error, errorInfo, copied, showStack } = this.state

      return (
        <div className="min-h-screen bg-[#f8f9ff] flex items-center justify-center p-6 font-[Inter,sans-serif]">
          <div
            className="w-full max-w-lg bg-white rounded-2xl border border-[#e5eeff] p-8 shadow-2xl flex flex-col items-center text-center"
            style={{ boxShadow: '0 20px 60px rgba(11,28,48,0.08)' }}
          >
            <div className="w-14 h-14 rounded-2xl bg-[#ffdad6] text-[#ba1a1a] flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-[#ffdad6] text-[#93000a] mb-2">
              Application Render Exception
            </span>

            <h1 className="text-[20px] font-bold text-[#0b1c30] tracking-tight font-[Geist,sans-serif]">
              Something went wrong
            </h1>
            <p className="text-[13px] text-[#565e74] mt-2 leading-relaxed max-w-md">
              An unexpected client-side error occurred. The application safely caught it to prevent data corruption.
            </p>

            {error && (
              <div className="w-full mt-5 p-3.5 bg-[#eff4ff] rounded-xl text-left border border-[#dce9ff] relative group">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-semibold text-[#4450b7] uppercase tracking-wider font-[Geist,sans-serif]">
                    Error Message
                  </span>
                  <button
                    type="button"
                    onClick={this.handleCopy}
                    className="flex items-center gap-1 text-[11px] font-medium text-[#4450b7] hover:text-[#3540a0] transition-colors"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Copied' : 'Copy log'}</span>
                  </button>
                </div>
                <code className="text-[12px] text-[#ba1a1a] font-mono break-all block">
                  {error.message || String(error)}
                </code>

                {errorInfo?.componentStack && (
                  <div className="mt-2.5 pt-2.5 border-t border-[#dce9ff]/60">
                    <button
                      type="button"
                      onClick={this.toggleStack}
                      className="text-[11px] text-[#565e74] hover:text-[#0b1c30] flex items-center gap-1 font-medium font-[Geist,sans-serif]"
                    >
                      {showStack ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      <span>{showStack ? 'Hide component trace' : 'View component trace'}</span>
                    </button>
                    {showStack && (
                      <pre className="mt-2 text-[10px] font-mono text-[#565e74] max-h-36 overflow-y-auto whitespace-pre-wrap break-all bg-white/60 p-2 rounded-lg border border-[#dce9ff]">
                        {errorInfo.componentStack}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-2.5 mt-6 w-full sm:w-auto">
              <button
                type="button"
                onClick={this.handleReset}
                className="h-9 px-4 bg-[#4450b7] hover:bg-[#3540a0] text-white text-[13px] font-semibold rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-[0.98] font-[Geist,sans-serif]"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                className="h-9 px-3.5 bg-[#eff4ff] hover:bg-[#e5eeff] text-[#0b1c30] text-[13px] font-medium rounded-xl flex items-center justify-center gap-1.5 border border-[#c6c5d5]/60 transition-all font-[Geist,sans-serif]"
              >
                <RotateCcw className="w-4 h-4" />
                Reload Page
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                className="h-9 px-3.5 bg-white hover:bg-slate-50 text-[#565e74] hover:text-[#0b1c30] text-[13px] font-medium rounded-xl flex items-center justify-center gap-1.5 border border-[#c6c5d5]/60 transition-all font-[Geist,sans-serif]"
              >
                <Home className="w-4 h-4" />
                Dashboard
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
