import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, User, LogOut, Menu, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useState } from 'react'

const Navbar = () => {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const isActive = (path) => location.pathname === path

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center space-x-2 group">
            <motion.div
              whileHover={{ rotate: 180 }}
              transition={{ duration: 0.3 }}
            >
              <Zap className="w-8 h-8 text-primary-400" />
            </motion.div>
            <span className="text-xl font-bold gradient-text">Filpo Boost</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {user ? (
              <>
                <Link 
                  to="/dashboard" 
                  className={`text-sm font-medium transition-colors ${isActive('/dashboard') ? 'text-primary-400' : 'text-gray-300 hover:text-white'}`}
                >
                  Dashboard
                </Link>
                <Link 
                  to="/create-task" 
                  className={`text-sm font-medium transition-colors ${isActive('/create-task') ? 'text-primary-400' : 'text-gray-300 hover:text-white'}`}
                >
                  New Task
                </Link>
                <div className="flex items-center space-x-4 pl-4 border-l border-white/10">
                  <div className="flex items-center space-x-2 text-sm text-gray-400">
                    <User className="w-4 h-4" />
                    <span>{user.username}</span>
                  </div>
                  <button
                    onClick={logout}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    title="Logout"
                  >
                    <LogOut className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-4">
                <Link to="/login" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
                  Sign In
                </Link>
                <Link to="/register" className="btn-primary text-sm">
                  Get Started
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <button 
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden glass border-t border-white/10"
          >
            <div className="px-4 py-4 space-y-3">
              {user ? (
                <>
                  <Link to="/dashboard" className="block py-2 text-gray-300">Dashboard</Link>
                  <Link to="/create-task" className="block py-2 text-gray-300">New Task</Link>
                  <button onClick={logout} className="block py-2 text-red-400">Logout</button>
                </>
              ) : (
                <>
                  <Link to="/login" className="block py-2 text-gray-300">Sign In</Link>
                  <Link to="/register" className="block py-2 text-primary-400">Get Started</Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}

export default Navbar
