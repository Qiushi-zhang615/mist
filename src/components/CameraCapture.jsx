import { useState, useRef, useCallback } from 'react'
import { Camera, ImagePlus, X, RotateCw, Sun, Contrast } from 'lucide-react'
import { fileToBase64, compressImage, rotateImage, adjustImage } from '../utils/imageUtils'

/**
 * mist 拍照/图片上传组件
 * 支持摄像头拍照、相册选择、简单编辑
 */
export default function CameraCapture({ onCapture, onCancel }) {
  const [image, setImage] = useState(null)
  const [originalImage, setOriginalImage] = useState(null)
  const [brightness, setBrightness] = useState(0)
  const [contrast, setContrast] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const fileInputRef = useRef(null)
  const videoRef = useRef(null)
  const [showCamera, setShowCamera] = useState(false)
  const [stream, setStream] = useState(null)

  // 处理文件选择
  const handleFileSelect = useCallback(async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setIsProcessing(true)
    try {
      const base64 = await fileToBase64(file)
      const compressed = await compressImage(base64, { maxWidth: 1600, maxHeight: 2000, quality: 0.9 })
      setOriginalImage(compressed)
      setImage(compressed)
    } catch (err) {
      alert('图片处理失败: ' + err.message)
    } finally {
      setIsProcessing(false)
    }
  }, [])

  // 启动摄像头
  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
      })
      setStream(mediaStream)
      setShowCamera(true)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
    } catch (err) {
      alert('无法启动摄像头: ' + err.message)
    }
  }, [])

  // 停止摄像头
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
    setShowCamera(false)
  }, [stream])

  // 拍照
  const takePhoto = useCallback(() => {
    if (!videoRef.current) return
    
    const video = videoRef.current
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0)
    
    const base64 = canvas.toDataURL('image/jpeg', 0.9).split(',')[1]
    setOriginalImage(base64)
    setImage(base64)
    stopCamera()
  }, [stopCamera])

  // 旋转图片
  const handleRotate = useCallback(async () => {
    if (!image) return
    setIsProcessing(true)
    try {
      const rotated = await rotateImage(image, 90)
      setImage(rotated)
    } catch (err) {
      console.error('旋转失败:', err)
    } finally {
      setIsProcessing(false)
    }
  }, [image])

  // 调整亮度/对比度
  const handleAdjust = useCallback(async () => {
    if (!originalImage) return
    setIsProcessing(true)
    try {
      const adjusted = await adjustImage(originalImage, { brightness, contrast })
      setImage(adjusted)
    } catch (err) {
      console.error('调整失败:', err)
    } finally {
      setIsProcessing(false)
    }
  }, [originalImage, brightness, contrast])

  // 确认提交
  const handleConfirm = useCallback(() => {
    if (image) {
      onCapture(image)
    }
  }, [image, onCapture])

  // 重置编辑
  const handleReset = useCallback(() => {
    setImage(originalImage)
    setBrightness(0)
    setContrast(0)
  }, [originalImage])

  if (showCamera) {
    return (
      <div className="camera-overlay">
        <div className="camera-container">
          <video ref={videoRef} autoPlay playsInline className="camera-video" />
          <div className="camera-controls">
            <button className="mist-btn mist-btn-secondary" onClick={stopCamera}>
              <X size={20} /> 取消
            </button>
            <button className="mist-btn mist-btn-lg" onClick={takePhoto}>
              <Camera size={24} /> 拍照
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (image) {
    return (
      <div className="mist-fade-in">
        <div className="editor-preview">
          <img 
            src={`data:image/jpeg;base64,${image}`} 
            alt="预览" 
            className="editor-image"
          />
          {isProcessing && (
            <div className="editor-processing">
              <div className="mist-loading-spinner" />
              <span>处理中...</span>
            </div>
          )}
        </div>
        
        <div className="editor-tools">
          <div className="editor-tool-group">
            <button className="mist-btn mist-btn-sm mist-btn-secondary" onClick={handleRotate}>
              <RotateCw size={16} /> 旋转
            </button>
            <button className="mist-btn mist-btn-sm mist-btn-secondary" onClick={handleReset}>
              重置
            </button>
          </div>
          
          <div className="editor-adjustments">
            <div className="adjustment-item">
              <Sun size={16} />
              <label>亮度</label>
              <input 
                type="range" 
                min="-50" 
                max="50" 
                value={brightness}
                onChange={(e) => setBrightness(Number(e.target.value))}
                onMouseUp={handleAdjust}
                onTouchEnd={handleAdjust}
              />
              <span>{brightness}</span>
            </div>
            <div className="adjustment-item">
              <Contrast size={16} />
              <label>对比度</label>
              <input 
                type="range" 
                min="-50" 
                max="50" 
                value={contrast}
                onChange={(e) => setContrast(Number(e.target.value))}
                onMouseUp={handleAdjust}
                onTouchEnd={handleAdjust}
              />
              <span>{contrast}</span>
            </div>
          </div>
        </div>
        
        <div className="editor-actions">
          <button className="mist-btn mist-btn-secondary" onClick={onCancel}>
            取消
          </button>
          <button className="mist-btn" onClick={handleConfirm} disabled={isProcessing}>
            确认使用
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="capture-options mist-fade-in">
      <div className="capture-grid">
        <button className="capture-card" onClick={startCamera}>
          <Camera size={32} />
          <span>拍照</span>
        </button>
        <button 
          className="capture-card" 
          onClick={() => fileInputRef.current?.click()}
        >
          <ImagePlus size={32} />
          <span>从相册选择</span>
        </button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      {isProcessing && (
        <div className="mist-loading" style={{ marginTop: 24 }}>
          <div className="mist-loading-spinner" />
          <span>处理图片...</span>
        </div>
      )}
    </div>
  )
}
