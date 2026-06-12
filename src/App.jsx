import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import BottomNav from './components/BottomNav'
import CapturePage from './pages/CapturePage'
import MistakesPage from './pages/MistakesPage'
import MistakeDetailPage from './pages/MistakeDetailPage'
import ReviewPage from './pages/ReviewPage'
import StatsPage from './pages/StatsPage'
import SettingsPage from './pages/SettingsPage'
import KnowledgePage from './pages/KnowledgePage'
import { initDefaultKnowledge } from './db/mistDB'
import './App.css'

/**
 * mist 主应用组件
 */
function App() {
  return (
    <HashRouter>
      <AppContent />
    </HashRouter>
  )
}

function AppContent() {
  const location = useLocation()

  useEffect(() => {
    // 初始化默认知识点
    initDefaultKnowledge().catch(console.error)
  }, [])

  // 在知识管理页面和错题详情页面不显示底部导航
  const hideNav = location.pathname === '/knowledge' || (location.pathname.startsWith('/mistakes/') && location.pathname !== '/mistakes')

  return (
    <div className="mist-app">
      <main className="mist-main">
        <Routes>
          <Route path="/capture" element={<CapturePage />} />
          <Route path="/mistakes" element={<MistakesPage />} />
          <Route path="/mistakes/:id" element={<MistakeDetailPage />} />
          <Route path="/review" element={<ReviewPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/knowledge" element={<KnowledgePage />} />
          <Route path="/" element={<Navigate to="/mistakes" replace />} />
        </Routes>
      </main>
      {!hideNav && <BottomNav />}
    </div>
  )
}

export default App
