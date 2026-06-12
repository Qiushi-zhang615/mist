/**
 * mist AI 识别服务
 * 支持国产 AI 多模态模型（通义千问、文心一言等）
 * 用户自行配置 API Key
 */

const AI_PROVIDERS = {
  qwen: {
    name: '通义千问',
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen-vl-plus',
    apiKeyHeader: 'Authorization',
    apiKeyPrefix: 'Bearer '
  },
  wenxin: {
    name: '文心一言',
    baseURL: 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1',
    model: 'ernie-bot-vision',
    apiKeyHeader: 'Authorization',
    apiKeyPrefix: 'Bearer '
  },
  spark: {
    name: '讯飞星火',
    baseURL: 'https://spark-api-open.xf-yun.com/v1',
    model: 'generalv3.5',
    apiKeyHeader: 'Authorization',
    apiKeyPrefix: 'Bearer '
  },
  glm: {
    name: '智谱清言',
    baseURL: 'https://open.bigmodel.cn/api/paas/v4',
    model: 'glm-4v',
    apiKeyHeader: 'Authorization',
    apiKeyPrefix: 'Bearer '
  }
}

/**
 * 获取当前 AI 配置
 */
export function getAIConfig() {
  const config = localStorage.getItem('mist_ai_config')
  if (!config) return null
  try {
    return JSON.parse(config)
  } catch {
    return null
  }
}

/**
 * 保存 AI 配置
 */
export function saveAIConfig(provider, apiKey, customBaseURL, customEndpoint) {
  const config = {
    provider,
    apiKey,
    customBaseURL,
    customEndpoint,
    updatedAt: new Date().toISOString()
  }
  localStorage.setItem('mist_ai_config', JSON.stringify(config))
}

/**
 * 构建 AI 请求体
 */
function buildRequestBody(provider, base64Image, prompt) {
  const systemPrompt = `你是一个专业的教育 AI 助手，擅长分析数理化错题。
请仔细分析图片中的题目，并按以下 JSON 格式返回结果（不要包含 markdown 代码块标记）：

{
  "title": "题目简短标题",
  "subject": "学科（数学/物理/化学之一）",
  "knowledgePoint": "知识点",
  "difficulty": 难度等级(1-5),
  "content": {
    "html": "题目内容的 HTML 格式，支持 <p>, <div>, <img>, <table> 等标签。数学公式使用 $...$ 或 $$...$$ 包裹（LaTeX 格式）",
    "text": "题目纯文本"
  },
  "answer": {
    "html": "答案的 HTML 格式",
    "text": "答案纯文本"
  },
  "analysis": {
    "html": "解析的 HTML 格式",
    "text": "解析纯文本"
  },
  "errorReason": "常见错误原因分析",
  "images": [
    {
      "description": "图片内容描述",
      "region": "图片区域说明（如：题目配图/解题过程图）"
    }
  ]
}

注意：
1. 如果图片包含多个题目，请只分析最清晰完整的那一道
2. HTML 内容应简洁，不要包含多余样式
3. 公式必须用 LaTeX 格式，用 $ 包裹行内公式，$$ 包裹块级公式
4. 如果图片中有无法用文字描述的图形，在 images 中描述其内容
5. 必须返回合法的 JSON，不要添加任何其他文字`

  switch (provider) {
    case 'qwen':
      return {
        model: AI_PROVIDERS.qwen.model,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt || '请分析这道错题' },
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
            ]
          }
        ]
      }
    case 'wenxin':
      return {
        messages: [
          { role: 'user', content: `${systemPrompt}\n\n${prompt || '请分析这道错题'}\n![image](data:image/jpeg;base64,${base64Image})` }
        ]
      }
    case 'spark':
    case 'glm':
    default:
      return {
        model: AI_PROVIDERS[provider]?.model || 'gpt-4-vision-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt || '请分析这道错题' },
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
            ]
          }
        ]
      }
  }
}

/**
 * 非流式识别错题图片（兼容性更好）
 * @param {string} base64Image - base64 编码的图片
 * @param {string} prompt - 可选的额外提示
 * @returns {Promise<Object>}
 */
