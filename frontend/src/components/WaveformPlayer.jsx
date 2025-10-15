import { useEffect, useRef } from 'react'
import WaveSurfer from 'wavesurfer.js'

function WaveformPlayer({ audioUrl }) {
  const containerRef = useRef(null)
  const wavesurferRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current) return

    // Create WaveSurfer instance
    wavesurferRef.current = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#8b5cf6',
      progressColor: '#a78bfa',
      cursorColor: '#c4b5fd',
      barWidth: 2,
      barRadius: 3,
      cursorWidth: 2,
      height: 60,
      barGap: 2,
      responsive: true,
      normalize: true,
    })

    // Load audio
    wavesurferRef.current.load(audioUrl)

    return () => {
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy()
      }
    }
  }, [audioUrl])

  return (
    <div 
      ref={containerRef} 
      className="bg-gray-900/50 rounded-lg overflow-hidden"
    />
  )
}

export default WaveformPlayer

