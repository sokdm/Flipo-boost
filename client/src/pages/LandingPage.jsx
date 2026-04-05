import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { 
  Zap, 
  TrendingUp, 
  Shield, 
  Clock, 
  Globe, 
  Users, 
  ArrowRight,
  Play,
  CheckCircle2,
  Instagram,
  Youtube,
  Facebook,
  Linkedin,
  Twitter
} from 'lucide-react'
import AnimatedBackground from '../components/AnimatedBackground'

const features = [
  {
    icon: <Zap className="w-6 h-6" />,
    title: "Lightning Fast",
    description: "Automated actions that work at optimal speed while maintaining human-like behavior"
  },
  {
    icon: <Shield className="w-6 h-6" />,
    title: "Stealth Mode",
    description: "Advanced anti-detection measures keep your accounts safe and secure"
  },
  {
    icon: <Globe className="w-6 h-6" />,
    title: "Multi-Platform",
    description: "Support for TikTok, YouTube, Instagram, Facebook, LinkedIn, and X"
  },
  {
    icon: <Clock className="w-6 h-6" />,
    title: "24/7 Automation",
    description: "Run tasks continuously in the background while you focus on content"
  }
]

const platforms = [
  { name: 'TikTok', icon: <Play className="w-6 h-6" />, color: 'bg-black' },
  { name: 'YouTube', icon: <Youtube className="w-6 h-6" />, color: 'bg-red-600' },
  { name: 'Instagram', icon: <Instagram className="w-6 h-6" />, color: 'bg-pink-600' },
  { name: 'Facebook', icon: <Facebook className="w-6 h-6" />, color: 'bg-blue-600' },
  { name: 'LinkedIn', icon: <Linkedin className="w-6 h-6" />, color: 'bg-blue-700' },
  { name: 'X / Twitter', icon: <Twitter className="w-6 h-6" />, color: 'bg-gray-900' },
]

const stats = [
  { value: "10M+", label: "Actions Completed" },
  { value: "50K+", label: "Active Users" },
  { value: "99.9%", label: "Success Rate" },
  { value: "24/7", label: "Support" }
]

const LandingPage = () => {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <AnimatedBackground />
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <motion.div 
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-full glass mb-8"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
            >
              <span className="flex h-2 w-2 rounded-full bg-green-400 animate-pulse"></span>
              <span className="text-sm text-gray-300">Now with AI-powered automation</span>
            </motion.div>
            
            <h1 className="text-5xl sm:text-7xl font-bold mb-6 leading-tight">
              <span className="block text-white">Boost Your</span>
              <span className="gradient-text text-glow">Social Presence</span>
            </h1>
            
            <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10">
              Filpo Boost automates your social media growth with human-like precision. 
              Get real followers, likes, and engagement across all major platforms.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/register" className="btn-primary text-lg flex items-center space-x-2 group">
                <span>Start Boosting Free</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link to="/login" className="btn-secondary text-lg">
                Sign In
              </Link>
            </div>
          </motion.div>

          {/* Platform Icons */}
          <motion.div 
            className="mt-20 flex flex-wrap justify-center gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {platforms.map((platform, index) => (
              <motion.div
                key={platform.name}
                className="flex items-center space-x-2 px-4 py-2 rounded-full glass glass-hover"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
                whileHover={{ scale: 1.05 }}
              >
                <span className={`p-2 rounded-full ${platform.color}`}>
                  {platform.icon}
                </span>
                <span className="text-sm font-medium">{platform.name}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                className="text-center"
                initial={{ opacity: 0, scale: 0.5 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <div className="text-4xl font-bold gradient-text mb-2">{stat.value}</div>
                <div className="text-gray-400">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-bold mb-4">Why Choose <span className="gradient-text">Filpo Boost</span>?</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Advanced automation technology that mimics human behavior to grow your accounts safely
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                className="card group"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ y: -5 }}
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-400 text-sm">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.h2 
            className="text-4xl font-bold text-center mb-16"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            How It <span className="gradient-text">Works</span>
          </motion.h2>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Choose Platform", desc: "Select from TikTok, YouTube, Instagram, and more" },
              { step: "02", title: "Set Target", desc: "Enter your profile URL and desired quantity" },
              { step: "03", title: "Watch Grow", desc: "Our bots work 24/7 to boost your presence" }
            ].map((item, index) => (
              <motion.div
                key={item.step}
                className="relative"
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.2 }}
                viewport={{ once: true }}
              >
                <div className="text-6xl font-bold text-white/5 absolute -top-4 -left-4">{item.step}</div>
                <div className="relative pt-8">
                  <h3 className="text-2xl font-semibold mb-3">{item.title}</h3>
                  <p className="text-gray-400">{item.desc}</p>
                </div>
                {index < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-px bg-gradient-to-r from-primary-500 to-transparent" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            className="glass rounded-3xl p-8 md:p-12 border border-primary-500/20"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-bold mb-4">Start Free, Scale Up</h2>
            <p className="text-gray-400 mb-8">
              Get 100 free credits when you sign up. No credit card required.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
              <div className="flex items-center space-x-2 text-sm text-gray-300">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                <span>100 Free Credits</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-300">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                <span>All Platforms</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-300">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                <span>Cancel Anytime</span>
              </div>
            </div>
            
            <Link to="/register" className="btn-primary inline-flex items-center space-x-2">
              <span>Get Started Now</span>
              <TrendingUp className="w-5 h-5" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between">
          <div className="flex items-center space-x-2 mb-4 md:mb-0">
            <Zap className="w-6 h-6 text-primary-400" />
            <span className="font-bold gradient-text">Filpo Boost</span>
          </div>
          <p className="text-gray-500 text-sm">
            © 2024 Filpo Boost. For educational purposes only.
          </p>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage
