/**
 * mist LaTeX 渲染工具
 * 使用 KaTeX 渲染数学公式
 */

import katex from 'katex'

/**
 * 渲染包含 LaTeX 的 HTML 内容
 * 将 $...$ 和 $$...$$ 替换为渲染后的 HTML
 * @param {string} html - 包含 LaTeX 的 HTML 字符串
 * @returns {string} 渲染后的 HTML
 */
export function renderLatexInHTML(html) {
  if (!html) return ''
  
  let result = html
  
  // 渲染块级公式 $$...$$
  result = result.replace(/\$\$([\s\S]*?)\$\$/g, (match, latex) => {
    try {
      return katex.renderToString(latex.trim(), {
        displayMode: true,
        throwOnError: false,
        strict: false
      })
    } catch (e) {
      console.warn('KaTeX render error:', e)
      return match
    }
  })
  
  // 渲染行内公式 $...$，但要排除已经被渲染的块级公式
  // 使用一个临时占位符来避免重复匹配
  const placeholder = '\u0000BLOCK\u0000'
  const blocks = []
  result = result.replace(/<span class="katex-display">[\s\S]*?<\/span>/g, (match) => {
    blocks.push(match)
    return placeholder + (blocks.length - 1) + placeholder
  })
  
  result = result.replace(/\$([\s\S]*?)\$/g, (match, latex) => {
    try {
      return katex.renderToString(latex.trim(), {
        displayMode: false,
        throwOnError: false,
        strict: false
      })
    } catch (e) {
      console.warn('KaTeX render error:', e)
      return match
    }
  })
  
  // 恢复占位符
  blocks.forEach((block, i) => {
    result = result.replace(placeholder + i + placeholder, block)
  })
  
  return result
}

/**
 * 判断文本是否包含 LaTeX 公式
 * @param {string} text 
 * @returns {boolean}
 */
export function hasLatex(text) {
  if (!text) return false
  return /\$\$?[\s\S]*?\$\$?/.test(text)
}

/**
 * 渲染纯 LaTeX 字符串
 * @param {string} latex 
 * @param {boolean} displayMode 
 */
export function renderLatex(latex, displayMode = false) {
  try {
    return katex.renderToString(latex, {
      displayMode,
      throwOnError: false,
      strict: false
    })
  } catch (e) {
    console.warn('KaTeX render error:', e)
    return latex
  }
}

/**
 * 创建安全的 HTML 内容
 * 防止 XSS，只允许特定标签
 */
export function sanitizeHTML(html) {
  if (!html) return ''
  
  const allowedTags = ['p', 'div', 'span', 'br', 'hr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'sub', 'sup', 'code', 'pre', 'blockquote', 'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'img']
  const allowedAttrs = ['src', 'alt', 'title', 'class', 'style']
  
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  
  function cleanNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent
    }
    
    if (node.nodeType === Node.ELEMENT_NODE) {
      const tag = node.tagName.toLowerCase()
      if (!allowedTags.includes(tag)) {
        return Array.from(node.childNodes).map(cleanNode).join('')
      }
      
      let attrs = ''
      for (const attr of node.attributes) {
        if (allowedAttrs.includes(attr.name.toLowerCase())) {
          attrs += ` ${attr.name}="${attr.value.replace(/"/g, '&quot;')}"`
        }
      }
      
      const children = Array.from(node.childNodes).map(cleanNode).join('')
      return `<${tag}${attrs}>${children}</${tag}>`
    }
    
    return ''
  }
  
  return Array.from(doc.body.childNodes).map(cleanNode).join('')
}
