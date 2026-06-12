import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Upload, Download, TreePine, Plus, Trash2, BookOpen } from 'lucide-react'
import { mistDB, DEFAULT_KNOWLEDGE_TREE } from '../db/mistDB'

/**
 * mist 知识点管理页面
 * 支持导入/导出知识点体系
 */
export default function KnowledgePage() {
  const navigate = useNavigate()
  const [knowledgeTree, setKnowledgeTree] = useState([])
  const [subjects, setSubjects] = useState([])
  const [activeSubject, setActiveSubject] = useState('')
  const [message, setMessage] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newPoint, setNewPoint] = useState({ subject: '', name: '', parentId: null })

  useEffect(() => {
    loadKnowledge()
  }, [])

  async function loadKnowledge() {
    const all = await mistDB.knowledgeTree.toArray()
    setKnowledgeTree(all)
    
    const uniqueSubjects = [...new Set(all.map(k => k.subject).filter(Boolean))]
    setSubjects(uniqueSubjects)
    if (uniqueSubjects.length > 0 && !activeSubject) {
      setActiveSubject(uniqueSubjects[0])
    }
  }

  async function handleImport(e) {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const data = JSON.parse(text)
      
      if (!Array.isArray(data.knowledgeTree)) {
        throw new Error('无效的知识点格式')
      }

      await mistDB.knowledgeTree.clear()
      await mistDB.knowledgeTree.bulkAdd(data.knowledgeTree.map((item, i) => ({
        ...item,
        order: item.order ?? i
      })))
      
      await loadKnowledge()
      setMessage({ type: 'success', text: `成功导入 ${data.knowledgeTree.length} 个知识点` })
    } catch (err) {
      setMessage({ type: 'error', text: '导入失败: ' + err.message })
    }
    setTimeout(() => setMessage(null), 3000)
  }

  async function handleExport() {
    const all = await mistDB.knowledgeTree.toArray()
    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      knowledgeTree: all
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mist_knowledge_${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    
    setMessage({ type: 'success', text: '知识点已导出' })
    setTimeout(() => setMessage(null), 3000)
  }

  async function handleReset() {
    if (!confirm('确定要重置为默认知识点体系吗？当前自定义内容将丢失。')) return
    
    await mistDB.knowledgeTree.clear()
    await mistDB.knowledgeTree.bulkAdd(DEFAULT_KNOWLEDGE_TREE.map((item, i) => ({
      ...item,
      parentId: null,
      order: i
    })))
    
    await loadKnowledge()
    setMessage({ type: 'success', text: '已重置为默认知识点体系' })
    setTimeout(() => setMessage(null), 3000)
  }

  async function handleAdd() {
    if (!newPoint.subject || !newPoint.name) {
      setMessage({ type: 'error', text: '请填写完整信息' })
      return
    }
    
    const order = knowledgeTree.filter(k => k.subject === newPoint.subject).length
    await mistDB.knowledgeTree.add({
      subject: newPoint.subject,
      name: newPoint.name,
      parentId: newPoint.parentId,
      order
    })
    
    setNewPoint({ subject: '', name: '', parentId: null })
    setShowAddForm(false)
    await loadKnowledge()
    setMessage({ type: 'success', text: '知识点已添加' })
    setTimeout(() => setMessage(null), 3000)
  }

  async function handleDelete(id) {
    if (!confirm('确定要删除这个知识点吗？')) return
    await mistDB.knowledgeTree.delete(id)
    await loadKnowledge()
  }

  const filteredKnowledge = knowledgeTree.filter(k => k.subject === activeSubject)

  return (
    <div className="mist-page knowledge-page">
      <div className="detail-header">
        <button className="back-btn" onClick={() => navigate('/settings')}>
          <ArrowLeft size={20} />
        </button>
        <h1 className="mist-page-title" style={{ margin: 0 }}>知识点管理</h1>
        <div style={{ width: 40 }} />
      </div>

      {message && (
        <div className={`message-banner ${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="knowledge-actions">
        <button className="mist-btn mist-btn-sm" onClick={handleExport}>
          <Download size={14} /> 导出
        </button>
        <label className="mist-btn mist-btn-sm" style={{ position: 'relative', overflow: 'hidden' }}>
          <Upload size={14} /> 导入
          <input type="file" accept=".json" onChange={handleImport} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
        </label>
        <button className="mist-btn mist-btn-sm mist-btn-secondary" onClick={handleReset}>
          重置默认
        </button>
      </div>

      <div className="knowledge-subjects">
        {subjects.map(subject => (
          <button
            key={subject}
            className={`subject-tab ${activeSubject === subject ? 'active' : ''}`}
            onClick={() => setActiveSubject(subject)}
          >
            {subject}
          </button>
        ))}
      </div>

      <div className="knowledge-list">
        {filteredKnowledge.length === 0 ? (
          <div className="mist-empty">
            <BookOpen size={48} className="mist-empty-icon" />
            <p>该学科暂无知识点</p>
          </div>
        ) : (
          filteredKnowledge.sort((a, b) => a.order - b.order).map(item => (
            <div key={item.id} className="knowledge-item">
              <TreePine size={16} />
              <span>{item.name}</span>
              <button className="icon-btn" onClick={() => handleDelete(item.id)}>
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>

      {!showAddForm ? (
        <button className="mist-btn" onClick={() => setShowAddForm(true)}>
          <Plus size={16} /> 添加知识点
        </button>
      ) : (
        <div className="knowledge-form mist-card">
          <div className="form-group">
            <label>学科</label>
            <input
              type="text"
              className="mist-input"
              placeholder="如：数学"
              value={newPoint.subject}
              onChange={(e) => setNewPoint({ ...newPoint, subject: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>知识点名称</label>
            <input
              type="text"
              className="mist-input"
              placeholder="如：二次函数"
              value={newPoint.name}
              onChange={(e) => setNewPoint({ ...newPoint, name: e.target.value })}
            />
          </div>
          <div className="form-actions">
            <button className="mist-btn mist-btn-secondary" onClick={() => setShowAddForm(false)}>
              取消
            </button>
            <button className="mist-btn" onClick={handleAdd}>
              添加
            </button>
          </div>
        </div>
      )}

      <div className="knowledge-template">
        <h4>知识点 JSON 格式示例</h4>
        <pre className="code-block">
{`{
  "version": 1,
  "knowledgeTree": [
    { "subject": "数学", "name": "函数", "parentId": null, "order": 0 },
    { "subject": "数学", "name": "导数", "parentId": null, "order": 1 },
    { "subject": "物理", "name": "力学", "parentId": null, "order": 0 }
  ]
}`}
        </pre>
      </div>
    </div>
  )
}
