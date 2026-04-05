import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'

export const useTasks = () => {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    try {
      const res = await axios.get('/api/tasks')
      setTasks(res.data)
    } catch (error) {
      toast.error('Failed to fetch tasks')
    } finally {
      setLoading(false)
    }
  }, [])

  const createTask = async (taskData) => {
    try {
      const res = await axios.post('/api/tasks', taskData)
      setTasks(prev => [res.data.task, ...prev])
      toast.success('Task created successfully')
      return res.data.task
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to create task')
      throw error
    }
  }

  const startTask = async (taskId) => {
    try {
      await axios.post(`/api/tasks/${taskId}/start`)
      toast.success('Task started')
      fetchTasks()
    } catch (error) {
      toast.error('Failed to start task')
    }
  }

  const stopTask = async (taskId) => {
    try {
      await axios.post(`/api/tasks/${taskId}/stop`)
      toast.success('Task stopped')
      fetchTasks()
    } catch (error) {
      toast.error('Failed to stop task')
    }
  }

  const deleteTask = async (taskId) => {
    try {
      await axios.delete(`/api/tasks/${taskId}`)
      setTasks(prev => prev.filter(t => t._id !== taskId))
      toast.success('Task deleted')
    } catch (error) {
      toast.error('Failed to delete task')
    }
  }

  useEffect(() => {
    fetchTasks()
    const interval = setInterval(fetchTasks, 5000) // Poll every 5s
    return () => clearInterval(interval)
  }, [fetchTasks])

  return { tasks, loading, createTask, startTask, stopTask, deleteTask, refreshTasks: fetchTasks }
}
