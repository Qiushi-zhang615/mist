import { useState, useEffect } from 'react'
import { BookOpen, Brain, Target, TrendingUp } from 'lucide-react'
import { mistDB } from '../db/mistDB'

/**
 * mist 统计看板页面
 */
export default function StatsPage() {
  const [stats, setStats] = useState({
    total: 0,
    reviewed: 0,
    mastered: 0,
    bySubject: [],
    byDifficulty: [],
    recentActivity: []
  })

  useEffect(() => {
    loadStats()
  }, [])

  async function loadStats() {
    const mistakes = await mistDB.mistakes.toArray()
    const reviewLogs = await mistDB.reviewLogs.orderBy('reviewedAt').reverse().limit(30).toArray()

    const total = mistakes.length
    const reviewed = mistakes.filter(m => m.reviewCount > 0).length
    const mastered = mistakes.filter(m => m.mastery >= 80).length

    // 按学科统计
    const subjectMap = {}
    mistakes.forEach(m => {
      const s = m.subject || '未分类'
      if (!subjectMap[s]) subjectMap[s] = { subject: s, count: 0, mastered: 0 }
      subjectMap[s].count++
      if (m.mastery >= 80) subjectMap[s].mastered++
    })

    // 按难度统计
    const difficultyMap = {}
    mistakes.forEach(m => {
      const d = m.difficulty || 3
      if (!difficultyMap[d]) difficultyMap[d] = { difficulty: d, count: 0 }
      difficultyMap[d].count++
    })

    // 最近活动
    const activityMap = {}
    reviewLogs.forEach(log => {
      const date = new Date(log.reviewedAt).toLocaleDateString()
      if (!activityMap[date]) activityMap[date] = { date, count: 0, correct: 0 }
      activityMap[date].count++
      if (log.result === 'correct') activityMap[date].correct++
    })

    setStats({
      total,
      reviewed,
      mastered,
      bySubject: Object.values(subjectMap),
      byDifficulty: Object.values(difficultyMap).sort((a, b) => a.difficulty - b.difficulty),
      recentActivity: Object.values(activityMap).slice(0, 7).reverse()
    })
  }

  const masteryRate = stats.total > 0 ? Math.round((stats.mastered / stats.total) * 100) : 0

  return (
    <div className="mist-page stats-page">
      <div className="mist-page-header">
        <h1 className="mist-page-title">学习统计</h1>
        <p className="mist-page-subtitle">追踪你的学习进度</p>
      </div>

      <div className="stats-overview">
        <div className="stat-card mist-card">
          <BookOpen size={24} />
          <div className="stat-info">
            <span className="stat-number">{stats.total}</span>
            <span className="stat-label">总错题</span>
          </div>
        </div>
        <div className="stat-card mist-card">
          <Brain size={24} />
          <div className="stat-info">
            <span className="stat-number">{stats.reviewed}</span>
            <span className="stat-label">已复习</span>
          </div>
        </div>
        <div className="stat-card mist-card">
          <Target size={24} />
          <div className="stat-info">
            <span className="stat-number">{stats.mastered}</span>
            <span className="stat-label">已掌握</span>
          </div>
        </div>
        <div className="stat-card mist-card">
          <TrendingUp size={24} />
          <div className="stat-info">
            <span className="stat-number">{masteryRate}%</span>
            <span className="stat-label">掌握率</span>
          </div>
        </div>
      </div>

      {stats.bySubject.length > 0 && (
        <div className="stats-section">
          <h3>学科分布</h3>
          <div className="stats-bars">
            {stats.bySubject.map(item => {
              const percent = Math.round((item.count / stats.total) * 100)
              const mastery = Math.round((item.mastered / item.count) * 100)
              return (
                <div key={item.subject} className="stat-bar-item">
                  <div className="stat-bar-header">
                    <span>{item.subject}</span>
                    <span>{item.count} 道 ({percent}%)</span>
                  </div>
                  <div className="stat-bar">
                    <div className="stat-bar-fill" style={{ width: `${percent}%` }} />
                  </div>
                  <span className="stat-bar-mastery">掌握率 {mastery}%</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {stats.byDifficulty.length > 0 && (
        <div className="stats-section">
          <h3>难度分布</h3>
          <div className="difficulty-distribution">
            {stats.byDifficulty.map(item => (
              <div key={item.difficulty} className="difficulty-item">
                <span className="difficulty-label">{'★'.repeat(item.difficulty)}</span>
                <div className="difficulty-bar">
                  <div 
                    className="difficulty-bar-fill" 
                    style={{ width: `${(item.count / stats.total) * 100}%` }}
                  />
                </div>
                <span className="difficulty-count">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats.recentActivity.length > 0 && (
        <div className="stats-section">
          <h3>最近活动</h3>
          <div className="activity-list">
            {stats.recentActivity.map(day => (
              <div key={day.date} className="activity-item">
                <span className="activity-date">{day.date}</span>
                <div className="activity-bars">
                  <div 
                    className="activity-bar correct" 
                    style={{ width: `${(day.correct / day.count) * 100}%` }}
                  />
                  <div 
                    className="activity-bar wrong" 
                    style={{ width: `${((day.count - day.correct) / day.count) * 100}%` }}
                  />
                </div>
                <span className="activity-count">{day.count} 道</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats.total === 0 && (
        <div className="mist-empty">
          <BookOpen size={48} className="mist-empty-icon" />
          <h3>暂无数据</h3>
          <p>开始录入错题后，这里会显示你的学习统计</p>
        </div>
      )}
    </div>
  )
}
