'use client'

import { useState } from 'react'
import { User } from '@supabase/supabase-js'
import { auth } from '@/lib/supabase'
import { toast } from 'react-hot-toast'
import { 
  PlusCircle, 
  Video, 
  Upload, 
  Settings, 
  LogOut,
  User as UserIcon,
  Menu,
  X
} from 'lucide-react'
import CreateProject from './CreateProject'
import ProjectList from './ProjectList'
import VideoLibrary from './VideoLibrary'

interface DashboardProps {
  user: User
  onSignOut: () => void
}

export default function Dashboard({ user, onSignOut }: DashboardProps) {
  const [activeTab, setActiveTab] = useState('projects')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const handleSignOut = async () => {
    try {
      await auth.signOut()
      toast.success('Signed out successfully')
      onSignOut()
    } catch (error) {
      console.error('Sign out error:', error)
      toast.error('Error signing out')
    }
  }

  const navigation = [
    { name: 'Projects', id: 'projects', icon: Video },
    { name: 'Create New', id: 'create', icon: PlusCircle },
    { name: 'Settings', id: 'settings', icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile menu */}
      <div className={`fixed inset-0 z-40 lg:hidden ${isMobileMenuOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setIsMobileMenuOpen(false)} />
        <div className="relative flex flex-col w-full max-w-xs bg-white shadow-xl">
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-semibold">Menu</h2>
            <button onClick={() => setIsMobileMenuOpen(false)}>
              <X className="w-6 h-6" />
            </button>
          </div>
          <nav className="flex-1 p-4 space-y-2">
            {navigation.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id)
                  setIsMobileMenuOpen(false)
                }}
                className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg ${
                  activeTab === item.id
                    ? 'bg-purple-100 text-purple-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <item.icon className="w-5 h-5 mr-3" />
                {item.name}
              </button>
            ))}
          </nav>
          <div className="p-4 border-t">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center px-4 py-3 text-sm font-medium text-red-700 hover:bg-red-50 rounded-lg"
            >
              <LogOut className="w-5 h-5 mr-3" />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200">
          <div className="flex items-center px-6 py-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <UserIcon className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {user.user_metadata?.name || user.email}
                </p>
                <p className="text-xs text-gray-500">AI Video Creator</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigation.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg ${
                  activeTab === item.id
                    ? 'bg-purple-100 text-purple-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <item.icon className="w-5 h-5 mr-3" />
                {item.name}
              </button>
            ))}
          </nav>

          <div className="px-4 py-4 border-t border-gray-200">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center px-4 py-3 text-sm font-medium text-red-700 hover:bg-red-50 rounded-lg"
            >
              <LogOut className="w-5 h-5 mr-3" />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-4 bg-white border-b border-gray-200 lg:px-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-semibold text-gray-900">
              {navigation.find(item => item.id === activeTab)?.name || 'Dashboard'}
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              Welcome back, {user.user_metadata?.name || user.email}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 lg:p-6">
          {activeTab === 'projects' && <ProjectList user={user} />}
          {activeTab === 'create' && <CreateProject user={user} />}
          {activeTab === 'settings' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Settings</h2>
              <p className="text-gray-600">Settings panel coming soon...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}