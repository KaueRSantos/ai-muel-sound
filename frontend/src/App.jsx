import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Header from './components/Header'
import UploadZone from './components/UploadZone'
import ProcessingStatus from './components/ProcessingStatus'
import AudioResults from './components/AudioResults'

function App() {
  const [jobId, setJobId] = useState(null)
  const [status, setStatus] = useState(null)
  const [stems, setStems] = useState(null)

  const handleUploadSuccess = (newJobId) => {
    setJobId(newJobId)
    setStatus('processing')
  }

  const handleProcessingComplete = (data) => {
    setStems(data.stems)
    setStatus('completed')
  }

  const handleReset = () => {
    setJobId(null)
    setStatus(null)
    setStems(null)
  }

  return (
    <div className="min-h-screen bg-studio-dark text-white">
      <Header />
      
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <AnimatePresence mode="wait">
          {!jobId ? (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <UploadZone onUploadSuccess={handleUploadSuccess} />
            </motion.div>
          ) : status === 'processing' ? (
            <motion.div
              key="processing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <ProcessingStatus 
                jobId={jobId} 
                onComplete={handleProcessingComplete}
                onCancel={handleReset}
              />
            </motion.div>
          ) : (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <AudioResults 
                jobData={{ stems, jobId }}
                onNewUpload={handleReset}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="text-center py-8 text-gray-500 text-sm">
        <p>Audio Splitter Studio © 2024 - Desenvolvido com ❤️</p>
      </footer>
    </div>
  )
}

export default App

