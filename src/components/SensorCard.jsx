import { useState, useEffect, useRef } from 'react'

function formatTimeAgo(dateStr) {
  if (!dateStr) return null
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffMins < 1) return 'Ahora'
  if (diffMins < 60) return `Hace ${diffMins} min`
  if (diffHours < 24) return `Hace ${diffHours} h`
  if (diffDays < 7) return `Hace ${diffDays} días`
  return date.toLocaleDateString('es')
}

export default function SensorCard({ sensor, onEdit, onDelete }) {
  const [copied, setCopied] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [menuOpen])

  const typeIcons = {
    temperature: '🌡️',
    humidity: '💧',
    luminosity: '☀️',
  }
  const icon = typeIcons[sensor.type] ?? '📟'

  const hasRecentData = sensor.lastRecordedAt != null
  const isOld = sensor.lastRecordedAt
    ? (Date.now() - new Date(sensor.lastRecordedAt).getTime()) > 30 * 60 * 1000
    : true
  const status = !hasRecentData ? 'OFFLINE' : isOld ? 'WARNING' : 'ONLINE'

  const shortId = sensor.id ? sensor.id.slice(0, 8).toUpperCase() : ''

  async function handleCopyId() {
    try {
      await navigator.clipboard.writeText(sensor.id)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch (err) {
      console.error('Error al copiar:', err)
    }
  }

  return (
    <div className="relative flex w-full flex-col overflow-hidden rounded-xl bg-gray-800/60 text-left shadow-lg ring-1 ring-gray-700/50 transition hover:ring-purple-500/50 focus-within:ring-2 focus-within:ring-purple-500">
      <div className="relative flex h-20 items-start justify-between bg-gradient-to-br from-purple-600/20 via-gray-700/60 to-gray-800 px-4 pt-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-600/50 text-xl">
          {icon}
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-md px-2 py-0.5 text-xs font-medium ${
              status === 'ONLINE'
                ? 'bg-emerald-600/80 text-white'
                : status === 'WARNING'
                  ? 'bg-amber-500/80 text-white'
                  : 'bg-gray-600 text-gray-300'
            }`}
          >
            {status}
          </span>
          <div className="z-20" ref={menuRef}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setMenuOpen((prev) => !prev)
              }}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-800/80 text-gray-400 transition hover:bg-gray-700 hover:text-white"
              aria-label="Opciones"
              aria-expanded={menuOpen}
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
              </svg>
            </button>
            {menuOpen && (
              <div
                className="absolute right-0 top-full z-30 mt-1 min-w-[140px] rounded-lg border border-gray-700 bg-gray-800 py-1 shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setMenuOpen(false)
                    onEdit?.(sensor)
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Editar
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setMenuOpen(false)
                    onDelete?.(sensor)
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-400 hover:bg-gray-700 hover:text-red-300"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Eliminar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-lg font-bold text-white">{sensor.name}</h3>
        {shortId && (
          <p className="mt-0.5 text-xs text-gray-500">S/N: {shortId}</p>
        )}
        <p className="mt-3 text-2xl font-bold text-white">
          {sensor.lastValue != null ? (
            <>
              {sensor.lastValue} <span className="text-base font-normal text-gray-400">{sensor.unit || ''}</span>
            </>
          ) : (
            <span className="text-base font-normal text-gray-500">Sin datos</span>
          )}
        </p>
        {sensor.lastRecordedAt && (
          <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Actualizado: {formatTimeAgo(sensor.lastRecordedAt)}
          </p>
        )}
        <div className="mt-auto flex justify-end pt-3">
          <button
            type="button"
            onClick={handleCopyId}
            className="rounded p-1.5 text-gray-400 transition hover:bg-gray-700 hover:text-white"
            title={copied ? 'Copiado' : 'Copiar UUID del sensor'}
            aria-label={copied ? 'UUID copiado' : 'Copiar UUID del sensor'}
          >
            {copied ? (
              <svg className="h-4 w-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
