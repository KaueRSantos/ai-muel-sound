import { motion } from 'framer-motion'
import { Music2, Wand2 } from 'lucide-react'

function Header() {
  return (
    <header className="border-b border-purple-900/30 bg-gradient-to-r from-purple-900/20 to-blue-900/20 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <motion.div 
          className="flex items-center justify-between"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Music2 className="w-10 h-10 text-purple-500" />
              <motion.div
                animate={{ 
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 0.8, 0.5] 
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut" 
                }}
                className="absolute inset-0 bg-purple-500 blur-xl opacity-50"
              />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                Audio Splitter Studio
              </h1>
              <p className="text-sm text-gray-400 flex items-center gap-2">
                <Wand2 className="w-4 h-4" />
                Separe instrumentos com IA
              </p>
            </div>
          </div>
          
          <motion.div 
            className="hidden md:flex items-center space-x-6 text-sm text-gray-400"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span>Online</span>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </header>
  )
}

export default Header

