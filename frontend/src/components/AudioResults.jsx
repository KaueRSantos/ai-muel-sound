import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Play, Pause, Download, Volume2, VolumeX, RotateCcw, SkipForward, SkipBack, Clock } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function AudioResults({ jobData, onNewUpload }) {
  const [playingTracks, setPlayingTracks] = useState({})
  const audioRefs = useRef({})
  const [volumes, setVolumes] = useState({
    voz: 1.0,
    baixo: 1.0,
    bateria: 1.0,
    guitarra: 1.0,
    teclado: 1.0,
    outros: 1.0
  })
  const [muted, setMuted] = useState({
    voz: false,
    baixo: false,
    bateria: false,
    guitarra: false,
    teclado: false,
    outros: false
  })
  const [timeOffsets, setTimeOffsets] = useState({
    voz: 0,
    baixo: 0,
    bateria: 0,
    guitarra: 0,
    teclado: 0,
    outros: 0
  })
  const [currentTimes, setCurrentTimes] = useState({})
  const [durations, setDurations] = useState({})
  const animationFrameRef = useRef(null)

  const tracks = [
    { key: 'voz', name: 'Voz', color: 'from-pink-500 to-rose-500' },
    { key: 'baixo', name: 'Baixo', color: 'from-blue-500 to-cyan-500' },
    { key: 'bateria', name: 'Bateria', color: 'from-yellow-500 to-orange-500' },
    { key: 'guitarra', name: 'Guitarra', color: 'from-orange-500 to-red-500' },
    { key: 'teclado', name: 'Teclado', color: 'from-purple-500 to-indigo-500' },
    { key: 'outros', name: 'Outros', color: 'from-green-500 to-emerald-500' }
  ]

  // Atualizar tempos em tempo real
  useEffect(() => {
    const updateTimes = () => {
      const times = {}
      Object.entries(audioRefs.current).forEach(([key, audio]) => {
        if (audio) {
          times[key] = audio.currentTime
        }
      })
      setCurrentTimes(times)
      
      if (Object.values(playingTracks).some(isPlaying => isPlaying)) {
        animationFrameRef.current = requestAnimationFrame(updateTimes)
      }
    }

    if (Object.values(playingTracks).some(isPlaying => isPlaying)) {
      animationFrameRef.current = requestAnimationFrame(updateTimes)
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [playingTracks])

  // Inicializar elementos de áudio
  useEffect(() => {
    if (!jobData.stems) return

    tracks.forEach((track) => {
      if (jobData.stems[track.key] && !audioRefs.current[track.key]) {
        const streamUrl = `${API_URL}${jobData.stems[track.key].stream}`
        const audio = new Audio(streamUrl)
        audio.volume = volumes[track.key]
        
        audio.onloadedmetadata = () => {
          setDurations(prev => ({ ...prev, [track.key]: audio.duration }))
        }
        
        audio.onended = () => {
          setPlayingTracks(prev => ({ ...prev, [track.key]: false }))
        }
        
        audioRefs.current[track.key] = audio
      }
    })

    // Cleanup
    return () => {
      Object.values(audioRefs.current).forEach(audio => {
        if (audio) {
          audio.pause()
          audio.src = ''
        }
      })
      audioRefs.current = {}
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [jobData])

  const handlePlayPause = (trackKey) => {
    if (!jobData.stems || !jobData.stems[trackKey]) return

    const audio = audioRefs.current[trackKey]
    if (!audio) return

    if (playingTracks[trackKey]) {
      // Pausar esta faixa
      audio.pause()
      setPlayingTracks(prev => ({ ...prev, [trackKey]: false }))
    } else {
      // Reproduzir esta faixa
      // Sincronizar com outras faixas tocando, considerando offsets
      const otherPlayingTracks = Object.entries(playingTracks).filter(([key, isPlaying]) => isPlaying && key !== trackKey)
      
      if (otherPlayingTracks.length > 0) {
        // Sincronizar tempo com a primeira faixa tocando, ajustando pelos offsets
        const firstPlayingKey = otherPlayingTracks[0][0]
        const firstPlayingAudio = audioRefs.current[firstPlayingKey]
        if (firstPlayingAudio) {
          // Calcular o tempo base (sem offset) da primeira faixa tocando
          const baseTime = firstPlayingAudio.currentTime - timeOffsets[firstPlayingKey]
          // Aplicar o offset da faixa atual
          const newTime = baseTime + timeOffsets[trackKey]
          audio.currentTime = Math.max(0, Math.min(newTime, audio.duration))
        }
      }
      
      audio.play()
      setPlayingTracks(prev => ({ ...prev, [trackKey]: true }))
    }
  }

  const handleVolumeChange = (trackKey, volume) => {
    setVolumes(prev => ({ ...prev, [trackKey]: volume }))
    if (audioRefs.current[trackKey] && !muted[trackKey]) {
      audioRefs.current[trackKey].volume = volume
    }
  }

  const handleMute = (trackKey) => {
    const newMuted = !muted[trackKey]
    setMuted(prev => ({ ...prev, [trackKey]: newMuted }))
    if (audioRefs.current[trackKey]) {
      audioRefs.current[trackKey].volume = newMuted ? 0 : volumes[trackKey]
    }
  }

  const handleOffsetChange = (trackKey, offset) => {
    const newOffset = parseFloat(offset)
    setTimeOffsets(prev => ({ ...prev, [trackKey]: newOffset }))
    
    // Se a faixa está tocando, ajustar o tempo atual
    const audio = audioRefs.current[trackKey]
    if (audio && playingTracks[trackKey]) {
      // Calcular o tempo base da primeira faixa tocando
      const otherPlayingTracks = Object.entries(playingTracks).filter(([key, isPlaying]) => isPlaying && key !== trackKey)
      if (otherPlayingTracks.length > 0) {
        const firstPlayingKey = otherPlayingTracks[0][0]
        const firstPlayingAudio = audioRefs.current[firstPlayingKey]
        if (firstPlayingAudio) {
          const baseTime = firstPlayingAudio.currentTime - timeOffsets[firstPlayingKey]
          const newTime = baseTime + newOffset
          audio.currentTime = Math.max(0, Math.min(newTime, audio.duration))
        }
      }
    }
  }

  const handleSeek = (trackKey, time) => {
    const audio = audioRefs.current[trackKey]
    if (audio) {
      audio.currentTime = Math.max(0, Math.min(time, audio.duration))
      
      // Se outras faixas estão tocando, ajustá-las também
      if (playingTracks[trackKey]) {
        const baseTime = time - timeOffsets[trackKey]
        Object.entries(playingTracks).forEach(([key, isPlaying]) => {
          if (isPlaying && key !== trackKey) {
            const otherAudio = audioRefs.current[key]
            if (otherAudio) {
              const newTime = baseTime + timeOffsets[key]
              otherAudio.currentTime = Math.max(0, Math.min(newTime, otherAudio.duration))
            }
          }
        })
      }
    }
  }

  const handleDownload = (trackKey) => {
    if (!jobData.stems || !jobData.stems[trackKey]) return
    
    const downloadUrl = `${API_URL}${jobData.stems[trackKey].wav}`
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = `${trackKey}.wav`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleNewUpload = () => {
    // Parar todos os áudios
    Object.values(audioRefs.current).forEach(audio => {
      if (audio) audio.pause()
    })
    setPlayingTracks({})
    onNewUpload()
  }

  return (
    <div className="max-w-6xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 rounded-2xl p-8 border border-purple-800/30"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 15 }}
            className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <Volume2 className="w-8 h-8 text-white" />
          </motion.div>
          
          <h2 className="text-3xl font-bold mb-2 text-white">
            Separação Concluída!
          </h2>
          <p className="text-gray-400 text-lg">
            Reproduza múltiplas faixas simultaneamente para criar sua mixagem personalizada
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {tracks.map((track, index) => (
            <motion.div
              key={track.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${track.color} ${playingTracks[track.key] ? 'animate-pulse' : ''}`} />
                  <h3 className="text-xl font-semibold text-white">{track.name}</h3>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handlePlayPause(track.key)}
                    className={`p-3 rounded-full transition-all duration-200 ${
                      playingTracks[track.key]
                        ? 'bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-500/50'
                        : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    }`}
                  >
                    {playingTracks[track.key] ? (
                      <Pause className="w-5 h-5" />
                    ) : (
                      <Play className="w-5 h-5" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDownload(track.key)}
                    className="p-3 bg-gray-700 hover:bg-gray-600 rounded-full transition-colors text-gray-300"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {/* Barra de Progresso / Seek */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>{formatTime(currentTimes[track.key] || 0)}</span>
                    <span>{formatTime(durations[track.key] || 0)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={durations[track.key] || 100}
                    step="0.1"
                    value={currentTimes[track.key] || 0}
                    onChange={(e) => handleSeek(track.key, parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer progress-slider"
                  />
                </div>

                {/* Controle de Offset de Tempo */}
                <div className="bg-gray-900/50 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-blue-400" />
                      <span className="text-xs text-gray-400">Offset:</span>
                    </div>
                    <span className={`text-xs font-mono ${
                      timeOffsets[track.key] > 0 ? 'text-green-400' : 
                      timeOffsets[track.key] < 0 ? 'text-red-400' : 'text-gray-400'
                    }`}>
                      {timeOffsets[track.key] > 0 ? '+' : ''}{timeOffsets[track.key].toFixed(2)}s
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleOffsetChange(track.key, timeOffsets[track.key] - 0.5)}
                      className="p-1.5 bg-gray-800 hover:bg-gray-700 rounded transition-colors"
                      title="Atrasar 0.5s"
                    >
                      <SkipBack className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="number"
                      value={timeOffsets[track.key]}
                      onChange={(e) => handleOffsetChange(track.key, e.target.value)}
                      step="0.1"
                      className="flex-1 px-2 py-1 bg-gray-800 text-white text-xs rounded border border-gray-700 focus:border-purple-500 focus:outline-none text-center"
                    />
                    <button
                      onClick={() => handleOffsetChange(track.key, timeOffsets[track.key] + 0.5)}
                      className="p-1.5 bg-gray-800 hover:bg-gray-700 rounded transition-colors"
                      title="Adiantar 0.5s"
                    >
                      <SkipForward className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleOffsetChange(track.key, 0)}
                      className="px-2 py-1 bg-purple-900/50 hover:bg-purple-800/50 rounded text-xs transition-colors"
                      title="Resetar offset"
                    >
                      0
                    </button>
                  </div>
                </div>

                {/* Controle de Volume */}
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => handleMute(track.key)}
                    className="p-2 hover:bg-gray-700/50 rounded transition-colors"
                  >
                    {muted[track.key] ? (
                      <VolumeX className="w-4 h-4 text-red-400" />
                    ) : (
                      <Volume2 className="w-4 h-4 text-purple-400" />
                    )}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volumes[track.key]}
                    onChange={(e) => handleVolumeChange(track.key, parseFloat(e.target.value))}
                    className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <span className="text-sm text-gray-400 w-8">
                    {Math.round(volumes[track.key] * 100)}%
                  </span>
                </div>

                <div className="text-xs text-gray-400">
                  {jobData.stems && jobData.stems[track.key] ? (
                    <span className="text-green-400">✓ Faixa disponível</span>
                  ) : (
                    <span className="text-red-400">✗ Faixa não disponível</span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={handleNewUpload}
            className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-lg font-semibold text-white transition-all duration-200 flex items-center justify-center space-x-2"
          >
            <RotateCcw className="w-5 h-5" />
            <span>Nova Separação</span>
          </button>
        </div>

        <div className="mt-8 text-center text-sm text-gray-500 space-y-2">
          <p>💡 <strong>Dica:</strong> Reproduza múltiplas faixas simultaneamente e ajuste os offsets de tempo para sincronizar perfeitamente</p>
          <p>🎵 <strong>Offset:</strong> Use +/- para adiantar ou atrasar cada faixa individualmente (ex: +2s na voz, -1.5s na bateria)</p>
          <p>⏱️ <strong>Seek:</strong> Arraste a barra de progresso de qualquer faixa para navegar no tempo - todas as outras se sincronizam!</p>
        </div>
      </motion.div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #8b5cf6;
          cursor: pointer;
          border: 2px solid #1f2937;
        }
        
        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #8b5cf6;
          cursor: pointer;
          border: 2px solid #1f2937;
        }

        .progress-slider::-webkit-slider-thumb {
          appearance: none;
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid #1f2937;
        }
        
        .progress-slider::-moz-range-thumb {
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid #1f2937;
        }

        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
          opacity: 1;
        }
      `}</style>
    </div>
  )
}

export default AudioResults
