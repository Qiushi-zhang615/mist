import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Filter, BookOpen, Star, ChevronRight, X } from 'lucide-react'
import { mistDB } from '../db/mistDB'

/**
 * mist 错题列表页面
 */
export default function MistakesPage() {
  const navigate = useNavigate()
  const [mistakes, setMistakes] = useState([])
  const [filtered, setFiltered] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filterSubject, setFilterSubject] = useState('')
  const [filterDifficulty, setFilterDifficulty] = useState('')
  const [showFilter, setShowFilter] = useState(false)
  const [subjects, setSubjects] = useState([])

  useEffect(() => {
    loadMistakes()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [mistakes, searchQuery, filterSubject, filterDifficulty])

  async function loadMistakes() {
    const all = await mistDB.mistakes.orderBy('createdAt').reverse().toArray()
    setMistakes(all)
    
    const uniqueSubjects = [...new Set(all.map(m => m.subject).filter(Boolean))]
    setSubjects(uniqueSubjects)
  }

  function applyFilters() {
    let result = [...mistakes]
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(m => 
        m.title?.toLowerCase().includes(q) ||
        m.content?.text?.toLowerCase().includes(q) ||
        m.knowledgePoint?.toLowerCase().includes(q)
      )
    }
    
    if (filterSubject) {
      result = result.filter(m => m.subject === filterSubject)
    }
    
    if (filterDifficulty) {
      result = result.filter(m => m.difficulty === Number(filterDifficulty))
    }
    
    setFiltered(result)
  }

  function clearFilters() {
    setSearchQuery('')
    setFilterSubject('')
    setFilterDifficulty('')
  }

  const hasFilters = searchQuery || filterSubject || filterDifficulty

  return (
    <div className="mist-page mistakes-page">
      <div className="mist-page-header">
        <h1 className="mist-page-title">mist</h1>
        <p className="mist-page-subtitle">共 {mistakes.length} 道错题</p>
      </div>

      <div className="search-bar">
        <Search size={18} className="search-icon" />
        <input
          type="text"
          className="mist-input"
          placeholder="搜索题目、知识点..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <button 
          className={`filter-btn ${showFilter ? 'active' : ''}`}
          onClick={() => setShowFilter(!showFilter)}
        >
          <Filter size={18} />
        </button>
      </div>

      {showFilter && (
        <div className="filter-panel mist-card">
          <div className="filter-group">
            <label>学科</label>
            <div className="filter-options">
              <button 
                className={`filter-chip ${!filterSubject ? 'active' : ''}`}
                onClick={() => setFilterSubject('')}
              >
                全部
              </button>
              {subjects.map(s => (
                <button
                  key={s}
                  className={`filter-chip ${filterSubject === s ? 'active' : ''}`}
                  onClick={() => setFilterSubject(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          
          <div className="filter-group">
            <label>难度</label>
            <div className="filter-options">
              <button 
                className={`filter-chip ${!filterDifficulty ? 'active' : ''}`}
                onClick={() => setFilterDifficulty('')}
              >
                全部
              </button>
              {[1, 2, 3, 4, 5].map(d => (
                <button
                  key={d}
                  className={`filter-chip ${filterDifficulty === String(d) ? 'active' : ''}`}
                  onClick={() => setFilterDifficulty(String(d))}
                >
                  {'★'.repeat(d)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {hasFilters && (
        <div className="active-filters">
          <span>筛选结果: {filtered.length} 道</span>
          <button className="clear-filters" onClick={clearFilters}>
            <X size={14} /> 清除筛选
          </button>
        </div>
      )}

      <div className="mistakes-list">
        {filtered.length === 0 ? (
          <div className="mist-empty">
            <BookOpen size={48} className="mist-empty-icon" />
            <p>{hasFilters ? '没有符合条件的题目' : '还没有题目，去拍照录入吧'}</p>
          </div>
        ) : (
          filtered.map(mistake => (
            <div 
              key={mistake.id}
              className="mistake-item mist-card"
              onClick={() => navigate(`/mistakes/${mistake.id}`)}
            >
              <div className="mistake-header">
                <div className="mistake-meta">
                  <span className="mist-tag">{mistake.subject}</span>
                  <span className="mist-tag mist-tag-outline">{mistake.knowledgePoint}</span>
                </div>
                <div className="difficulty-stars">
                  {'★'.repeat(mistake.difficulty || 3)}{'☆'.repeat(5 - (mistake.difficulty || 3))}
                </div>
              </div>
              
              <h3 className="mistake-title">{mistake.title}</h3>
              
              {mistake.content?.text && (
                <p className="mistake-preview">
                  {mistake.content.text.replace(/\$\$?[\s\S]*?\$\$?/g, ' [公式] ').slice(0, 80)}...
                </p>
              )}
              
              <div className="mistake-footer">
                <div className="mastery-bar">
                  <div 
                    className="mastery-fill" 
                    style={{ width: `${mistake.mastery || 0}%` }}
                  />
                </div>
                <span className="mastery-text">掌握度 {mistake.mastery || 0}%</span>
                <ChevronRight size={16} className="mistake-arrow" />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
