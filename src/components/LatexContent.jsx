import { useEffect, useRef } from 'react'
import { renderLatexInHTML, sanitizeHTML } from '../utils/latexRender'

/**
 * mist LaTeX 内容渲染组件
 * 安全渲染包含 LaTeX 公式的 HTML 内容
 */
export default function LatexContent({ html, className = '' }) {
  const containerRef = useRef(null)

  useEffect(() => {
    if (containerRef.current && html) {
      const safeHTML = sanitizeHTML(html)
      const rendered = renderLatexInHTML(safeHTML)
      containerRef.current.innerHTML = rendered
    }
  }, [html])

  if (!html) return null

  return (
    <div 
      ref={containerRef}
      className={`latex-content ${className}`}
    />
  )
}
