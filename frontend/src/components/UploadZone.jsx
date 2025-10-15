import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Upload, Music, FileAudio, Loader2, Youtube, Link as LinkIcon } from 'lucide-react'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function UploadZone({ onUploadSuccess }) {
  const [activeTab, setActiveTab] = useState('file') // 'file' or 'youtube'
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState(null)
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const fileInputRef = useRef(null)

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFile(files[0])
    }
  }

  const handleFileSelect = (e) => {
    const files = e.target.files
    if (files.length > 0) {
      handleFile(files[0])
    }
  }

  const handleFile = async (file) => {
    setError(null)
    
    // Validate file type
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/flac', 'audio/ogg', 'audio/x-m4a']
    const allowedExtensions = ['.mp3', '.wav', '.flac', '.ogg', '.m4a']
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase()
    
    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
      setError('Formato de arquivo não suportado. Use MP3, WAV, FLAC, OGG ou M4A.')
      return
    }

    // Validate file size (50MB max)
    if (file.size > 50 * 1024 * 1024) {
      setError('Arquivo muito grande. Tamanho máximo: 50MB')
      return
    }

    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await axios.post(`${API_URL}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      onUploadSuccess(response.data.job_id)
    } catch (err) {
      console.error('Upload error:', err)
      setError(err.response?.data?.detail || 'Erro ao fazer upload do arquivo')
    } finally {
      setIsUploading(false)
    }
  }

  const handleYoutubeSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (!youtubeUrl.trim()) {
      setError('Por favor, insira uma URL do YouTube')
      return
    }

    // Basic YouTube URL validation
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/
    if (!youtubeRegex.test(youtubeUrl)) {
      setError('URL inválida. Use uma URL do YouTube válida (youtube.com ou youtu.be)')
      return
    }

    setIsUploading(true)

    try {
      const response = await axios.post(`${API_URL}/process-youtube`, {
        url: youtubeUrl
      })

      onUploadSuccess(response.data.job_id)
    } catch (err) {
      console.error('YouTube processing error:', err)
      setError(err.response?.data?.detail || 'Erro ao processar vídeo do YouTube')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-8"
      >
        <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
          Separe sua música em instrumentos individuais
        </h2>
        <p className="text-gray-400 text-lg">
          Faça upload de um arquivo ou cole uma URL do YouTube para separar voz, bateria, baixo e outros instrumentos
        </p>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => { setActiveTab('file'); setError(null); }}
          className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
            activeTab === 'file'
              ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/50'
              : 'bg-gray-800/50 text-gray-400 hover:bg-gray-800 hover:text-white'
          }`}
        >
          <Upload className="w-5 h-5" />
          <span>Upload de Arquivo</span>
        </button>
        <button
          onClick={() => { setActiveTab('youtube'); setError(null); }}
          className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
            activeTab === 'youtube'
              ? 'bg-gradient-to-r from-red-600 to-pink-600 text-white shadow-lg shadow-red-500/50'
              : 'bg-gray-800/50 text-gray-400 hover:bg-gray-800 hover:text-white'
          }`}
        >
          <Youtube className="w-5 h-5" />
          <span>URL do YouTube</span>
        </button>
      </div>

      {/* File Upload Tab */}
      {activeTab === 'file' && (
        <motion.div
          key="file-tab"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            relative border-2 border-dashed rounded-2xl p-12 transition-all duration-300
            ${isDragging 
              ? 'border-purple-500 bg-purple-500/10 scale-105' 
              : 'border-purple-900/50 bg-purple-900/10 hover:border-purple-700 hover:bg-purple-900/20'
            }
            ${isUploading ? 'pointer-events-none opacity-50' : ''}
          `}
          whileHover={{ scale: isUploading ? 1 : 1.02 }}
          whileTap={{ scale: isUploading ? 1 : 0.98 }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".mp3,.wav,.flac,.ogg,.m4a"
            onChange={handleFileSelect}
            className="hidden"
            disabled={isUploading}
          />

          <div className="text-center">
            {isUploading ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center"
              >
                <Loader2 className="w-16 h-16 text-purple-500 animate-spin mb-4" />
                <p className="text-xl text-purple-400 font-semibold">Enviando arquivo...</p>
              </motion.div>
            ) : (
              <>
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="mb-6"
                >
                  <Upload className="w-16 h-16 text-purple-500 mx-auto" />
                </motion.div>

                <h3 className="text-2xl font-bold mb-2 text-white">
                  Arraste seu arquivo aqui
                </h3>
                <p className="text-gray-400 mb-6">
                  ou clique para selecionar
                </p>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-lg font-semibold transition-all duration-300 shadow-lg hover:shadow-purple-500/50"
                >
                  Selecionar Arquivo
                </button>

                <div className="mt-8 flex items-center justify-center space-x-6 text-sm text-gray-500">
                  <div className="flex items-center space-x-2">
                    <FileAudio className="w-4 h-4" />
                    <span>MP3, WAV, FLAC</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Music className="w-4 h-4" />
                    <span>Máx. 50MB</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </motion.div>
      )}

      {/* YouTube URL Tab */}
      {activeTab === 'youtube' && (
        <motion.div
          key="youtube-tab"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className={`
            relative border-2 border-dashed rounded-2xl p-12 transition-all duration-300
            border-red-900/50 bg-red-900/10 hover:border-red-700 hover:bg-red-900/20
            ${isUploading ? 'pointer-events-none opacity-50' : ''}
          `}
        >
          <div className="text-center">
            {isUploading ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center"
              >
                <Loader2 className="w-16 h-16 text-red-500 animate-spin mb-4" />
                <p className="text-xl text-red-400 font-semibold">Processando vídeo do YouTube...</p>
                <p className="text-sm text-gray-500 mt-2">Isso pode levar alguns minutos</p>
              </motion.div>
            ) : (
              <>
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="mb-6"
                >
                  <Youtube className="w-16 h-16 text-red-500 mx-auto" />
                </motion.div>

                <h3 className="text-2xl font-bold mb-2 text-white">
                  Cole a URL do YouTube
                </h3>
                <p className="text-gray-400 mb-6">
                  Suporta vídeos e playlists do YouTube
                </p>

                <form onSubmit={handleYoutubeSubmit} className="max-w-xl mx-auto">
                  <div className="flex gap-3">
                    <div className="flex-1 relative">
                      <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                      <input
                        type="text"
                        value={youtubeUrl}
                        onChange={(e) => setYoutubeUrl(e.target.value)}
                        placeholder="https://youtube.com/watch?v=..."
                        className="w-full pl-12 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!youtubeUrl.trim() || isUploading}
                      className="px-8 py-3 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 rounded-lg font-semibold transition-all duration-300 shadow-lg hover:shadow-red-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Processar
                    </button>
                  </div>
                </form>

                <div className="mt-8 flex items-center justify-center space-x-6 text-sm text-gray-500">
                  <div className="flex items-center space-x-2">
                    <Youtube className="w-4 h-4" />
                    <span>YouTube</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Music className="w-4 h-4" />
                    <span>Vídeos até 10min</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </motion.div>
      )}

      {error && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-4 bg-red-900/20 border border-red-500/50 rounded-lg text-red-400 text-center"
        >
          {error}
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        {[
          { icon: '🎤', label: 'Voz', color: 'from-pink-500 to-rose-500' },
          { icon: '🥁', label: 'Bateria', color: 'from-orange-500 to-red-500' },
          { icon: '🎸', label: 'Baixo', color: 'from-blue-500 to-cyan-500' },
          { icon: '🎹', label: 'Outros', color: 'from-purple-500 to-violet-500' },
        ].map((item, index) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 + index * 0.1 }}
            className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 rounded-lg p-4 text-center border border-purple-800/30"
          >
            <div className="text-3xl mb-2">{item.icon}</div>
            <div className={`text-sm font-semibold bg-gradient-to-r ${item.color} bg-clip-text text-transparent`}>
              {item.label}
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}

export default UploadZone

