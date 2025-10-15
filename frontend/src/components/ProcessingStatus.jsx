import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Loader2, CheckCircle2, XCircle, Zap } from 'lucide-react'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function ProcessingStatus({ jobId, onComplete, onCancel }) {
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState('processing')
  const [error, setError] = useState(null)

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await axios.get(`${API_URL}/status/${jobId}`)
        const data = response.data

        setProgress(data.progress || 0)
        setStatus(data.status)

        if (data.status === 'completed') {
          onComplete(data)
        } else if (data.status === 'failed') {
          setError(data.error || 'Erro ao processar arquivo')
        }
      } catch (err) {
        console.error('Status check error:', err)
        setError('Erro ao verificar status')
      }
    }

    const interval = setInterval(checkStatus, 2000)
    checkStatus()

    return () => clearInterval(interval)
  }, [jobId, onComplete])

  return (
    <div className="max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 rounded-2xl p-8 border border-purple-800/30"
      >
        <div className="text-center mb-8">
          {status === 'failed' ? (
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          ) : status === 'completed' ? (
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          ) : (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="mb-4"
            >
              <Loader2 className="w-16 h-16 text-purple-500 mx-auto" />
            </motion.div>
          )}

          <h2 className="text-2xl font-bold mb-2">
            {status === 'failed' 
              ? 'Erro no Processamento' 
              : status === 'completed'
              ? 'Processamento Concluído!'
              : 'Processando seu áudio...'}
          </h2>
          <p className="text-gray-400">
            {status === 'failed'
              ? 'Ocorreu um erro ao processar seu arquivo'
              : status === 'completed'
              ? 'Suas faixas estão prontas!'
              : 'Isso pode levar alguns minutos. Por favor, aguarde...'}
          </p>
        </div>

        {status !== 'failed' && (
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-400 mb-2">
              <span>Progresso</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-purple-600 to-blue-600 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-500/50 rounded-lg text-red-400">
            {error}
          </div>
        )}

        <div className="space-y-3">
          {[
            { label: 'Carregando arquivo', done: progress >= 10 },
            { label: 'Separando instrumentos', done: progress >= 30 },
            { label: 'Convertendo faixas', done: progress >= 70 },
            { label: 'Finalizando', done: progress >= 100 },
          ].map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center space-x-3"
            >
              <div className={`
                w-2 h-2 rounded-full transition-colors duration-300
                ${step.done ? 'bg-green-500' : 'bg-gray-600'}
              `} />
              <span className={`
                text-sm transition-colors duration-300
                ${step.done ? 'text-green-400' : 'text-gray-500'}
              `}>
                {step.label}
              </span>
              {step.done && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 15 }}
                >
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>

        {(status === 'failed' || status === 'processing') && (
          <button
            onClick={onCancel}
            className="mt-6 w-full px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg font-semibold transition-colors"
          >
            Cancelar
          </button>
        )}

        <div className="mt-6 flex items-center justify-center space-x-2 text-sm text-gray-500">
          <Zap className="w-4 h-4" />
          <span>Powered by Demucs AI (6-stems)</span>
        </div>
      </motion.div>
    </div>
  )
}

export default ProcessingStatus