export async function recognizeMistake(base64Image, prompt = '') {
  const config = getAIConfig()
  if (!config) {
    throw new Error('请先配置 AI API Key')
  }

  const provider = AI_PROVIDERS[config.provider]
  if (!provider) {
    throw new Error('未知的 AI 提供商')
  }

  const baseURL = config.customBaseURL || provider.baseURL
  const apiKey = config.apiKey

  const requestBody = buildRequestBody(config.provider, base64Image, prompt)

  let endpoint
  switch (config.provider) {
    case 'qwen':
      endpoint = `${baseURL}/chat/completions`
      break
    case 'wenxin':
      endpoint = `${baseURL}/wenxinworkshop/chat/${provider.model}`
      break
    case 'spark':
      endpoint = `${baseURL}/chat/completions`
      break
    case 'glm':
      endpoint = `${baseURL}/chat/completions`
      break
    default:
      endpoint = `${baseURL}/chat/completions`
  }

  if (config.customEndpoint) {
    endpoint = config.customEndpoint
  }

  const headers = {
    'Content-Type': 'application/json'
  }
  headers[provider.apiKeyHeader] = `${provider.apiKeyPrefix}${apiKey}`

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`API 请求失败: ${response.status} - ${error}`)
    }

    const data = await response.json()

    // 提取响应文本
    let responseText = ''
    if (data.output?.choices?.[0]?.message?.content) {
      // 通义千问格式
      responseText = data.output.choices[0].message.content
    } else if (data.choices?.[0]?.message?.content) {
      // OpenAI 兼容格式
      responseText = data.choices[0].message.content
    } else if (data.result) {
      // 文心一言格式
      responseText = data.result
    }

    const result = parseAIResponse(responseText)

    return {
      title: result.title || '未命名错题',
      subject: result.subject || '数学',
      knowledgePoint: result.knowledgePoint || '未分类',
      difficulty: Math.min(5, Math.max(1, result.difficulty || 3)),
      content: result.content || { html: '', text: '' },
      answer: result.answer || { html: '', text: '' },
      analysis: result.analysis || { html: '', text: '' },
      errorReason: result.errorReason || '',
      images: result.images || [],
      raw: responseText
    }
  } catch (error) {
    if (error.message.includes('CORS') || error.message.includes('Failed to fetch')) {
      throw new Error('请求被拦截，可能是 CORS 问题。建议搭建中转服务，或检查 API Key 是否正确。')
    }
    throw error
  }
}

/**
 * 流式识别错题图片
 * @param {string} base64Image - base64 编码的图片
 * @param {string} prompt - 可选的额外提示
 * @param {Function} onChunk - 流式回调函数
 * @returns {Promise<Object>}
 */
export async function recognizeMistakeStream(base64Image, prompt = '', onChunk) {
  const config = getAIConfig()
  if (!config) {
    throw new Error('请先配置 AI API Key')
  }

  const provider = AI_PROVIDERS[config.provider]
  if (!provider) {
    throw new Error('未知的 AI 提供商')
  }

  const baseURL = config.customBaseURL || provider.baseURL
  const apiKey = config.apiKey

  const requestBody = {
    ...buildRequestBody(config.provider, base64Image, prompt),
    stream: true
  }

  let endpoint
  switch (config.provider) {
    case 'qwen':
      endpoint = `${baseURL}/chat/completions`
      break
    case 'wenxin':
      endpoint = `${baseURL}/wenxinworkshop/chat/${provider.model}`
      break
    case 'spark':
      endpoint = `${baseURL}/chat/completions`
      break
    case 'glm':
      endpoint = `${baseURL}/chat/completions`
      break
    default:
      endpoint = `${baseURL}/chat/completions`
  }

  if (config.customEndpoint) {
    endpoint = config.customEndpoint
  }

  const headers = {
    'Content-Type': 'application/json'
  }
  headers[provider.apiKeyHeader] = `${provider.apiKeyPrefix}${apiKey}`

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`API 请求失败: ${response.status} - ${error}`)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let fullText = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value, { stream: true })
      const lines = chunk.split('\n')

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') continue

          try {
            const parsed = JSON.parse(data)
            const content = parsed.choices?.[0]?.delta?.content || ''
            if (content) {
              fullText += content
              if (onChunk) onChunk(content, fullText)
            }
          } catch {
            // 忽略解析错误
          }
        }
      }
    }

    const result = parseAIResponse(fullText)

    return {
      title: result.title || '未命名错题',
      subject: result.subject || '数学',
      knowledgePoint: result.knowledgePoint || '未分类',
      difficulty: Math.min(5, Math.max(1, result.difficulty || 3)),
      content: result.content || { html: '', text: '' },
      answer: result.answer || { html: '', text: '' },
      analysis: result.analysis || { html: '', text: '' },
      errorReason: result.errorReason || '',
      images: result.images || [],
      raw: fullText
    }
  } catch (error) {
    if (error.message.includes('CORS') || error.message.includes('Failed to fetch')) {
      throw new Error('请求被拦截，可能是 CORS 问题。建议搭建中转服务，或检查 API Key 是否正确。')
    }
    throw error
  }
}

/**
 * 解析 AI 响应
 */
function parseAIResponse(responseText) {
  try {
    // 尝试直接解析 JSON
    return JSON.parse(responseText)
  } catch {
    // 尝试从 markdown 代码块中提取
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1].trim())
      } catch {
        // 忽略
      }
    }

    // 尝试从文本中提取 JSON 对象
    const objMatch = responseText.match(/\{[\s\S]*\}/)
    if (objMatch) {
      try {
        return JSON.parse(objMatch[0])
      } catch {
        // 忽略
      }
    }

    throw new Error('无法解析 AI 响应')
  }
}

/**
 * 获取支持的 AI 提供商列表
 */
export function getAIProviders() {
  return Object.entries(AI_PROVIDERS).map(([key, value]) => ({
    key,
    name: value.name,
    baseURL: value.baseURL
  }))
}
