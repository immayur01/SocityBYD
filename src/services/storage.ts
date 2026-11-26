import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { supabase, isSupabaseConfigured } from './supabase';

export type R2Folder = 'posts' | 'food' | 'complaints' | 'avatars' | 'chat';

export interface PresignedUrlResponse {
  uploadUrl: string;
  publicUrl: string;
  key: string;
}

/**
 * Uploads any media item (image, video, or document) to Cloudflare R2 via Supabase Edge Function.
 * Includes image auto-compression (max 1080px width, 0.75 JPEG quality).
 * Gracefully falls back to local URI when Supabase/R2 is not configured or in offline demo mode.
 */
export async function uploadMediaToR2(
  localUri: string,
  folder: R2Folder = 'posts',
  mimeType?: string,
  fileName?: string
): Promise<string> {
  if (!localUri) return '';

  // Remote URLs (already hosted) can be returned as-is
  if (localUri.startsWith('http://') || localUri.startsWith('https://')) {
    return localUri;
  }

  // Graceful fallback for local development without Supabase/R2 credentials
  if (!isSupabaseConfigured) {
    return localUri;
  }

  let uploadUri = localUri;
  let resolvedMime = mimeType || 'application/octet-stream';
  const nameToUse = fileName || `asset_${Date.now()}`;

  // 1. Auto-compress images if applicable (strictly exclude video/documents)
  const isImage =
    !resolvedMime.startsWith('video/') &&
    !resolvedMime.startsWith('application/') &&
    !/\.(pdf|mp4|mov|m4v|avi|docx?|xlsx?)$/i.test(localUri) &&
    !/\.(pdf|mp4|mov|m4v|avi|docx?|xlsx?)$/i.test(nameToUse) &&
    (resolvedMime.startsWith('image/') ||
      /\.(jpe?g|png|webp|heic)$/i.test(localUri) ||
      /\.(jpe?g|png|webp|heic)$/i.test(nameToUse));

  if (isImage) {
    try {
      const manipulated = await manipulateAsync(
        localUri,
        [{ resize: { width: 1080 } }],
        { compress: 0.75, format: SaveFormat.JPEG }
      );
      uploadUri = manipulated.uri;
      resolvedMime = 'image/jpeg';
    } catch (compressionErr) {
      console.warn('[storage] Image compression skipped, using original:', compressionErr);
    }
  }

  try {
    // 2. Request Presigned PUT URL from Supabase Edge Function
    const { data, error } = await supabase.functions.invoke<PresignedUrlResponse>(
      'get-r2-upload-url',
      {
        body: {
          fileName: nameToUse,
          contentType: resolvedMime,
          folder,
        },
      }
    );

    if (error || !data?.uploadUrl) {
      console.warn(
        '[storage] Failed to obtain R2 presigned URL from Edge Function, falling back to local URI:',
        error?.message || 'Empty upload URL response'
      );
      return uploadUri;
    }

    // 3. Convert local file to Blob and PUT directly to Cloudflare R2
    let blob: Blob;
    try {
      const fileResponse = await fetch(uploadUri);
      blob = await fileResponse.blob();
    } catch {
      // Fallback using XMLHttpRequest for stubborn Android content:// URIs
      blob = await new Promise<Blob>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = () => resolve(xhr.response);
        xhr.onerror = () => reject(new Error('Failed to read local media blob'));
        xhr.responseType = 'blob';
        xhr.open('GET', uploadUri, true);
        xhr.send(null);
      });
    }

    const uploadResponse = await fetch(data.uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': resolvedMime,
      },
      body: blob,
    });

    if (!uploadResponse.ok) {
      console.warn(
        `[storage] R2 direct PUT upload returned HTTP ${uploadResponse.status}, falling back to local URI.`
      );
      return uploadUri;
    }

    // 4. Return permanent Cloudflare R2 public URL
    return data.publicUrl;
  } catch (err: any) {
    console.warn('[storage] Cloudflare R2 upload error, falling back to local URI:', err?.message || err);
    return uploadUri;
  }
}
