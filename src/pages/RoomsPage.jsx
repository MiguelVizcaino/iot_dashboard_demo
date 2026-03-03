import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import RoomCard from '../components/RoomCard'
import Modal from '../components/Modal'

export default function RoomsPage() {
  const { buildingId } = useParams()
  const [buildingName, setBuildingName] = useState('')
  const [rooms, setRooms] = useState([])
  const [sensorCounts, setSensorCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingRoom, setEditingRoom] = useState(null)
  const [editName, setEditName] = useState('')

  async function fetchData() {
    if (!buildingId) return

    try {
      setError(null)

      const [buildingsRes, roomsRes, sensorsRes] = await Promise.all([
        supabase.from('buildings').select('name').eq('id', buildingId).single(),
        supabase
          .from('rooms')
          .select('id, name, created_at')
          .eq('building_id', buildingId)
          .order('created_at', { ascending: true }),
        supabase.from('sensors').select('room_id'),
      ])

      if (buildingsRes.error) throw buildingsRes.error
      if (roomsRes.error) throw roomsRes.error
      if (sensorsRes.error) throw sensorsRes.error

      const counts = {}
      if (sensorsRes.data) {
        for (const s of sensorsRes.data) {
          counts[s.room_id] = (counts[s.room_id] || 0) + 1
        }
      }

      setBuildingName(buildingsRes.data?.name ?? '')
      setRooms(roomsRes.data ?? [])
      setSensorCounts(counts)
    } catch (err) {
      console.error(err)
      setError('No se pudieron cargar las salas.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [buildingId])

  async function handleCreateRoom(e) {
    e.preventDefault()
    if (!newName.trim() || !buildingId) return

    try {
      const { error: insertError } = await supabase
        .from('rooms')
        .insert([{ name: newName.trim(), building_id: buildingId }])

      if (insertError) throw insertError

      setModalOpen(false)
      setNewName('')
      await fetchData()
    } catch (err) {
      console.error(err)
      setError('No se pudo crear la sala.')
    }
  }

  function handleEditRoom(room) {
    setEditingRoom(room)
    setEditName(room.name)
    setEditModalOpen(true)
  }

  async function handleUpdateRoom(e) {
    e.preventDefault()
    if (!editName.trim() || !editingRoom) return

    try {
      const { error: updateError } = await supabase
        .from('rooms')
        .update({ name: editName.trim() })
        .eq('id', editingRoom.id)

      if (updateError) throw updateError

      setEditModalOpen(false)
      setEditingRoom(null)
      setEditName('')
      await fetchData()
    } catch (err) {
      console.error(err)
      setError('No se pudo actualizar la sala.')
    }
  }

  async function handleDeleteRoom(room) {
    const confirmed = window.confirm(
      `¿Eliminar "${room.name}"? Se eliminarán también los sensores asociados.`
    )
    if (!confirmed) return

    try {
      const { error: deleteError } = await supabase
        .from('rooms')
        .delete()
        .eq('id', room.id)

      if (deleteError) throw deleteError

      await fetchData()
    } catch (err) {
      console.error(err)
      setError('No se pudo eliminar la sala.')
    }
  }

  const totalSensors = Object.values(sensorCounts).reduce((a, b) => a + b, 0)

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <p className="text-gray-400">Cargando salas...</p>
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
              <Link to="/" className="text-sm font-medium text-purple-400">
                Buildings
              </Link>
              <span className="text-sm text-gray-500">Sensors</span>
              <span className="text-sm text-gray-500">Analytics</span>
              <span className="text-sm text-gray-500">Settings</span>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden rounded-lg bg-gray-800 px-3 py-2 md:flex md:items-center md:gap-2">
              <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span className="text-sm text-gray-500">Search rooms...</span>
            </div>
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
          <span className="font-medium text-white">{buildingName}</span>
        </nav>

        {/* Page header */}
        <div className="mb-8 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Rooms View</h1>
            <p className="mt-1 text-gray-400">
              Manage and monitor {totalSensors} sensor{totalSensors !== 1 ? 's' : ''} across {rooms.length} room{rooms.length !== 1 ? 's' : ''}.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="mt-4 flex items-center gap-2 rounded-lg bg-purple-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-purple-500 sm:mt-0"
          >
            <span className="text-lg leading-none">+</span>
            New Room
          </button>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-800">
          <div className="flex gap-8">
            <button
              type="button"
              className="border-b-2 border-purple-500 pb-3 text-sm font-medium text-white"
            >
              All Rooms ({rooms.length})
            </button>
            <span className="cursor-not-allowed border-b-2 border-transparent pb-3 text-sm text-gray-500">
              Active Sensors
            </span>
            <span className="cursor-not-allowed border-b-2 border-transparent pb-3 text-sm text-gray-500">
              Offline
            </span>
          </div>
        </div>

        {/* Cards grid */}
        {rooms.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-700 bg-gray-900/50 p-16 text-center">
            <p className="text-gray-400">No hay salas. Crea la primera.</p>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="mt-4 text-purple-400 hover:text-purple-300 hover:underline"
            >
              + New Room
            </button>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {rooms.map((r) => (
              <RoomCard
                key={r.id}
                room={{
                  ...r,
                  sensorCount: sensorCounts[r.id] ?? 0,
                }}
                onEdit={handleEditRoom}
                onDelete={handleDeleteRoom}
              />
            ))}
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="flex min-h-[180px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-600 bg-gray-800/30 py-12 text-gray-400 transition hover:border-purple-500 hover:bg-gray-800/50 hover:text-purple-400"
            >
              <span className="mb-2 text-4xl">+</span>
              <span className="text-sm font-medium">Add Room</span>
            </button>
          </div>
        )}
      </main>

      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setNewName('')
        }}
        title="Nueva sala"
      >
        <form onSubmit={handleCreateRoom}>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nombre de la sala"
            className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2.5 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            autoFocus
          />
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setModalOpen(false)
                setNewName('')
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

      <Modal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false)
          setEditingRoom(null)
          setEditName('')
        }}
        title="Editar sala"
      >
        <form onSubmit={handleUpdateRoom}>
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder="Nombre de la sala"
            className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2.5 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            autoFocus
          />
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setEditModalOpen(false)
                setEditingRoom(null)
                setEditName('')
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
    </div>
  )
}
