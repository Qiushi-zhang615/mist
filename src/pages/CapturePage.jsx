import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, Sparkles, AlertCircle } from 'lucide-react'
import CameraCapture from '../components/CameraCapture'
import LatexContent from '../components/LatexContent'
import { recognizeMistake, getAIConfig } from '../services/aiService'
import { mistDB, calcNextReview, initDefaultKnowledge } from '../db/mistDB'

/**
 * mist 拍照录入页面
 */
export default function CapturePage() {
  const navigate = useNavigate()
  const [step, setStep] = useState('select') // select | capture | processing | confirm
  const [image, setImage] = useState(null)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [streamStatus, setStreamStatus] = useState('')
  const resultRef = useRef(null)

  const handleCapture = (base64Image) => {
    setImage(base64Image)
    setStep('confirm')
  }

  const handleRecognize = async () => {
    if (!image) return

    const config = getAIConfig()
    if (!config) {
      setError('请先配置 AI API Key')
      return
    }

    setIsProcessing(true)
    setStep('processing')
    setError(null)
    setStreamStatus('正在连接 AI 服务...')

    try {
      const aiResult = await recognizeMistake(image)
      setResult(aiResult)
      setStreamStatus('')
      setStep('confirm')
    } catch (err) {
      setError(err.message)
      setStreamStatus('')
      setStep('confirm')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleEditResult = (field, value) => {
    setResult(prev => prev ? { ...prev, [field]: value } : null)
  }

  const handleSave = async () => {
    if (!result) return

    await initDefaultKnowledge()

    const now = new Date()
    const mistake = {
      title: result.title,
      subject: result.subject,
      knowledgePoint: result.knowledgePoint,
      difficulty: result.difficulty,
      content: result.content,
      answer: result.answer,
      analysis: result.analysis,
      errorReason: result.errorReason,
      image: image,
      mastery: 0,
      reviewCount: 0,
      createdAt: now,
      updatedAt: now,
      lastReviewedAt: null,
      nextReviewAt: calcNextReview(0, now),
      tags: [result.subject, result.knowledgePoint]
    }

    try {
      const id = await mistDB.mistakes.add(mistake)
      navigate(`/mistakes/${id}`)
    } catch (err) {
      setError('保存失败: ' + err.message)
    }
  }

  const handleRetake = () => {
    setImage(null)
    setResult(null)
    setError(null)
    setStep('select')
  }

  if (step === 'select') {
    return (
      <div className="mist-page capture-page">
        <div className="mist-page-header">
          <h1 className="mist-page-title">拍照录入</h1>
          <p className="mist-page-subtitle">拍摄或选择错题图片</p>
        </div>
        
        <CameraCapture 
          onCapture={handleCapture}
          onCancel={() => navigate('/mistakes')}
        />
      </div>
    )
  }

  if (step === 'processing') {
    return (
      <div className="mist-page processing-page">
        <div className="processing-content">
          <div className="processing-image">
            <img src={`data:image/jpeg;base64,${image}`} alt="处理中" />
            <div className="processing-overlay">
              <div className="mist-loading-spinner" />
            </div>
          </div>
          <div className="processing-text">
            <Sparkles size={24} />
            <h3>AI 分析中...</h3>
            <p>{streamStatus || '正在识别题目内容、知识点和解析'}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mist-page capture-page">
      <div className="mist-page-header">
        <h1 className="mist-page-title">确认录入</h1>
        <p className="mist-page-subtitle">检查识别结果，确认后保存</p>
      </div>

      <div className="capture-preview">
        <img src={`data:image/jpeg;base64,${image}`} alt="错题" />
      </div>

      {error && (
        <div className="error-banner">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {result ? (
        <div className="result-card mist-card">
          <div className="result-header">
            <span className="mist-tag">{result.subject}</span>
            <span className="mist-tag mist-tag-outline">{result.knowledgePoint}</span>
            <span className="difficulty-stars">
              {'★'.repeat(result.difficulty)}{'☆'.repeat(5 - result.difficulty)}
            </span>
          </div>

          <div className="form-group">
            <label>标题</label>
            <input
              type="text"
              className="mist-input"
              value={result.title}
              onChange={(e) => handleEditResult('title', e.target.value)}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>学科</label>
              <input
                type="text"
                className="mist-input"
                value={result.subject}
                onChange={(e) => handleEditResult('subject', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>知识点</label>
              <input
                type="text"
                className="mist-input"
                value={result.knowledgePoint}
                onChange={(e) => handleEditResult('knowledgePoint', e.target.value)}
              />
            </div>
          </div>

          {result.content?.html && (
            <div className="result-section">
              <label>题目</label>
              <LatexContent html={result.content.html} />
            </div>
          )}

          {result.errorReason && (
            <div className="result-section">
              <label>常见错误</label>
              <p>{result.errorReason}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="action-placeholder">
          {!error && <p>点击识别按钮，AI 将分析这道错题</p>}
        </div>
      )}

      <div className="capture-actions">
        <button className="mist-btn mist-btn-secondary" onClick={handleRetake}>
          重新拍摄
        </button>
        {!result ? (
          <button 
            className="mist-btn" 
            onClick={handleRecognize}
            disabled={isProcessing}
          >
            <Sparkles size={18} /> AI 识别
          </button>
        ) : (
          <button className="mist-btn" onClick={handleSave}>
            保存
          </button>
        )}
      </div>
    </div>
  )
}
