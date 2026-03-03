import { useState, useEffect, useRef } from 'react'

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
    <div className="relative flex w-full flex-col rounded-lg border border-gray-200 bg-white p-6 text-left shadow-sm">
      <div className="absolute right-3 top-3" ref={menuRef}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setMenuOpen((prev) => !prev)
          }}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
          aria-label="Opciones"
          aria-expanded={menuOpen}
        >
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
          </svg>
        </button>
        {menuOpen && (
          <div
            className="absolute right-0 top-full z-10 mt-1 min-w-[140px] rounded-lg border border-gray-200 bg-white py-1 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setMenuOpen(false)
                onEdit?.(sensor)
              }}
              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
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
              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Eliminar
            </button>
          </div>
        )}
      </div>

      <div className="flex items-start justify-between gap-2 pr-10">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{sensor.name}</h3>
          <p className="mt-2 text-2xl font-bold text-gray-800">
            {sensor.lastValue != null ? (
              <>
                {sensor.lastValue} <span className="text-base font-normal text-gray-500">{sensor.unit || ''}</span>
              </>
            ) : (
              <span className="text-base font-normal text-gray-400">Sin datos</span>
            )}
          </p>
          {sensor.lastRecordedAt && (
            <p className="mt-1 text-sm text-gray-500">
              {new Date(sensor.lastRecordedAt).toLocaleString('es')}
            </p>
          )}
        </div>
        <span className="text-2xl" role="img" aria-hidden>{icon}</span>
      </div>
      <div className="mt-auto flex justify-end pt-4">
        <button
          type="button"
          onClick={handleCopyId}
          className="rounded p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
          title={copied ? 'Copiado' : 'Copiar UUID del sensor'}
          aria-label={copied ? 'UUID copiado' : 'Copiar UUID del sensor'}
        >
          {copied ? (
            <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
  )
}
