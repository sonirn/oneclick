import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

export const r2Storage = {
  // Upload file to R2
  uploadFile: async (key: string, file: Buffer, contentType: string) => {
    try {
      const command = new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
        Body: file,
        ContentType: contentType,
      })
      
      const result = await r2Client.send(command)
      return {
        success: true,
        url: `${process.env.R2_ENDPOINT}/${process.env.R2_BUCKET_NAME}/${key}`,
        key,
        result
      }
    } catch (error) {
      console.error('R2 upload error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      }
    }
  },

  // Get signed URL for direct upload
  getSignedUploadUrl: async (key: string, contentType: string, expiresIn: number = 3600) => {
    try {
      const command = new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
        ContentType: contentType,
      })
      
      const url = await getSignedUrl(r2Client, command, { expiresIn })
      return { success: true, url }
    } catch (error) {
      console.error('R2 signed URL error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get signed URL'
      }
    }
  },

  // Get signed URL for download
  getSignedDownloadUrl: async (key: string, expiresIn: number = 3600) => {
    try {
      const command = new GetObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
      })
      
      const url = await getSignedUrl(r2Client, command, { expiresIn })
      return { success: true, url }
    } catch (error) {
      console.error('R2 download URL error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get download URL'
      }
    }
  },

  // Delete file from R2
  deleteFile: async (key: string) => {
    try {
      const command = new DeleteObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
      })
      
      await r2Client.send(command)
      return { success: true }
    } catch (error) {
      console.error('R2 delete error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Delete failed'
      }
    }
  }
}

export default r2Storage