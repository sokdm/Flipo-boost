import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  ArrowLeft, 
  Play, 
  Users, 
  Heart, 
  MessageCircle, 
  Eye, 
  Share2,
  Zap,
  Settings,
  Globe,
  CheckCircle2
} from 'lucide-react'
import { useTasks } from '../hooks/useTasks'
import axios from 'axios'
import toast from 'react-hot-toast'
import AnimatedBackground from '../components/AnimatedBackground'

const services = [
  { id: 'followers', name: 'Followers', icon: Users, description: 'Grow your audience with real followers' },
  { id: 'likes', name: 'Likes', icon: Heart, description: 'Boost engagement on your posts' },
  { id: 'comments', name: 'Comments', icon: MessageCircle, description: 'Get meaningful interactions' },
  { id: 'views', name: 'Views', icon: Eye, description: 'Increase content visibility' },
  { id: 'shares', name: 'Shares', icon: Share2, description: 'Expand your reach' }
]

const speeds = [
  { id: 'slow', name: 'Slow & Safe', description: 'Most natural, lowest risk' },
  { id: 'medium', name: 'Balanced', description: 'Good speed with safety' },
  { id: 'fast', name: 'Fast', description: 'Quick results, higher visibility' }
]

const CreateTask = () => {
  const navigate = useNavigate()
  const { createTask } = useTasks()
  const [step, setStep] = useState(1)
  const [platforms, setPlatforms] = useState([])
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    platform: '',
    service: '',
    targetUrl: '',
    quantity: 100,
    settings: {
      speed: 'medium',
      humanBehavior: true
    }
  })

  useEffect(() => {
    fetchPlatforms()
  }, [])

  const fetchPlatforms = async () => {
    try {
      const res = await axios.get('/api/platforms')
      setPlatforms(res.data)
    } catch (error) {
      toast.error('Failed to load platforms')
    }
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      await createTask(formData)
      navigate('/dashboard')
    } catch (error) {
      // Error handled in hook
    } finally {
      setLoading(false)
    }
  }

  const selectedPlatform = platforms.find(p => p.id === formData.platform)

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8 relative">
      <AnimatedBackground />
      
      <div className="max-w-4xl mx-auto relative z-10">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-8">
          <button 
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-3xl font-bold">Create New Task</h1>
            <p className="text-gray-400">Configure your automation</p>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center mb-8">
          {[1, 2, 3].map((s, i) => (
            <div key={s} className="flex items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                step >= s ? 'bg-primary-500 text-white' : 'bg-dark-800 text-gray-500'
              }`}>
                {step > s ? <CheckCircle2 className="w-5 h-5" /> : s}
              </div>
              {i < 2 && (
                <div className={`w-24 h-1 mx-2 ${
                  step > s ? 'bg-primary-500' : 'bg-dark-800'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Platform Selection */}
        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <h2 className="text-xl font-semibold mb-4">Select Platform</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {platforms.map((platform) => (
                <motion.button
                  key={platform.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setFormData({ ...formData, platform: platform.id })}
                  className={`card text-left relative overflow-hidden ${
                    formData.platform === platform.id ? 'ring-2 ring-primary-500 bg-primary-500/10' : ''
                  }`}
                >
                  <div 
                    className="w-12 h-12 rounded-xl mb-4 flex items-center justify-center text-white"
                    style={{ backgroundColor: platform.color }}
                  >
                    <Globe className="w-6 h-6" />
                  </div>
                  <h3 className="font-semibold mb-1">{platform.name}</h3>
                  <p className="text-sm text-gray-400">{platform.services.length} services available</p>
                  
                  {formData.platform === platform.id && (
                    <div className="absolute top-4 right-4">
                      <CheckCircle2 className="w-6 h-6 text-primary-400" />
                    </div>
                  )}
                </motion.button>
              ))}
            </div>
            
            <div className="flex justify-end pt-4">
              <button
                onClick={() => setStep(2)}
                disabled={!formData.platform}
                className="btn-primary disabled:opacity-50"
              >
                Continue
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 2: Service Selection */}
        {step === 2 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <h2 className="text-xl font-semibold mb-4">Select Service</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {services.filter(s => selectedPlatform?.services.includes(s.id)).map((service) => (
                <motion.button
                  key={service.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setFormData({ ...formData, service: service.id })}
                  className={`card text-left flex items-start space-x-4 ${
                    formData.service === service.id ? 'ring-2 ring-primary-500 bg-primary-500/10' : ''
                  }`}
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                    <service.icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">{service.name}</h3>
                    <p className="text-sm text-gray-400">{service.description}</p>
                  </div>
                  {formData.service === service.id && (
                    <CheckCircle2 className="w-6 h-6 text-primary-400 flex-shrink-0" />
                  )}
                </motion.button>
              ))}
            </div>
            
            <div className="flex justify-between pt-4">
              <button onClick={() => setStep(1)} className="btn-secondary">
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!formData.service}
                className="btn-primary disabled:opacity-50"
              >
                Continue
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Configuration */}
        {step === 3 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <h2 className="text-xl font-semibold mb-4">Configure Task</h2>
            
            {/* URL Input */}
            <div className="card space-y-4">
              <label className="block text-sm font-medium text-gray-300">
                Target URL
              </label>
              <input
                type="url"
                value={formData.targetUrl}
                onChange={(e) => setFormData({ ...formData, targetUrl: e.target.value })}
                className="input-field"
                placeholder={`https://${formData.platform}.com/...`}
                required
              />
              <p className="text-xs text-gray-500">
                Enter the URL of your profile or post
              </p>
            </div>

            {/* Quantity */}
            <div className="card space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-300">
                  Quantity: {formData.quantity}
                </label>
                <span className="text-sm text-primary-400">
                  Cost: {Math.ceil(formData.quantity / 10)} credits
                </span>
              </div>
              <input
                type="range"
                min="10"
                max="1000"
                step="10"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                className="w-full h-2 bg-dark-700 rounded-lg appearance-none cursor-pointer accent-primary-500"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>10</span>
                <span>500</span>
                <span>1000</span>
              </div>
            </div>

            {/* Speed Settings */}
            <div className="card space-y-4">
              <label className="block text-sm font-medium text-gray-300 flex items-center space-x-2">
                <Settings className="w-4 h-4" />
                <span>Automation Speed</span>
              </label>
              <div className="grid grid-cols-3 gap-3">
                {speeds.map((speed) => (
                  <button
                    key={speed.id}
                    onClick={() => setFormData({
                      ...formData,
                      settings: { ...formData.settings, speed: speed.id }
                    })}
                    className={`p-3 rounded-xl border text-sm transition-all ${
                      formData.settings.speed === speed.id
                        ? 'border-primary-500 bg-primary-500/20 text-white'
                        : 'border-dark-700 hover:border-dark-600 text-gray-400'
                    }`}
                  >
                    <div className="font-medium mb-1">{speed.name}</div>
                    <div className="text-xs opacity-70">{speed.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Human Behavior Toggle */}
            <div className="card flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <h3 className="font-medium">Human-like Behavior</h3>
                  <p className="text-sm text-gray-400">Random delays, scrolling, mouse movements</p>
                </div>
              </div>
              <button
                onClick={() => setFormData({
                  ...formData,
                  settings: { ...formData.settings, humanBehavior: !formData.settings.humanBehavior }
                })}
                className={`w-14 h-7 rounded-full transition-colors relative ${
                  formData.settings.humanBehavior ? 'bg-green-500' : 'bg-dark-700'
                }`}
              >
                <div className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${
                  formData.settings.humanBehavior ? 'translate-x-8' : 'translate-x-1'
                }`} />
              </button>
            </div>

            <div className="flex justify-between pt-4">
              <button onClick={() => setStep(2)} className="btn-secondary">
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={!formData.targetUrl || loading}
                className="btn-primary flex items-center space-x-2 disabled:opacity-50"
              >
                {loading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                  />
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    <span>Start Task</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}

export default CreateTask
