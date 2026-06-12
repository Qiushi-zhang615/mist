import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Trash2, CheckCircle, XCircle, BookOpen, Share2, FileText } from 'lucide-react'
import { mistDB, recordReview } from '../db/mistDB'
import LatexContent from '../components/LatexContent'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

/**
 * mist 错题详情页面
 */
export default function MistakeDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [mistake, setMistake] = useState(null)
  const [showAnswer, setShowAnswer] = useState(false)
  const [showAnalysis, setShowAnalysis] = useState(false)
  const [isReviewing, setIsReviewing] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const contentRef = useRef(null)

  useEffect(() => {
    loadMistake()
  }, [id])

  async function loadMistake() {
    const data = await mistDB.mistakes.get(Number(id))
    if (data) {
      setMistake(data)
    } else {
      navigate('/mistakes')
    }
  }

  async function handleDelete() {
    if (!confirm('确定要删除这道错题吗？')) return
    await mistDB.mistakes.delete(Number(id))
    navigate('/mistakes')
  }

  async function handleShare() {
    const shareData = {
      title: mistake.title,
      text: `${mistake.subject} - ${mistake.knowledgePoint}\n${mistake.content?.text?.slice(0, 100)}...`,
      url: window.location.href
    }

    if (navigator.share) {
      try {
        await navigator.share(shareData)
      } catch {
        // 用户取消分享
      }
    } else {
      // 复制到剪贴板
      try {
        await navigator.clipboard.writeText(`${shareData.title}\n${shareData.text}`)
        alert('已复制到剪贴板')
      } catch {
        alert('分享功能不可用')
      }
    }
  }

  async function handleExportPDF() {
    if (!contentRef.current) return
    setIsExporting(true)

    try {
      const canvas = await html2canvas(contentRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      })

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      const imgWidth = canvas.width
      const imgHeight = canvas.height
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight)
      const imgX = (pdfWidth - imgWidth * ratio) / 2

      pdf.addImage(imgData, 'PNG', imgX, 10, imgWidth * ratio, imgHeight * ratio)
      pdf.save(`mist_${mistake.title}_${new Date().toISOString().slice(0, 10)}.pdf`)
    } catch (err) {
      alert('导出 PDF 失败: ' + err.message)
    } finally {
      setIsExporting(false)
    }
  }

  async function handleReview(result) {
    await recordReview(Number(id), result === 'correct')
    await loadMistake()
    setIsReviewing(false)
    setShowAnswer(false)
    setShowAnalysis(false)
  }

  if (!mistake) {
    return (
      <div className="mist-page">
        <div className="mist-loading">
          <div className="mist-loading-spinner" />
          <span>加载中...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="mist-page detail-page">
      <div className="detail-header">
        <button className="back-btn" onClick={() => navigate('/mistakes')}>
          <ArrowLeft size={20} />
        </button>
        <div className="detail-actions">
          <button className="icon-btn" onClick={handleExportPDF} disabled={isExporting}>
            <FileText size={18} />
          </button>
          <button className="icon-btn" onClick={handleShare}>
            <Share2 size={18} />
          </button>
          <button className="icon-btn" onClick={handleDelete}>
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      <div className="detail-content" ref={contentRef}>
        <div className="detail-meta">
          <span className="mist-tag">{mistake.subject}</span>
          <span className="mist-tag mist-tag-outline">{mistake.knowledgePoint}</span>
          <span className="difficulty-stars">
            {'★'.repeat(mistake.difficulty || 3)}{'☆'.repeat(5 - (mistake.difficulty || 3))}
          </span>
        </div>

        <h1 className="detail-title">{mistake.title}</h1>

        {mistake.image && (
          <div className="detail-image">
            <img src={`data:image/jpeg;base64,${mistake.image}`} alt="错题原图" />
          </div>
        )}

        <div className="detail-section">
          <h3>题目</h3>
          <div className="detail-html">
            <LatexContent html={mistake.content?.html} />
          </div>
        </div>

        {mistake.errorReason && (
          <div className="detail-section error-section">
            <h3>常见错误</h3>
            <p>{mistake.errorReason}</p>
          </div>
        )}

        {!isReviewing ? (
          <div className="detail-toggles">
            <button 
              className={`toggle-btn ${showAnswer ? 'active' : ''}`}
              onClick={() => setShowAnswer(!showAnswer)}
            >
              {showAnswer ? '隐藏答案' : '查看答案'}
            </button>
            <button 
              className={`toggle-btn ${showAnalysis ? 'active' : ''}`}
              onClick={() => setShowAnalysis(!showAnalysis)}
            >
              {showAnalysis ? '隐藏解析' : '查看解析'}
            </button>
          </div>
        ) : null}

        {showAnswer && mistake.answer?.html && (
          <div className="detail-section answer-section">
            <h3>答案</h3>
            <div className="detail-html">
              <LatexContent html={mistake.answer.html} />
            </div>
          </div>
        )}

        {showAnalysis && mistake.analysis?.html && (
          <div className="detail-section analysis-section">
            <h3>解析</h3>
            <div className="detail-html">
              <LatexContent html={mistake.analysis.html} />
            </div>
          </div>
        )}

        <div className="detail-stats">
          <div className="stat-item">
            <label>掌握度</label>
            <div className="mastery-bar large">
              <div className="mastery-fill" style={{ width: `${mistake.mastery || 0}%` }} />
            </div>
            <span>{mistake.mastery || 0}%</span>
          </div>
          <div className="stat-item">
            <label>复习次数</label>
            <span>{mistake.reviewCount || 0} 次</span>
          </div>
          <div className="stat-item">
            <label>下次复习</label>
            <span>{mistake.nextReviewAt ? new Date(mistake.nextReviewAt).toLocaleDateString() : '未安排'}</span>
          </div>
        </div>

        {!isReviewing ? (
          <button className="mist-btn mist-btn-lg review-start-btn" onClick={() => setIsReviewing(true)}>
            <BookOpen size={18} /> 开始复习
          </button>
        ) : (
          <div className="review-actions">
            <p className="review-prompt">这道题你做对了吗？</p>
            <div className="review-buttons">
              <button className="mist-btn mist-btn-danger" onClick={() => handleReview('wrong')}>
                <XCircle size={18} /> 做错了
              </button>
              <button className="mist-btn" onClick={() => handleReview('correct')}>
                <CheckCircle size={18} /> 做对了
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
