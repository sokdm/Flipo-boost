import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  ArrowLeft, 
  Play, 
  Square, 
  Trash2, 
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Terminal
} from 'lucide-react'
import axios from 'axios'
import { format } from 'date-fns'
import { useTasks } from '../hooks/useTasks'
import AnimatedBackground from '../components/AnimatedBackground'

const TaskDetails = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { startTask, stopTask, deleteTask } = useTasks()
  const [task, setTask] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTask()
    const interval = setInterval(fetchTask, 2000)
    return () => clearInterval(interval)
  }, [id])

  const fetchTask = async () => {
    try {
      const res = await axios.get(`/api/tasks/${id}`)
      setTask(res.data)
    } catch (error) {
      toast.error('Failed to load task')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this task?')) {
      await deleteTask(id)
      navigate('/dashboard')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
      </div>
    )
  }

  if (!task) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Task Not Found</h1>
          <button onClick={() => navigate('/dashboard')} className="btn-primary">
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  const statusColors = {
    pending: 'text-yellow-400',
    running: 'text-blue-400',
    completed: 'text-green-400',
    failed: 'text-red-400',
    paused: 'text-gray-400'
  }

  const StatusIcon = {
    pending: Clock,
    running: Loader2,
    completed: CheckCircle2,
    failed: XCircle,
    paused: Square
  }[task.status]

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8 relative">
      <AnimatedBackground />
      
      <div className="max-w-4xl mx-auto relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => navigate('/dashboard')}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-2xl font-bold capitalize">
                {task.service} on {task.platform}
              </h1>
              <p className="text-gray-400 text-sm">
                Created {format(new Date(task.createdAt), 'MMM d, yyyy HH:mm')}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {task.status === 'pending' || task.status === 'paused' ? (
              <button
                onClick={() => startTask(task._id)}
                className="p-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors"
              >
                <Play className="w-5 h-5" />
              </button>
            ) : task.status === 'running' ? (
              <button
                onClick={() => stopTask(task._id)}
                className="p-2 bg-yellow-500/20 text-yellow-400 rounded-lg hover:bg-yellow-500/30 transition-colors"
              >
                <Square className="w-5 h-5" />
              </button>
            ) : null}
            
            <button
              onClick={handleDelete}
              className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status Card */}
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <StatusIcon className={`w-8 h-8 ${statusColors[task.status]} ${task.status === 'running' ? 'animate-spin' : ''}`} />
              <div>
                <p className="text-sm text-gray-400">Status</p>
                <p className={`text-lg font-semibold capitalize ${statusColors[task.status]}`}>
                  {task.status}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-400">Progress</p>
              <p className="text-2xl font-bold">{task.progress}%</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="h-4 bg-dark-700 rounded-full overflow-hidden mb-4">
            <motion.div
              className="h-full bg-gradient-to-r from-primary-500 to-purple-500"
              initial={{ width: 0 }}
              animate={{ width: `${task.progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-4 glass rounded-xl">
              <p className="text-2xl font-bold text-primary-400">{task.completed}</p>
              <p className="text-xs text-gray-500">Completed</p>
            </div>
            <div className="p-4 glass rounded-xl">
              <p className="text-2xl font-bold text-purple-400">{task.quantity}</p>
              <p className="text-xs text-gray-500">Target</p>
            </div>
            <div className="p-4 glass rounded-xl">
              <p className="text-2xl font-bold text-pink-400">{task.quantity - task.completed}</p>
              <p className="text-xs text-gray-500">Remaining</p>
            </div>
          </div>
        </div>

        {/* Logs */}
        <div className="card">
          <div className="flex items-center space-x-2 mb-4">
            <Terminal className="w-5 h-5 text-primary-400" />
            <h2 className="text-lg font-semibold">Activity Logs</h2>
          </div>
          
          <div className="space-y-2 max-h-96 overflow-y-auto font-mono text-sm">
            {task.logs && task.logs.length > 0 ? (
              [...task.logs].reverse().map((log, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`p-3 rounded-lg flex items-start space-x-3 ${
                    log.type === 'error' ? 'bg-red-500/10 border border-red-500/20' :
                    log.type === 'success' ? 'bg-green-500/10 border border-green-500/20' :
                    'bg-dark-800/50'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                    log.type === 'error' ? 'bg-red-400' :
                    log.type === 'success' ? 'bg-green-400' :
                    log.type === 'warning' ? 'bg-yellow-400' :
                    'bg-blue-400'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className={log.type === 'error' ? 'text-red-300' : 'text-gray-300'}>
                      {log.message}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {format(new Date(log.timestamp), 'HH:mm:ss')}
                    </p>
                  </div>
                </motion.div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-8">No logs yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default TaskDetails
