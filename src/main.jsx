import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './amplifyClient.js'
import './index.css'
import App from './App.jsx'
import Copa2026 from './copa2026/Copa2026.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/copa2026" element={<Copa2026 />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
