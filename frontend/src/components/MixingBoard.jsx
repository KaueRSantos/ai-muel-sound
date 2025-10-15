import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Download, RotateCcw, Play, Pause, Volume2, VolumeX } from 'lucide-react'
import WaveformPlayer from './WaveformPlayer'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const instrumentConfig = {
  voz: { icon: '🎤', color: 'from-pink-500 to-rose-500', label: 'Voz' },
  bateria: { icon: '🥁', color: 'from-orange-500 to-red-500', label: 'Bateria' },
  baixo: { icon: '🎸', color: 'from-blue-500 to-cyan-500', label: 'Baixo' },
  guitarra: { icon: '🎸', color: 'from-red-500 to-orange-600', label: 'Guitarra' },
  teclado: { icon: '🎹', color: 'from-purple-500 to-indigo-500', label: 'Teclado' },
  outros: { icon: '🎼', color: 'from-green-500 to-emerald-500', label: 'Outros' },
}

function MixingBoard({ stems, jobId, onReset }) {
  const [volumes, setVolumes] = useState({
    voz: 1,
    bateria: 1,
    baixo: 1,
    guitarra: 1,
    teclado: 1,
    outros: 1,
  })
  const [muted, setMuted] = useState({
    voz: false,
    bateria: false,
    baixo: false,
    guitarra: false,
    teclado: false,
    outros: false,
  })
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  
  const audioRefs = useRef({})

  useEffect(() => {
    // Initialize audio elements
    Object.keys(stems).forEach((instrument) => {
      if (!audioRefs.current[instrument]) {
        const audio = new Audio(`${API_URL}${stems[instrument].mp3}`)
        audio.volume = volumes[instrument]
        audio.addEventListener('timeupdate', () => {
          setCurrentTime(audio.currentTime)
        })
        audioRefs.current[instrument] = audio
      }
    })

    return () => {
      Object.values(audioRefs.current).forEach((audio) => {
        audio.pause()
        audio.src = ''
      })
    }
  }, [stems])

  const handlePlayPause = () => {
    Object.values(audioRefs.current).forEach((audio) => {
      if (playing) {
        audio.pause()
      } else {
        audio.play()
      }
    })
    setPlaying(!playing)
  }

  const handleVolumeChange = (instrument, value) => {
    const volume = parseFloat(value)
    setVolumes({ ...volumes, [instrument]: volume })
    if (audioRefs.current[instrument]) {
      audioRefs.current[instrument].volume = muted[instrument] ? 0 : volume
    }
  }

  const handleMute = (instrument) => {
    const newMuted = { ...muted, [instrument]: !muted[instrument] }
    setMuted(newMuted)
    if (audioRefs.current[instrument]) {
      audioRefs.current[instrument].volume = newMuted[instrument] ? 0 : volumes[instrument]
    }
  }

  const handleDownload = (instrument) => {
    const link = document.createElement('a')
    link.href = `${API_URL}${stems[instrument].wav}`
    link.download = `${instrument}.wav`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="max-w-6xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
          Suas Faixas Separadas
        </h2>
        <p className="text-gray-400">
          Ajuste o volume de cada instrumento e baixe as faixas
        </p>
      </motion.div>

      {/* Master Controls */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 rounded-2xl p-6 border border-purple-800/30 mb-6"
      >
        <div className="flex items-center justify-between">
          <button
            onClick={handlePlayPause}
            className="flex items-center space-x-3 px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-lg font-semibold transition-all duration-300 shadow-lg hover:shadow-purple-500/50"
          >
            {playing ? (
              <>
                <Pause className="w-5 h-5" />
                <span>Pausar</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                <span>Reproduzir Tudo</span>
              </>
            )}
          </button>

          <button
            onClick={onReset}
            className="flex items-center space-x-2 px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg font-semibold transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Novo Arquivo</span>
          </button>
        </div>
      </motion.div>

      {/* Instrument Tracks */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(stems).map(([instrument, urls], index) => {
          const config = instrumentConfig[instrument]
          
          return (
            <motion.div
              key={instrument}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.1 }}
              className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 rounded-xl p-6 border border-purple-800/20"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="text-3xl">{config.icon}</div>
                  <div>
                    <h3 className={`text-lg font-bold bg-gradient-to-r ${config.color} bg-clip-text text-transparent`}>
                      {config.label}
                    </h3>
                  </div>
                </div>
                <button
                  onClick={() => handleDownload(instrument)}
                  className="p-2 bg-purple-900/50 hover:bg-purple-800/50 rounded-lg transition-colors"
                  title="Baixar faixa"
                >
                  <Download className="w-5 h-5" />
                </button>
              </div>

              {/* Waveform */}
              <WaveformPlayer audioUrl={`${API_URL}${urls.mp3}`} />

              {/* Volume Control */}
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-sm text-gray-400">
                  <span>Volume</span>
                  <span>{Math.round(volumes[instrument] * 100)}%</span>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => handleMute(instrument)}
                    className="p-2 hover:bg-purple-900/30 rounded transition-colors"
                  >
                    {muted[instrument] ? (
                      <VolumeX className="w-5 h-5 text-gray-500" />
                    ) : (
                      <Volume2 className="w-5 h-5 text-purple-400" />
                    )}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volumes[instrument]}
                    onChange={(e) => handleVolumeChange(instrument, e.target.value)}
                    className="flex-1 h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer slider"
                  />
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

export default MixingBoard

