'use client'

import { useState, useEffect } from 'react'
import { auth } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'
import AuthForm from '@/components/AuthForm'
import Dashboard from '@/components/Dashboard'
import { Loader2 } from 'lucide-react'

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await auth.getCurrentUser()
        setUser(currentUser)
      } catch (error) {
        console.error('Auth check error:', error)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      {user ? (
        <Dashboard user={user} onSignOut={() => setUser(null)} />
      ) : (
        <AuthForm onAuthSuccess={setUser} />
      )}
    </div>
  )
}