import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import SensorCard from '../components/SensorCard'
import Modal from '../components/Modal'

export default function SensorsPage() {
  const { roomId } = useParams()
  const [roomName, setRoomName] = useState('')
  const [buildingName, setBuildingName] = useState('')
  const [buildingId, setBuildingId] = useState('')
  const [sensors, setSensors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingSensor, setEditingSensor] = useState(null)
  const [editName, setEditName] = useState('')
  const [editType, setEditType] = useState('temperature')
  const [editUnit, setEditUnit] = useState('°C')
  const [refreshing, setRefreshing] = useState(false)
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState('temperature')
  const [newUnit, setNewUnit] = useState('°C')

  async function fetchData() {
    if (!roomId) return

    try {
      setError(null)

      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .select('id, name, building_id')
        .eq('id', roomId)
        .single()

      if (roomError) throw roomError
      if (!roomData) throw new Error('Sala no encontrada')

      const { data: buildingData, error: buildingError } = await supabase
        .from('buildings')
        .select('name')
        .eq('id', roomData.building_id)
        .single()

      if (buildingError) throw buildingError

      const { data: sensorsData, error: sensorsError } = await supabase
        .from('sensors')
        .select('id, name, type, unit, created_at')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })

      if (sensorsError) throw sensorsError

      setRoomName(roomData.name)
      setBuildingName(buildingData?.name ?? '')
      setBuildingId(roomData.building_id)

      const sensorIds = (sensorsData || []).map((s) => s.id)
      const lastMeasurements = {}

      if (sensorIds.length > 0) {
        const { data: measurementsData } = await supabase
          .from('measurements')
          .select('sensor_id, value, recorded_at')
          .in('sensor_id', sensorIds)
          .order('recorded_at', { ascending: false })

        if (measurementsData) {
          for (const m of measurementsData) {
            if (!lastMeasurements[m.sensor_id]) {
              lastMeasurements[m.sensor_id] = { value: m.value, recorded_at: m.recorded_at }
            }
          }
        }
      }

      const sensorsWithLast = (sensorsData || []).map((s) => ({
        ...s,
        lastValue: lastMeasurements[s.id]?.value ?? null,
        lastRecordedAt: lastMeasurements[s.id]?.recorded_at ?? null,
      }))

      setSensors(sensorsWithLast)
    } catch (err) {
      console.error(err)
      setError('No se pudieron cargar los sensores.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [roomId])

  async function handleRefresh() {
    setRefreshing(true)
    await fetchData()
    setRefreshing(false)
  }

  async function handleCreateSensor(e) {
    e.preventDefault()
    if (!newName.trim() || !roomId) return

    try {
      const { error: insertError } = await supabase
        .from('sensors')
        .insert([
          {
            name: newName.trim(),
            type: newType,
            unit: newUnit.trim() || null,
            room_id: roomId,
          },
        ])

      if (insertError) throw insertError

      setModalOpen(false)
      setNewName('')
      setNewType('temperature')
      setNewUnit('°C')
      await fetchData()
    } catch (err) {
      console.error(err)
      setError('No se pudo crear el sensor.')
    }
  }

  function handleEditSensor(sensor) {
    setEditingSensor(sensor)
    setEditName(sensor.name)
    setEditType(sensor.type || 'temperature')
    setEditUnit(sensor.unit || '°C')
    setEditModalOpen(true)
  }

  async function handleUpdateSensor(e) {
    e.preventDefault()
    if (!editName.trim() || !editingSensor) return

    try {
      const { error: updateError } = await supabase
        .from('sensors')
        .update({
          name: editName.trim(),
          type: editType,
          unit: editUnit.trim() || null,
        })
        .eq('id', editingSensor.id)

      if (updateError) throw updateError

      setEditModalOpen(false)
      setEditingSensor(null)
      setEditName('')
      setEditType('temperature')
      setEditUnit('°C')
      await fetchData()
    } catch (err) {
      console.error(err)
      setError('No se pudo actualizar el sensor.')
    }
  }

  async function handleDeleteSensor(sensor) {
    const confirmed = window.confirm(
      `¿Eliminar el sensor "${sensor.name}"? Se eliminarán también todas sus mediciones.`
    )
    if (!confirmed) return

    try {
      await supabase.from('measurements').delete().eq('sensor_id', sensor.id)
      const { error: deleteError } = await supabase.from('sensors').delete().eq('id', sensor.id)

      if (deleteError) throw deleteError

      await fetchData()
    } catch (err) {
      console.error(err)
      setError('No se pudo eliminar el sensor.')
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <p className="text-gray-400">Cargando sensores...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-950 p-8">
        <p className="text-red-400">{error}</p>
        <Link to="/" className="text-purple-400 hover:underline">
          Volver a edificios
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-gray-800 bg-gray-900/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-600">
                <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 3h6v6H3V3zm12 0h6v6h-6V3zM3 15h6v6H3v-6zm12 0h6v6h-6v-6z" />
                </svg>
              </div>
              <span className="text-xl font-semibold text-white">IoT Dash</span>
            </Link>
            <nav className="hidden items-center gap-6 md:flex">
              <Link to="/" className="text-sm font-medium text-white">
                Dashboard
              </Link>
              <Link to="/" className="text-sm font-medium text-gray-400 hover:text-white">
                Buildings
              </Link>
              <span className="text-sm font-medium text-purple-400">Sensors</span>
              <span className="text-sm text-gray-500">Analytics</span>
              <span className="text-sm text-gray-500">Settings</span>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden rounded-lg bg-gray-800 px-3 py-2 md:flex md:items-center md:gap-2">
              <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span className="text-sm text-gray-500">Search sensors...</span>
            </div>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-800 hover:text-white disabled:opacity-50"
              title="Actualizar datos"
              aria-label="Actualizar datos"
            >
              <svg
                className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button type="button" className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>
            <div className="h-8 w-8 rounded-full bg-gray-700" />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Breadcrumb */}
        <nav className="mb-4 text-sm text-gray-400">
          <Link to="/" className="hover:text-white">
            Buildings
          </Link>
          <span className="mx-2">/</span>
          <Link to={`/buildings/${buildingId}`} className="hover:text-white">
            {buildingName}
          </Link>
          <span className="mx-2">/</span>
          <span className="font-medium text-white">{roomName}</span>
        </nav>

        {/* Page header */}
        <div className="mb-8 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Room Sensors</h1>
            <p className="mt-1 text-gray-400">
              Real-time monitoring and control for {roomName}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="mt-4 flex items-center gap-2 rounded-lg bg-purple-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-purple-500 sm:mt-0"
          >
            <span className="text-lg leading-none">+</span>
            New Sensor
          </button>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-800">
          <div className="flex gap-8">
            <button
              type="button"
              className="border-b-2 border-purple-500 pb-3 text-sm font-medium text-white"
            >
              All Sensors ({sensors.length})
            </button>
            <span className="cursor-not-allowed border-b-2 border-transparent pb-3 text-sm text-gray-500">
              Climate
            </span>
            <span className="cursor-not-allowed border-b-2 border-transparent pb-3 text-sm text-gray-500">
              Lighting
            </span>
            <span className="cursor-not-allowed border-b-2 border-transparent pb-3 text-sm text-gray-500">
              Security
            </span>
          </div>
        </div>

        {/* Cards grid */}
        {sensors.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-700 bg-gray-900/50 p-16 text-center">
            <p className="text-gray-400">No hay sensores. Crea el primero.</p>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="mt-4 text-purple-400 hover:text-purple-300 hover:underline"
            >
              + New Sensor
            </button>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {sensors.map((s) => (
              <SensorCard
                key={s.id}
                sensor={s}
                onEdit={handleEditSensor}
                onDelete={handleDeleteSensor}
              />
            ))}
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="flex min-h-[220px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-600 bg-gray-800/30 py-12 text-gray-400 transition hover:border-purple-500 hover:bg-gray-800/50 hover:text-purple-400"
            >
              <span className="mb-2 text-4xl">+</span>
              <span className="text-sm font-medium">Add New Sensor</span>
            </button>
          </div>
        )}
      </main>

      <Modal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false)
          setEditingSensor(null)
          setEditName('')
          setEditType('temperature')
          setEditUnit('°C')
        }}
        title="Editar sensor"
      >
        <form onSubmit={handleUpdateSensor}>
          <div className="space-y-4">
            <div>
              <label htmlFor="edit-sensor-name" className="mb-1 block text-sm font-medium text-gray-400">
                Nombre
              </label>
              <input
                id="edit-sensor-name"
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Nombre del sensor"
                className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2.5 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                autoFocus
              />
            </div>
            <div>
              <label htmlFor="edit-sensor-type" className="mb-1 block text-sm font-medium text-gray-400">
                Tipo
              </label>
              <select
                id="edit-sensor-type"
                value={editType}
                onChange={(e) => setEditType(e.target.value)}
                className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2.5 text-white focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              >
                <option value="temperature">Temperatura</option>
                <option value="humidity">Humedad</option>
                <option value="luminosity">Luminosidad</option>
              </select>
            </div>
            <div>
              <label htmlFor="edit-sensor-unit" className="mb-1 block text-sm font-medium text-gray-400">
                Unidad de medida
              </label>
              <input
                id="edit-sensor-unit"
                type="text"
                value={editUnit}
                onChange={(e) => setEditUnit(e.target.value)}
                placeholder="°C, %, lux..."
                className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2.5 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setEditModalOpen(false)
                setEditingSensor(null)
                setEditName('')
                setEditType('temperature')
                setEditUnit('°C')
              }}
              className="rounded-lg px-4 py-2 text-gray-400 hover:bg-gray-800 hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-lg bg-purple-600 px-4 py-2 text-white hover:bg-purple-500"
            >
              Guardar
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setNewName('')
          setNewType('temperature')
          setNewUnit('°C')
        }}
        title="Nuevo sensor"
      >
        <form onSubmit={handleCreateSensor}>
          <div className="space-y-4">
            <div>
              <label htmlFor="sensor-name" className="mb-1 block text-sm font-medium text-gray-400">
                Nombre
              </label>
              <input
                id="sensor-name"
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nombre del sensor"
                className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2.5 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                autoFocus
              />
            </div>
            <div>
              <label htmlFor="sensor-type" className="mb-1 block text-sm font-medium text-gray-400">
                Tipo
              </label>
              <select
                id="sensor-type"
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2.5 text-white focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              >
                <option value="temperature">Temperatura</option>
                <option value="humidity">Humedad</option>
                <option value="luminosity">Luminosidad</option>
              </select>
            </div>
            <div>
              <label htmlFor="sensor-unit" className="mb-1 block text-sm font-medium text-gray-400">
                Unidad de medida
              </label>
              <input
                id="sensor-unit"
                type="text"
                value={newUnit}
                onChange={(e) => setNewUnit(e.target.value)}
                placeholder="°C, %, lux..."
                className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2.5 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setModalOpen(false)
                setNewName('')
                setNewType('temperature')
                setNewUnit('°C')
              }}
              className="rounded-lg px-4 py-2 text-gray-400 hover:bg-gray-800 hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-lg bg-purple-600 px-4 py-2 text-white hover:bg-purple-500"
            >
              Confirmar
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
