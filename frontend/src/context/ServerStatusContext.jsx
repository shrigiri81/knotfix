import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import axios from 'axios'
import { queryClient } from '../queryClient'

const ServerStatusContext = createContext(null)

export function ServerStatusProvider({ children }) {
  const [isOffline, setIsOffline] = useState(!navigator.onLine)
  const [isServerDown, setIsServerDown] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const [lastError, setLastError] = useState(null)
  const probeTimerRef = useRef(null)

  // 1. Browser Online / Offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false)
      checkServerConnection()
    }
    const handleOffline = () => {
      setIsOffline(true)
      setBannerDismissed(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // 2. Ping backend to check if it's reachable
  const checkServerConnection = useCallback(async () => {
    setIsChecking(true)
    try {
      // Lightweight probe request to backend API
      await axios.get('/api/projects', {
        timeout: 4000,
        validateStatus: (status) => status < 500, // 401/403/200 all mean server is UP and responding
      })

      // If we reach here, server is responsive!
      setIsServerDown(false)
      setLastError(null)
      // Refetch stale active queries to bring page up to date
      queryClient.invalidateQueries()
      return true
    } catch (err) {
      // If network failed or 502/503/504
      if (!err.response || err.response.status >= 500) {
        setIsServerDown(true)
        setLastError(err.message || 'Server is unresponsive')
        return false
      }
      // Any 4xx means the server is actually up and responding
      setIsServerDown(false)
      setLastError(null)
      return true
    } finally {
      setIsChecking(false)
    }
  }, [])

  // 3. Listen to custom server-offline and server-online events dispatched by Axios interceptor
  useEffect(() => {
    const handleServerOffline = (e) => {
      setIsServerDown(true)
      setBannerDismissed(false)
      if (e.detail?.message) {
        setLastError(e.detail.message)
      }
    }

    const handleServerOnline = () => {
      setIsServerDown(false)
      setLastError(null)
    }

    window.addEventListener('pulse:server-offline', handleServerOffline)
    window.addEventListener('pulse:server-online', handleServerOnline)

    return () => {
      window.removeEventListener('pulse:server-offline', handleServerOffline)
      window.removeEventListener('pulse:server-online', handleServerOnline)
    }
  }, [])

  // 4. Auto-probe when server is down to detect automatic recovery
  useEffect(() => {
    if (isServerDown && !isOffline) {
      probeTimerRef.current = setInterval(() => {
        checkServerConnection()
      }, 12000)
    } else if (probeTimerRef.current) {
      clearInterval(probeTimerRef.current)
      probeTimerRef.current = null
    }

    return () => {
      if (probeTimerRef.current) {
        clearInterval(probeTimerRef.current)
      }
    }
  }, [isServerDown, isOffline, checkServerConnection])

  const dismissBanner = useCallback(() => {
    setBannerDismissed(true)
  }, [])

  const resetDismissal = useCallback(() => {
    setBannerDismissed(false)
  }, [])

  return (
    <ServerStatusContext.Provider
      value={{
        isOffline,
        isServerDown,
        isChecking,
        bannerDismissed,
        lastError,
        checkServerConnection,
        dismissBanner,
        resetDismissal,
      }}
    >
      {children}
    </ServerStatusContext.Provider>
  )
}

export function useServerStatus() {
  const ctx = useContext(ServerStatusContext)
  if (!ctx) {
    throw new Error('useServerStatus must be used within a ServerStatusProvider')
  }
  return ctx
}
