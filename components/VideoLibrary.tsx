'use client'

import { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { toast } from 'react-hot-toast'
import { 
  Video, 
  Download, 
  Share2, 
  Star, 
  StarOff, 
  Trash2, 
  Calendar,
  Clock,
  Play,
  Pause,
  MoreHorizontal,
  Filter,
  Search,
  Grid,
  List,
  SortDesc,
  Eye
} from 'lucide-react'

interface GeneratedVideo {
  id: string
  project_id: string
  project_title: string
  video_url: string
  thumbnail_url?: string
  duration: number
  file_size: number
  quality: string
  aspect_ratio: string
  status: string
  ai_model_used: string
  created_at: string
  updated_at: string
  expires_at: string
  is_favorite?: boolean
  view_count?: number
  download_count?: number
}

interface VideoLibraryProps {
  user: User
}

export default function VideoLibrary({ user }: VideoLibraryProps) {
  const [videos, setVideos] = useState<GeneratedVideo[]>([])
  const [filteredVideos, setFilteredVideos] = useState<GeneratedVideo[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'date' | 'duration' | 'views'>('date')
  const [filterBy, setFilterBy] = useState<'all' | 'favorites' | 'recent'>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedVideo, setSelectedVideo] = useState<GeneratedVideo | null>(null)
  const [showVideoModal, setShowVideoModal] = useState(false)

  useEffect(() => {
    fetchVideos()
  }, [])

  useEffect(() => {
    applyFiltersAndSort()
  }, [videos, searchQuery, sortBy, filterBy])

  const fetchVideos = async () => {
    try {
      const response = await fetch(`/api/videos?userId=${user.id}`)
      const data = await response.json()
      
      if (data.success) {
        setVideos(data.videos)
      } else {
        toast.error('Failed to load videos')
      }
    } catch (error) {
      console.error('Error fetching videos:', error)
      toast.error('Failed to load videos')
    } finally {
      setLoading(false)
    }
  }

  const applyFiltersAndSort = () => {
    let filtered = [...videos]

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(video => 
        video.project_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        video.ai_model_used.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Apply category filter
    switch (filterBy) {
      case 'favorites':
        filtered = filtered.filter(video => video.is_favorite)
        break
      case 'recent':
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        filtered = filtered.filter(video => new Date(video.created_at) > sevenDaysAgo)
        break
    }

    // Apply sorting
    switch (sortBy) {
      case 'date':
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        break
      case 'duration':
        filtered.sort((a, b) => b.duration - a.duration)
        break
      case 'views':
        filtered.sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
        break
    }

    setFilteredVideos(filtered)
  }

  const toggleFavorite = async (videoId: string) => {
    try {
      const response = await fetch(`/api/videos/${videoId}/favorite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (response.ok) {
        setVideos(prev => prev.map(video => 
          video.id === videoId 
            ? { ...video, is_favorite: !video.is_favorite }
            : video
        ))
        toast.success('Updated favorites')
      }
    } catch (error) {
      console.error('Error toggling favorite:', error)
      toast.error('Failed to update favorite')
    }
  }

  const downloadVideo = async (video: GeneratedVideo) => {
    try {
      const response = await fetch(`/api/videos/${video.id}/download`)
      const blob = await response.blob()
      
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${video.project_title}_${video.id}.mp4`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast.success('Video downloaded successfully')
    } catch (error) {
      console.error('Error downloading video:', error)
      toast.error('Failed to download video')
    }
  }

  const shareVideo = async (video: GeneratedVideo) => {
    try {
      await navigator.clipboard.writeText(video.video_url)
      toast.success('Video link copied to clipboard')
    } catch (error) {
      console.error('Error sharing video:', error)
      toast.error('Failed to share video')
    }
  }

  const deleteVideo = async (videoId: string) => {
    if (!confirm('Are you sure you want to delete this video?')) return

    try {
      const response = await fetch(`/api/videos/${videoId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setVideos(prev => prev.filter(video => video.id !== videoId))
        toast.success('Video deleted successfully')
      }
    } catch (error) {
      console.error('Error deleting video:', error)
      toast.error('Failed to delete video')
    }
  }

  const openVideoModal = (video: GeneratedVideo) => {
    setSelectedVideo(video)
    setShowVideoModal(true)
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const getDaysUntilExpiry = (expiryDate: string): number => {
    const now = new Date()
    const expiry = new Date(expiryDate)
    return Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Video Library</h1>
            <p className="text-gray-600">Manage your generated videos</p>
          </div>
          <div className="text-sm text-gray-500">
            {filteredVideos.length} of {videos.length} videos
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search videos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          
          <div className="flex gap-2">
            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Videos</option>
              <option value="favorites">Favorites</option>
              <option value="recent">Recent</option>
            </select>
            
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="date">Sort by Date</option>
              <option value="duration">Sort by Duration</option>
              <option value="views">Sort by Views</option>
            </select>
            
            <div className="flex border border-gray-300 rounded-lg">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-2 ${viewMode === 'grid' ? 'bg-purple-600 text-white' : 'text-gray-600'}`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-2 ${viewMode === 'list' ? 'bg-purple-600 text-white' : 'text-gray-600'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Videos Grid/List */}
      <div className="bg-white rounded-lg shadow-sm">
        {filteredVideos.length === 0 ? (
          <div className="text-center py-12">
            <Video className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No videos found</h3>
            <p className="text-gray-600">
              {searchQuery || filterBy !== 'all' 
                ? 'Try adjusting your search or filters'
                : 'Create your first video project to get started'
              }
            </p>
          </div>
        ) : (
          <div className={viewMode === 'grid' 
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6' 
            : 'divide-y divide-gray-200'
          }>
            {filteredVideos.map((video) => (
              <div key={video.id} className={viewMode === 'grid' ? 'group' : 'p-6'}>
                {viewMode === 'grid' ? (
                  // Grid View
                  <div className="bg-gray-50 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                    <div className="relative aspect-w-9 aspect-h-16 bg-gray-200">
                      <video
                        src={video.video_url}
                        className="w-full h-48 object-cover cursor-pointer"
                        onClick={() => openVideoModal(video)}
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity flex items-center justify-center">
                        <Play className="w-12 h-12 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                        {formatDuration(video.duration)}
                      </div>
                      <button
                        onClick={() => toggleFavorite(video.id)}
                        className="absolute top-2 right-2 p-1 rounded-full bg-black bg-opacity-50 hover:bg-opacity-70"
                      >
                        {video.is_favorite ? (
                          <Star className="w-4 h-4 text-yellow-400 fill-current" />
                        ) : (
                          <StarOff className="w-4 h-4 text-white" />
                        )}
                      </button>
                    </div>
                    
                    <div className="p-4">
                      <h3 className="font-medium text-gray-900 mb-2 line-clamp-2">
                        {video.project_title}
                      </h3>
                      <div className="flex items-center text-sm text-gray-500 mb-3">
                        <Calendar className="w-4 h-4 mr-1" />
                        {new Date(video.created_at).toLocaleDateString()}
                        <span className="mx-2">•</span>
                        <span>{video.ai_model_used}</span>
                      </div>
                      
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-sm">
                          <span className="text-gray-600">Expires in </span>
                          <span className={`font-medium ${getDaysUntilExpiry(video.expires_at) <= 2 ? 'text-red-600' : 'text-gray-900'}`}>
                            {getDaysUntilExpiry(video.expires_at)} days
                          </span>
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatFileSize(video.file_size)}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => downloadVideo(video)}
                          className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700"
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Download
                        </button>
                        <button
                          onClick={() => shareVideo(video)}
                          className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteVideo(video.id)}
                          className="px-3 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  // List View
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0 w-20 h-16 bg-gray-200 rounded-lg overflow-hidden">
                      <video
                        src={video.video_url}
                        className="w-full h-full object-cover cursor-pointer"
                        onClick={() => openVideoModal(video)}
                      />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-medium text-gray-900 truncate">
                        {video.project_title}
                      </h3>
                      <div className="flex items-center text-sm text-gray-500 mt-1">
                        <Calendar className="w-4 h-4 mr-1" />
                        {new Date(video.created_at).toLocaleDateString()}
                        <span className="mx-2">•</span>
                        <Clock className="w-4 h-4 mr-1" />
                        {formatDuration(video.duration)}
                        <span className="mx-2">•</span>
                        <span>{video.ai_model_used}</span>
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        {formatFileSize(video.file_size)} • Expires in {getDaysUntilExpiry(video.expires_at)} days
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleFavorite(video.id)}
                        className="p-2 text-gray-400 hover:text-yellow-500"
                      >
                        {video.is_favorite ? (
                          <Star className="w-5 h-5 text-yellow-400 fill-current" />
                        ) : (
                          <StarOff className="w-5 h-5" />
                        )}
                      </button>
                      <button
                        onClick={() => downloadVideo(video)}
                        className="p-2 text-gray-400 hover:text-purple-600"
                      >
                        <Download className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => shareVideo(video)}
                        className="p-2 text-gray-400 hover:text-blue-600"
                      >
                        <Share2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => deleteVideo(video.id)}
                        className="p-2 text-gray-400 hover:text-red-600"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Video Modal */}
      {showVideoModal && selectedVideo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-medium text-gray-900">
                {selectedVideo.project_title}
              </h3>
              <button
                onClick={() => setShowVideoModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-4">
              <div className="aspect-w-16 aspect-h-9 mb-4">
                <video
                  src={selectedVideo.video_url}
                  className="w-full h-auto rounded-lg"
                  controls
                  autoPlay
                />
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Duration:</span>
                  <p className="font-medium">{formatDuration(selectedVideo.duration)}</p>
                </div>
                <div>
                  <span className="text-gray-600">Quality:</span>
                  <p className="font-medium">{selectedVideo.quality}</p>
                </div>
                <div>
                  <span className="text-gray-600">Size:</span>
                  <p className="font-medium">{formatFileSize(selectedVideo.file_size)}</p>
                </div>
                <div>
                  <span className="text-gray-600">AI Model:</span>
                  <p className="font-medium">{selectedVideo.ai_model_used}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 mt-6">
                <button
                  onClick={() => downloadVideo(selectedVideo)}
                  className="flex-1 inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </button>
                <button
                  onClick={() => shareVideo(selectedVideo)}
                  className="flex-1 inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}