import { useLocation, useNavigate } from 'react-router-dom'
import { Camera, BookOpen, Brain, BarChart3, Settings } from 'lucide-react'

/**
 * mist 底部导航栏
 */
export default function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()

  const navItems = [
    { path: '/capture', icon: Camera, label: '拍照' },
    { path: '/mistakes', icon: BookOpen, label: '错题' },
    { path: '/review', icon: Brain, label: '复习' },
    { path: '/stats', icon: BarChart3, label: '统计' },
    { path: '/settings', icon: Settings, label: '设置' }
  ]

  return (
    <nav className="bottom-nav safe-bottom">
      {navItems.map(item => {
        const isActive = location.pathname === item.path
        const Icon = item.icon
        return (
          <button
            key={item.path}
            className={`bottom-nav-item ${isActive ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
          >
            <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
            <span>{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
