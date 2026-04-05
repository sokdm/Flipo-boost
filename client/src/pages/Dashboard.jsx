import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  Plus, 
  Play, 
  Square, 
  Trash2, 
  TrendingUp, 
  Users, 
  Activity,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2
} from 'lucide-react'
import { useTasks } from '../hooks/useTasks'
import { useAuth } from '../context/AuthContext'
import { format } from 'date-fns'
import AnimatedBackground from '../components/AnimatedBackground'

const statusColors = {
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  running: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  completed: 'bg-green-500/20 text-green-400 border-green-500/30',
  failed: 'bg-red-500/20 text-red-400 border-red-500/30',
  paused: 'bg-gray-500/20 text-gray-400 border-gray-500/30'
}

const statusIcons = {
  pending: Clock,
  running: Loader2,
  completed: CheckCircle2,
  failed: XCircle,
  paused: Square
}

const Dashboard = () => {
  const { user } = useAuth()
  const { tasks, loading, startTask, stopTask, deleteTask } = useTasks()

  const stats = [
    { label: 'Total Tasks', value: tasks.length, icon: Activity, color: 'text-blue-400' },
    { label: 'Running', value: tasks.filter(t => t.status === 'running').length, icon: Loader2, color: 'text-green-400' },
    { label: 'Completed', value: tasks.filter(t => t.status === 'completed').length, icon: CheckCircle2, color: 'text-purple-400' },
    { label: 'Credits', value: user?.credits || 0, icon: TrendingUp, color: 'text-yellow-400' }
  ]

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8 relative">
      <AnimatedBackground />
      
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-1">Dashboard</h1>
            <p className="text-gray-400">Welcome back, {user?.username}</p>
          </div>
          <Link to="/create-task" className="btn-primary flex items-center justify-center space-x-2">
            <Plus className="w-5 h-5" />
            <span>New Task</span>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              className="card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="flex items-center justify-between mb-2">
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
                <span className="text-2xl font-bold">{stat.value}</span>
              </div>
              <p className="text-sm text-gray-400">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Tasks List */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Recent Tasks</h2>
            {loading && <Loader2 className="w-5 h-5 animate-spin text-primary-400" />}
          </div>

          {tasks.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary-500/10 flex items-center justify-center">
                <Activity className="w-8 h-8 text-primary-400" />
              </div>
              <h3 className="text-lg font-medium mb-2">No tasks yet</h3>
              <p className="text-gray-400 mb-4">Create your first automation task</p>
              <Link to="/create-task" className="btn-secondary inline-flex items-center space-x-2">
                <Plus className="w-4 h-4" />
                <span>Create Task</span>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {tasks.map((task, index) => {
                const StatusIcon = statusIcons[task.status]
                return (
                  <motion.div
                    key={task._id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="glass rounded-xl p-4 hover:bg-white/5 transition-colors group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${statusColors[task.status]}`}>
                          <StatusIcon className={`w-5 h-5 ${task.status === 'running' ? 'animate-spin' : ''}`} />
                        </div>
                        <div>
                          <h3 className="font-medium capitalize">
                            {task.service} on {task.platform}
                          </h3>
                          <p className="text-sm text-gray-400">
                            {task.completed}/{task.quantity} completed • 
                            {format(new Date(task.createdAt), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {/* Progress Bar */}
                        <div className="hidden sm:block w-32">
                          <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
                            <motion.div 
                              className="h-full bg-gradient-to-r from-primary-500 to-purple-500"
                              initial={{ width: 0 }}
                              animate={{ width: `${task.progress}%` }}
                              transition={{ duration: 0.5 }}
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-1 text-right">{task.progress}%</p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {task.status === 'pending' || task.status === 'paused' ? (
                            <button
                              onClick={() => startTask(task._id)}
                              className="p-2 hover:bg-green-500/20 text-green-400 rounded-lg transition-colors"
                              title="Start"
                            >
                              <Play className="w-4 h-4" />
                            </button>
                          ) : task.status === 'running' ? (
                            <button
                              onClick={() => stopTask(task._id)}
                              className="p-2 hover:bg-yellow-500/20 text-yellow-400 rounded-lg transition-colors"
                              title="Stop"
                            >
                              <Square className="w-4 h-4" />
                            </button>
                          ) : null}
                          
                          <button
                            onClick={() => deleteTask(task._id)}
                            className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Latest Log */}
                    {task.logs && task.logs.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-white/5">
                        <p className="text-xs text-gray-500">
                          <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                            task.logs[task.logs.length - 1].type === 'error' ? 'bg-red-400' :
                            task.logs[task.logs.length - 1].type === 'success' ? 'bg-green-400' :
                            'bg-blue-400'
                          }`} />
                          {task.logs[task.logs.length - 1].message}
                        </p>
                      </div>
                    )}
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard
