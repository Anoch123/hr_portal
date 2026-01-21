import { supabase } from './supabase'

const BUCKETS = {
  DOCUMENTS: 'documents',
  AVATARS: 'avatars',
  ATTACHMENTS: 'attachments',
}

export async function uploadFile(
  file: File,
  bucket: string,
  path: string,
  userId: string
) {
  try {
    const filePath = `${userId}/${path}/${file.name}`

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (error) throw error

    // Record in database
    await supabase.from('file_uploads').insert({
      user_id: userId,
      file_name: file.name,
      file_path: data.path,
      file_size: file.size,
      file_type: file.type,
      bucket_name: bucket,
    })

    return { filePath: data.path, error: null }
  } catch (error) {
    return { filePath: null, error }
  }
}

export async function getFileUrl(bucket: string, path: string) {
  try {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path)

    return { url: data.publicUrl, error: null }
  } catch (error) {
    return { url: null, error }
  }
}

export async function downloadFile(bucket: string, path: string) {
  try {
    const { data, error } = await supabase.storage.from(bucket).download(path)

    if (error) throw error

    return { data, error: null }
  } catch (error) {
    return { data: null, error }
  }
}

export async function deleteFile(bucket: string, path: string) {
  try {
    const { error } = await supabase.storage.from(bucket).remove([path])

    if (error) throw error

    // Remove from database
    await supabase
      .from('file_uploads')
      .delete()
      .eq('file_path', path)
      .eq('bucket_name', bucket)

    return { error: null }
  } catch (error) {
    return { error }
  }
}

export async function createSignedUrl(
  bucket: string,
  path: string,
  expiresIn: number = 3600
) {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn)

    if (error) throw error

    return { signedUrl: data.signedUrl, error: null }
  } catch (error) {
    return { signedUrl: null, error }
  }
}

export { BUCKETS }
