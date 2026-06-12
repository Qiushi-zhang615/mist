import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Brain, Clock, CheckCircle, XCircle, ChevronRight, BookOpen } from 'lucide-react'
import { getTodayReviews, getReviewStats, recordReview } from '../db/mistDB'
import LatexContent from '../components/LatexContent'

/**
 * mist 复习页面
 * 基于艾宾浩斯遗忘曲线的智能复习
 */
export default function ReviewPage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState({ today: 0, total: 0 })
  const [reviews, setReviews] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [mode, setMode] = useState('overview') // overview | reviewing | done
  const [showAnswer, setShowAnswer] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const [s, r] = await Promise.all([
      getReviewStats(),
      getTodayReviews()
    ])
    setStats(s)
    setReviews(r)
  }

  function startReview() {
    if (reviews.length === 0) return
    setMode('reviewing')
    setCurrentIndex(0)
    setShowAnswer(false)
  }

  async function handleReviewResult(isCorrect) {
    const current = reviews[currentIndex]
    await recordReview(current.id, isCorrect)

    if (currentIndex < reviews.length - 1) {
      setCurrentIndex(prev => prev + 1)
      setShowAnswer(false)
    } else {
      setMode('done')
      await loadData()
    }
  }

  if (mode === 'done') {
    return (
      <div className="mist-page review-done">
        <div className="done-content">
          <div className="done-icon">
            <CheckCircle size={64} />
          </div>
          <h2>今日复习完成！</h2>
          <p>已完成 {reviews.length} 道错题的复习</p>
          <button className="mist-btn mist-btn-lg" onClick={() => setMode('overview')}>
            返回复习计划
          </button>
        </div>
      </div>
    )
  }

  if (mode === 'reviewing') {
    const current = reviews[currentIndex]
    const progress = ((currentIndex) / reviews.length) * 100

    return (
      <div className="mist-page reviewing-page">
        <div className="review-progress">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <span className="progress-text">{currentIndex + 1} / {reviews.length}</span>
        </div>

        <div className="review-card mist-card">
          <div className="review-meta">
            <span className="mist-tag">{current.subject}</span>
            <span className="mist-tag mist-tag-outline">{current.knowledgePoint}</span>
          </div>

          <h3 className="review-title">{current.title}</h3>

          {current.image && (
            <div className="review-image">
              <img src={`data:image/jpeg;base64,${current.image}`} alt="错题" />
            </div>
          )}

          <div className="review-content">
            <LatexContent html={current.content?.html} />
          </div>

          {!showAnswer ? (
            <button className="mist-btn mist-btn-lg show-answer-btn" onClick={() => setShowAnswer(true)}>
              查看答案
            </button>
          ) : (
            <div className="answer-reveal">
              {current.answer?.html && (
                <div className="review-answer">
                  <h4>答案</h4>
                  <LatexContent html={current.answer.html} />
                </div>
              )}
              {current.analysis?.html && (
                <div className="review-analysis">
                  <h4>解析</h4>
                  <LatexContent html={current.analysis.html} />
                </div>
              )}

              <p className="review-prompt">这道题你做对了吗？</p>
              <div className="review-buttons">
                <button className="mist-btn mist-btn-danger" onClick={() => handleReviewResult(false)}>
                  <XCircle size={18} /> 做错了
                </button>
                <button className="mist-btn" onClick={() => handleReviewResult(true)}>
                  <CheckCircle size={18} /> 做对了
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="mist-page review-page">
      <div className="mist-page-header">
        <h1 className="mist-page-title">复习计划</h1>
        <p className="mist-page-subtitle">基于艾宾浩斯遗忘曲线</p>
      </div>

      <div className="review-stats-grid">
        <div className="review-stat-card mist-card">
          <Clock size={24} />
          <div className="stat-value">{stats.today}</div>
          <div className="stat-label">今日待复习</div>
        </div>
        <div className="review-stat-card mist-card">
          <Brain size={24} />
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">累计待复习</div>
        </div>
      </div>

      <div className="review-info mist-card">
        <h4>艾宾浩斯复习计划</h4>
        <p>mist 会根据你的复习记录，自动安排最佳复习时间：</p>
        <div className="review-schedule">
          <div className="schedule-item">
            <span className="schedule-dot active" />
            <span>第 1 次：1 天后</span>
          </div>
          <div className="schedule-item">
            <span className="schedule-dot active" />
            <span>第 2 次：2 天后</span>
          </div>
          <div className="schedule-item">
            <span className="schedule-dot" />
            <span>第 3 次：4 天后</span>
          </div>
          <div className="schedule-item">
            <span className="schedule-dot" />
            <span>第 4 次：7 天后</span>
          </div>
          <div className="schedule-item">
            <span className="schedule-dot" />
            <span>第 5 次：15 天后</span>
          </div>
          <div className="schedule-item">
            <span className="schedule-dot" />
            <span>第 6 次：30 天后</span>
          </div>
        </div>
      </div>

      {reviews.length > 0 ? (
        <div className="review-section">
          <div className="section-header">
            <h3>今日复习 ({reviews.length} 道)</h3>
            <button className="mist-btn" onClick={startReview}>
              <Brain size={16} /> 开始复习
            </button>
          </div>

          <div className="review-list">
            {reviews.slice(0, 5).map(mistake => (
              <div 
                key={mistake.id}
                className="review-item mist-card"
                onClick={() => navigate(`/mistakes/${mistake.id}`)}
              >
                <div className="review-item-meta">
                  <span className="mist-tag">{mistake.subject}</span>
                  <span className="mastery-badge">掌握度 {mistake.mastery || 0}%</span>
                </div>
                <h4>{mistake.title}</h4>
                <ChevronRight size={16} className="review-item-arrow" />
              </div>
            ))}
            {reviews.length > 5 && (
              <p className="review-more">还有 {reviews.length - 5} 道...</p>
            )}
          </div>
        </div>
      ) : (
        <div className="mist-empty">
          <BookOpen size={48} className="mist-empty-icon" />
          <h3>今日没有待复习的错题</h3>
          <p>艾宾浩斯遗忘曲线会帮你安排最佳复习时间</p>
        </div>
      )}
    </div>
  )
}
