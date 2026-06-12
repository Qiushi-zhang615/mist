/**
 * mist 图片处理工具
 */

/**
 * 将 File/Blob 转为 base64
 */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * 压缩图片
 * @param {string} base64 - 原始 base64
 * @param {Object} options - 配置
 * @returns {Promise<string>} 压缩后的 base64
 */
export function compressImage(base64, options = {}) {
  const { maxWidth = 1200, maxHeight = 1600, quality = 0.85 } = options
  
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      let { width, height } = img
      
      // 计算缩放比例
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height)
        width *= ratio
        height *= ratio
      }
      
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)
      
      resolve(canvas.toDataURL('image/jpeg', quality).split(',')[1])
    }
    img.onerror = reject
    img.src = `data:image/jpeg;base64,${base64}`
  })
}

/**
 * 旋转图片
 * @param {string} base64 
 * @param {number} degrees - 旋转角度（90, 180, 270）
 */
export function rotateImage(base64, degrees) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      if (degrees === 90 || degrees === 270) {
        canvas.width = img.height
        canvas.height = img.width
      } else {
        canvas.width = img.width
        canvas.height = img.height
      }
      
      ctx.translate(canvas.width / 2, canvas.height / 2)
      ctx.rotate((degrees * Math.PI) / 180)
      ctx.drawImage(img, -img.width / 2, -img.height / 2)
      
      resolve(canvas.toDataURL('image/jpeg', 0.9).split(',')[1])
    }
    img.onerror = reject
    img.src = `data:image/jpeg;base64,${base64}`
  })
}

/**
 * 调整亮度/对比度
 * @param {string} base64
 * @param {Object} adjustments - { brightness: 0, contrast: 0 }
 */
export function adjustImage(base64, adjustments = {}) {
  const { brightness = 0, contrast = 0 } = adjustments
  
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      
      const ctx = canvas.getContext('2d')
      
      // 应用滤镜
      const filters = []
      if (brightness !== 0) filters.push(`brightness(${100 + brightness}%)`)
      if (contrast !== 0) filters.push(`contrast(${100 + contrast}%)`)
      
      if (filters.length > 0) {
        ctx.filter = filters.join(' ')
      }
      
      ctx.drawImage(img, 0, 0)
      resolve(canvas.toDataURL('image/jpeg', 0.9).split(',')[1])
    }
    img.onerror = reject
    img.src = `data:image/jpeg;base64,${base64}`
  })
}

/**
 * 裁剪图片
 * @param {string} base64
 * @param {Object} crop - { x, y, width, height } (相对坐标 0-1)
 */
export function cropImage(base64, crop) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      const sx = crop.x * img.width
      const sy = crop.y * img.height
      const sw = crop.width * img.width
      const sh = crop.height * img.height
      
      canvas.width = sw
      canvas.height = sh
      
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh)
      
      resolve(canvas.toDataURL('image/jpeg', 0.9).split(',')[1])
    }
    img.onerror = reject
    img.src = `data:image/jpeg;base64,${base64}`
  })
}

/**
 * 将 base64 转为 Blob
 */
export function base64ToBlob(base64, type = 'image/jpeg') {
  const byteCharacters = atob(base64)
  const byteNumbers = new Array(byteCharacters.length)
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i)
  }
  const byteArray = new Uint8Array(byteNumbers)
  return new Blob([byteArray], { type })
}

/**
 * 下载 base64 图片
 */
export function downloadBase64(base64, filename = 'image.jpg') {
  const blob = base64ToBlob(base64)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
