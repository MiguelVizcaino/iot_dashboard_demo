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
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">Cargando sensores...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
        <p className="text-red-600">{error}</p>
        <Link to="/" className="text-blue-600 hover:underline">
          Volver a edificios
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-6xl">
        <nav className="mb-6 text-sm text-gray-600">
          <Link to="/" className="hover:text-blue-600 hover:underline">
            Edificios
          </Link>
          <span className="mx-2">/</span>
          <Link to={`/buildings/${buildingId}`} className="hover:text-blue-600 hover:underline">
            {buildingName}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900">{roomName}</span>
        </nav>

        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">{roomName}</h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-200 hover:text-gray-700 disabled:opacity-50"
              title="Actualizar datos"
              aria-label="Actualizar datos"
            >
              <svg
                className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              + Nuevo sensor
            </button>
          </div>
        </div>

        {sensors.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center">
            <p className="text-gray-500">No hay sensores. Crea el primero.</p>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="mt-4 text-blue-600 hover:underline"
            >
              + Nuevo sensor
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sensors.map((s) => (
              <SensorCard
                key={s.id}
                sensor={s}
                onEdit={handleEditSensor}
                onDelete={handleDeleteSensor}
              />
            ))}
          </div>
        )}
      </div>

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
              <label htmlFor="edit-sensor-name" className="mb-1 block text-sm font-medium text-gray-300">
                Nombre
              </label>
              <input
                id="edit-sensor-name"
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Nombre del sensor"
                className="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoFocus
              />
            </div>
            <div>
              <label htmlFor="edit-sensor-type" className="mb-1 block text-sm font-medium text-gray-300">
                Tipo
              </label>
              <select
                id="edit-sensor-type"
                value={editType}
                onChange={(e) => setEditType(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="temperature">Temperatura</option>
                <option value="humidity">Humedad</option>
                <option value="luminosity">Luminosidad</option>
              </select>
            </div>
            <div>
              <label htmlFor="edit-sensor-unit" className="mb-1 block text-sm font-medium text-gray-300">
                Unidad de medida
              </label>
              <input
                id="edit-sensor-unit"
                type="text"
                value={editUnit}
                onChange={(e) => setEditUnit(e.target.value)}
                placeholder="°C, %, lux..."
                className="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
              className="rounded px-4 py-2 text-gray-600 hover:bg-gray-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
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
              <label htmlFor="sensor-name" className="mb-1 block text-sm font-medium text-gray-300">
                Nombre
              </label>
              <input
                id="sensor-name"
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nombre del sensor"
                className="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoFocus
              />
            </div>
            <div>
              <label htmlFor="sensor-type" className="mb-1 block text-sm font-medium text-gray-300">
                Tipo
              </label>
              <select
                id="sensor-type"
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="temperature">Temperatura</option>
                <option value="humidity">Humedad</option>
                <option value="luminosity">Luminosidad</option>
              </select>
            </div>
            <div>
              <label htmlFor="sensor-unit" className="mb-1 block text-sm font-medium text-gray-300">
                Unidad de medida
              </label>
              <input
                id="sensor-unit"
                type="text"
                value={newUnit}
                onChange={(e) => setNewUnit(e.target.value)}
                placeholder="°C, %, lux..."
                className="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
              className="rounded px-4 py-2 text-gray-600 hover:bg-gray-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Confirmar
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
