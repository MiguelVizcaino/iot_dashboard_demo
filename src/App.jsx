import { BrowserRouter, Routes, Route } from 'react-router-dom'
import BuildingsPage from './pages/BuildingsPage'
import RoomsPage from './pages/RoomsPage'
import SensorsPage from './pages/SensorsPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<BuildingsPage />} />
        <Route path="/buildings/:buildingId" element={<RoomsPage />} />
        <Route path="/rooms/:roomId" element={<SensorsPage />} />
      </Routes>
    </BrowserRouter>
  )
}
