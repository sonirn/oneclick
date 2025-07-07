'use client'

import { useState } from 'react'
import { User } from '@supabase/supabase-js'
import { toast } from 'react-hot-toast'
import { useDropzone } from 'react-dropzone'
import { Upload, Video, Image, Music, FileText, Loader2, X } from 'lucide-react'
import { validateVideoFile, validateImageFile, validateAudioFile, formatFileSize } from '@/lib/utils'

interface CreateProjectProps {
  user: User
}

interface FileUpload {
  file: File
  preview?: string
  type: 'video' | 'image' | 'audio'
}

export default function CreateProject({ user }: CreateProjectProps) {
  const [projectData, setProjectData] = useState({
    title: '',
    description: ''
  })
  const [uploads, setUploads] = useState<{
    video?: FileUpload
    image?: FileUpload
    audio?: FileUpload
  }>({})
  const [loading, setLoading] = useState(false)

  const handleVideoUpload = (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    const validation = validateVideoFile(file)
    if (!validation.valid) {
      toast.error(validation.error!)
      return
    }

    const videoURL = URL.createObjectURL(file)
    setUploads(prev => ({
      ...prev,
      video: { file, preview: videoURL, type: 'video' }
    }))
    toast.success('Video uploaded successfully!')
  }

  const handleImageUpload = (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    const validation = validateImageFile(file)
    if (!validation.valid) {
      toast.error(validation.error!)
      return
    }

    const imageURL = URL.createObjectURL(file)
    setUploads(prev => ({
      ...prev,
      image: { file, preview: imageURL, type: 'image' }
    }))
    toast.success('Character image uploaded successfully!')
  }

  const handleAudioUpload = (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    const validation = validateAudioFile(file)
    if (!validation.valid) {
      toast.error(validation.error!)
      return
    }

    const audioURL = URL.createObjectURL(file)
    setUploads(prev => ({
      ...prev,
      audio: { file, preview: audioURL, type: 'audio' }
    }))
    toast.success('Audio file uploaded successfully!')
  }

  const removeFile = (type: 'video' | 'image' | 'audio') => {
    setUploads(prev => {
      const newUploads = { ...prev }
      if (newUploads[type]?.preview) {
        URL.revokeObjectURL(newUploads[type]!.preview!)
      }
      delete newUploads[type]
      return newUploads
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!projectData.title.trim()) {
      toast.error('Please enter a project title')
      return
    }

    if (!uploads.video) {
      toast.error('Please upload a sample video')
      return
    }

    setLoading(true)

    try {
      const formData = new FormData()
      formData.append('title', projectData.title)
      formData.append('description', projectData.description)
      formData.append('userId', user.id)
      
      if (uploads.video) {
        formData.append('video', uploads.video.file)
      }
      if (uploads.image) {
        formData.append('image', uploads.image.file)
      }
      if (uploads.audio) {
        formData.append('audio', uploads.audio.file)
      }

      const response = await fetch('/api/projects', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('Failed to create project')
      }

      const result = await response.json()
      
      if (result.success) {
        toast.success('Project created successfully!')
        // Reset form
        setProjectData({ title: '', description: '' })
        setUploads({})
      } else {
        throw new Error(result.error || 'Failed to create project')
      }
    } catch (error) {
      console.error('Project creation error:', error)
      toast.error('Failed to create project. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const videoDropzone = useDropzone({
    onDrop: handleVideoUpload,
    accept: {
      'video/*': ['.mp4', '.webm', '.mov']
    },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024 // 50MB
  })

  const imageDropzone = useDropzone({
    onDrop: handleImageUpload,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.webp']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024 // 10MB
  })

  const audioDropzone = useDropzone({
    onDrop: handleAudioUpload,
    accept: {
      'audio/*': ['.mp3', '.wav', '.m4a']
    },
    maxFiles: 1,
    maxSize: 25 * 1024 * 1024 // 25MB
  })

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Create New Video Project</h2>
        
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Project Details */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project Title *
              </label>
              <input
                type="text"
                value={projectData.title}
                onChange={(e) => setProjectData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Enter project title"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description (Optional)
              </label>
              <textarea
                value={projectData.description}
                onChange={(e) => setProjectData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                rows={3}
                placeholder="Describe your video project..."
              />
            </div>
          </div>

          {/* File Uploads */}
          <div className="space-y-6">
            {/* Video Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sample Video * (Max 60s, 50MB)
              </label>
              {uploads.video ? (
                <div className="relative">
                  <video
                    src={uploads.video.preview}
                    className="w-full h-48 object-cover rounded-lg"
                    controls
                  />
                  <button
                    type="button"
                    onClick={() => removeFile('video')}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <p className="text-sm text-gray-600 mt-2">
                    {uploads.video.file.name} ({formatFileSize(uploads.video.file.size)})
                  </p>
                </div>
              ) : (
                <div
                  {...videoDropzone.getRootProps()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-purple-500"
                >
                  <input {...videoDropzone.getInputProps()} />
                  <Video className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-600">Upload Sample Video</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Drag & drop or click to select MP4, WebM, or MOV files
                  </p>
                </div>
              )}
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Character Image (Optional, 10MB)
              </label>
              {uploads.image ? (
                <div className="relative">
                  <img
                    src={uploads.image.preview}
                    alt="Character"
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => removeFile('image')}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <p className="text-sm text-gray-600 mt-2">
                    {uploads.image.file.name} ({formatFileSize(uploads.image.file.size)})
                  </p>
                </div>
              ) : (
                <div
                  {...imageDropzone.getRootProps()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-purple-500"
                >
                  <input {...imageDropzone.getInputProps()} />
                  <Image className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-600">Upload Character Image</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Drag & drop or click to select JPG, PNG, or WebP files
                  </p>
                </div>
              )}
            </div>

            {/* Audio Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Audio File (Optional, 25MB)
              </label>
              {uploads.audio ? (
                <div className="relative">
                  <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                    <Music className="w-8 h-8 text-purple-600" />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{uploads.audio.file.name}</p>
                      <p className="text-sm text-gray-600">{formatFileSize(uploads.audio.file.size)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile('audio')}
                      className="p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <audio src={uploads.audio.preview} controls className="w-full mt-2" />
                </div>
              ) : (
                <div
                  {...audioDropzone.getRootProps()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-purple-500"
                >
                  <input {...audioDropzone.getInputProps()} />
                  <Music className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-600">Upload Audio File</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Drag & drop or click to select MP3, WAV, or M4A files
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-6 border-t">
            <button
              type="submit"
              disabled={loading || !uploads.video}
              className="w-full md:w-auto px-8 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Creating Project...</span>
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  <span>Create Project</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}