import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Key, Download, Upload, FileText, Trash2, AlertTriangle, TreePine } from 'lucide-react'
import { getAIConfig, saveAIConfig, getAIProviders } from '../services/aiService'
import { exportAllData, importAllData, mistDB } from '../db/mistDB'

/**
 * mist 设置页面
 */
export default function SettingsPage() {
  const navigate = useNavigate()
  const [aiConfig, setAiConfig] = useState(null)
  const [providers, setProviders] = useState([])
  const [showAIForm, setShowAIForm] = useState(false)
  const [formData, setFormData] = useState({ provider: '', apiKey: '', customBaseURL: '', customEndpoint: '' })
  const [message, setMessage] = useState(null)

  useEffect(() => {
    const config = getAIConfig()
    setAiConfig(config)
    setProviders(getAIProviders())
    if (config) {
      setFormData({
        provider: config.provider,
        apiKey: config.apiKey,
        customBaseURL: config.customBaseURL || '',
        customEndpoint: config.customEndpoint || ''
      })
    }
  }, [])

  function handleSaveAI() {
    if (!formData.provider || !formData.apiKey) {
      setMessage({ type: 'error', text: '请填写完整的 API 配置' })
      return
    }
    saveAIConfig(formData.provider, formData.apiKey, formData.customBaseURL, formData.customEndpoint)
    setAiConfig(getAIConfig())
    setShowAIForm(false)
    setMessage({ type: 'success', text: 'API 配置已保存' })
    setTimeout(() => setMessage(null), 3000)
  }

  async function handleExport() {
    try {
      const data = await exportAllData()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `mist_backup_${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      setMessage({ type: 'success', text: '数据已导出' })
    } catch (err) {
      setMessage({ type: 'error', text: '导出失败: ' + err.message })
    }
    setTimeout(() => setMessage(null), 3000)
  }

  async function handleImport(e) {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const data = JSON.parse(text)
      await importAllData(data)
      setMessage({ type: 'success', text: '数据导入成功' })
    } catch (err) {
      setMessage({ type: 'error', text: '导入失败: ' + err.message })
    }
    setTimeout(() => setMessage(null), 3000)
  }

  async function handleClearAll() {
    if (!confirm('确定要清空所有数据吗？此操作不可恢复！')) return
    await mistDB.mistakes.clear()
    await mistDB.reviewLogs.clear()
    await mistDB.knowledgeTree.clear()
    setMessage({ type: 'success', text: '所有数据已清空' })
    setTimeout(() => setMessage(null), 3000)
  }

  return (
    <div className="mist-page settings-page">
      <div className="mist-page-header">
        <h1 className="mist-page-title">设置</h1>
        <p className="mist-page-subtitle">配置 mist</p>
      </div>

      {message && (
        <div className={`message-banner ${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="settings-section">
        <h3>AI 配置</h3>
        
        {aiConfig && !showAIForm ? (
          <div className="settings-card mist-card">
            <div className="settings-item">
              <Key size={20} />
              <div className="settings-info">
                <span className="settings-label">{providers.find(p => p.key === aiConfig.provider)?.name || aiConfig.provider}</span>
                <span className="settings-value">{aiConfig.apiKey.slice(0, 8)}...{aiConfig.apiKey.slice(-4)}</span>
              </div>
              <button className="mist-btn mist-btn-sm" onClick={() => setShowAIForm(true)}>
                修改
              </button>
            </div>
          </div>
        ) : (
          <div className="settings-form mist-card">
            <div className="form-group">
              <label>AI 提供商</label>
              <select 
                className="mist-input"
                value={formData.provider}
                onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
              >
                <option value="">请选择</option>
                {providers.map(p => (
                  <option key={p.key} value={p.key}>{p.name}</option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label>API Key</label>
              <input
                type="password"
                className="mist-input"
                placeholder="输入你的 API Key"
                value={formData.apiKey}
                onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
              />
            </div>
            
            <div className="form-group">
              <label>自定义 Base URL（可选）</label>
              <input
                type="text"
                className="mist-input"
                placeholder="https://..."
                value={formData.customBaseURL}
                onChange={(e) => setFormData({ ...formData, customBaseURL: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>自定义 API Endpoint（可选）</label>
              <input
                type="text"
                className="mist-input"
                placeholder="如：https://your-proxy.com/v1/chat/completions"
                value={formData.customEndpoint}
                onChange={(e) => setFormData({ ...formData, customEndpoint: e.target.value })}
              />
            </div>
            
            <div className="form-actions">
              {aiConfig && (
                <button className="mist-btn mist-btn-secondary" onClick={() => setShowAIForm(false)}>
                  取消
                </button>
              )}
              <button className="mist-btn" onClick={handleSaveAI}>
                保存配置
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="settings-section">
        <h3>数据管理</h3>
        
        <div className="settings-card mist-card">
          <div className="settings-item" onClick={() => navigate('/knowledge')} style={{ cursor: 'pointer' }}>
            <TreePine size={20} />
            <div className="settings-info">
              <span className="settings-label">知识点体系</span>
              <span className="settings-value">管理学科知识点</span>
            </div>
            <button className="mist-btn mist-btn-sm">
              管理
            </button>
          </div>
          
          <div className="settings-item">
            <Download size={20} />
            <div className="settings-info">
              <span className="settings-label">导出数据</span>
              <span className="settings-value">备份为 JSON 文件</span>
            </div>
            <button className="mist-btn mist-btn-sm" onClick={handleExport}>
              导出
            </button>
          </div>
          
          <div className="settings-item">
            <Upload size={20} />
            <div className="settings-info">
              <span className="settings-label">导入数据</span>
              <span className="settings-value">从 JSON 文件恢复</span>
            </div>
            <label className="mist-btn mist-btn-sm" style={{ position: 'relative', overflow: 'hidden' }}>
              导入
              <input type="file" accept=".json" onChange={handleImport} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
            </label>
          </div>
        </div>
      </div>

      <div className="settings-section danger-zone">
        <h3>危险区域</h3>
        
        <div className="settings-card mist-card">
          <div className="settings-item">
            <AlertTriangle size={20} />
            <div className="settings-info">
              <span className="settings-label">清空所有数据</span>
              <span className="settings-value">删除所有错题和记录，不可恢复</span>
            </div>
            <button className="mist-btn mist-btn-sm mist-btn-danger" onClick={handleClearAll}>
              清空
            </button>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h3>使用说明</h3>
        <div className="settings-card mist-card usage-info">
          <div className="usage-item">
            <h4>1. 配置 AI</h4>
            <p>在「AI 配置」中选择提供商并填写 API Key。支持通义千问、文心一言、讯飞星火、智谱清言等国产 AI。</p>
          </div>
          <div className="usage-item">
            <h4>2. 拍照录入</h4>
            <p>点击底部「拍照」按钮，拍摄或上传错题图片。AI 会自动识别题目内容、知识点和解析。</p>
          </div>
          <div className="usage-item">
            <h4>3. 复习错题</h4>
            <p>在「复习」页面，mist 会根据艾宾浩斯遗忘曲线自动安排复习计划。</p>
          </div>
          <div className="usage-item">
            <h4>4. 数据备份</h4>
            <p>定期在「设置」中导出 JSON 备份，防止数据丢失。</p>
          </div>
        </div>
      </div>

      <div className="settings-footer">
        <p>mist v1.0.0</p>
        <p>mist</p>
      </div>
    </div>
  )
}
