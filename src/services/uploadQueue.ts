import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { postsService } from './posts';
import { island } from '@/context/IslandContext';
import { Post, PostTag } from '@/types';

export const DRAFT_STORAGE_KEY = 'draft_society_post_v2';

export interface AttachedMediaItem {
  type: 'image' | 'video';
  uri: string;
  name: string;
  width?: number;
  height?: number;
  duration?: number;
  size?: number;
}

export interface AttachedDocumentItem {
  type: 'file';
  uri: string;
  name: string;
  size?: number;
  mimeType?: string;
}

export interface UploadTaskPayload {
  mode: 'POST' | 'EVENT' | 'NOTICE';
  caption: string;
  mediaItems: AttachedMediaItem[];
  documentItem?: AttachedDocumentItem | null;
  audience: string;
  allowComments: boolean;
  // Event
  eventTitle?: string;
  eventDate?: string;
  eventTime?: string;
  eventVenue?: string;
  eventDetails?: string;
  eventCoverUri?: string;
  rsvpEnabled?: boolean;
  // Notice
  noticeHeadline?: string;
  noticePriority?: 'normal' | 'urgent';
  noticeMessage?: string;
  pinDuration?: 'Off' | '24 Hours' | '7 Days';
}

type UploadSuccessListener = (post: Post) => void;

class UploadQueue {
  private listeners: Set<UploadSuccessListener> = new Set();
  private lastFailedPayload: UploadTaskPayload | null = null;
  private isUploading: boolean = false;

  public subscribe(listener: UploadSuccessListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifySuccess(post: Post) {
    this.listeners.forEach((fn) => {
      try {
        fn(post);
      } catch (e) {
        console.warn('Listener error on post created:', e);
      }
    });
  }

  public async saveDraft(payload: UploadTaskPayload): Promise<void> {
    try {
      await AsyncStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.warn('Failed to save draft:', e);
    }
  }

  public async loadDraft(): Promise<UploadTaskPayload | null> {
    try {
      const data = await AsyncStorage.getItem(DRAFT_STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  }

  public async clearDraft(): Promise<void> {
    try {
      await AsyncStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch (e) {
      // ignore
    }
  }

  public async enqueueUpload(payload: UploadTaskPayload): Promise<void> {
    if (this.isUploading) {
      // Still process, but queue or continue
    }
    this.isUploading = true;
    this.lastFailedPayload = null;

    const firstMedia = payload.mediaItems[0];
    const thumbnailUri = firstMedia?.type === 'image' ? firstMedia.uri : payload.eventCoverUri;
    const mediaIconType =
      payload.mode === 'EVENT' ? 'event' : payload.mode === 'NOTICE' ? 'notice' : 'post';

    const statusTitle =
      payload.mode === 'EVENT'
        ? 'Publishing Event...'
        : payload.mode === 'NOTICE'
        ? 'Publishing Notice...'
        : 'Posting...';

    // 1. Initial State: Expand Island with 10% progress
    island.upload(statusTitle, 0.1, {
      thumbnailUri,
      mediaIconType,
      onRetry: () => this.enqueueUpload(payload),
    });

    try {
      let finalMediaUrl: string | undefined;
      let finalMediaType: 'image' | 'video' | 'file' | undefined;
      let finalFileName: string | undefined;
      let finalFileSize: number | undefined;

      // 2. Compress & upload first media if present
      if (firstMedia) {
        island.updateUploadProgress(0.25);
        let uriToUpload = firstMedia.uri;

        if (firstMedia.type === 'image') {
          try {
            // Compress image to max 1080 width, 0.8 quality
            const actions: any[] = [];
            if (firstMedia.width && firstMedia.width > 1080) {
              actions.push({ resize: { width: 1080 } });
            }
            const manipulated = await manipulateAsync(firstMedia.uri, actions, {
              compress: 0.8,
              format: SaveFormat.JPEG,
            });
            uriToUpload = manipulated.uri;
          } catch (compErr) {
            console.warn('Compression error, using original:', compErr);
          }
        }

        island.updateUploadProgress(0.5);
        finalMediaUrl = await postsService.uploadMedia(
          uriToUpload,
          firstMedia.name,
          firstMedia.type === 'image' ? 'image/jpeg' : 'video/mp4'
        );
        finalMediaType = firstMedia.type;
        finalFileName = firstMedia.name;
        finalFileSize = firstMedia.size;
      } else if (payload.eventCoverUri) {
        island.updateUploadProgress(0.4);
        finalMediaUrl = await postsService.uploadMedia(
          payload.eventCoverUri,
          `event_cover_${Date.now()}.jpg`,
          'image/jpeg'
        );
        finalMediaType = 'image';
        finalFileName = 'cover.jpg';
      } else if (payload.documentItem) {
        island.updateUploadProgress(0.5);
        finalMediaUrl = await postsService.uploadMedia(
          payload.documentItem.uri,
          payload.documentItem.name,
          payload.documentItem.mimeType
        );
        finalMediaType = 'file';
        finalFileName = payload.documentItem.name;
        finalFileSize = payload.documentItem.size;
      }

      island.updateUploadProgress(0.75);

      // 3. Assemble parameters according to mode
      const postTag: PostTag =
        payload.mode === 'EVENT'
          ? 'Event'
          : payload.mode === 'NOTICE'
          ? 'Announcement'
          : 'Photo/Video Post';

      const content =
        payload.mode === 'EVENT'
          ? payload.eventDetails?.trim() || payload.eventTitle?.trim() || ''
          : payload.mode === 'NOTICE'
          ? payload.noticeMessage?.trim() || payload.noticeHeadline?.trim() || ''
          : payload.caption.trim();

      const combinedEventDateTime = [payload.eventDate, payload.eventTime]
        .filter(Boolean)
        .join(' · ');

      // 4. Create Post in backend / service
      const newPost = await postsService.createPost({
        tag: postTag,
        title:
          payload.mode === 'EVENT'
            ? payload.eventTitle?.trim()
            : payload.mode === 'NOTICE'
            ? payload.noticeHeadline?.trim()
            : undefined,
        content,
        mediaUrl: finalMediaUrl,
        mediaType: finalMediaType,
        fileName: finalFileName,
        fileSize: finalFileSize,
        eventDate: payload.mode === 'EVENT' && combinedEventDateTime ? combinedEventDateTime : undefined,
        eventLocation: payload.mode === 'EVENT' ? payload.eventVenue?.trim() : undefined,
        announcementPriority: payload.mode === 'NOTICE' ? payload.noticePriority : undefined,
      });

      // 5. Success Transition: 100% -> Checkmark
      island.updateUploadProgress(1.0);
      this.isUploading = false;
      await this.clearDraft();

      setTimeout(() => {
        const successMessage =
          payload.mode === 'EVENT'
            ? 'Event published'
            : payload.mode === 'NOTICE'
            ? 'Notice published'
            : 'Posted to Ashtavinayak Empire';

        island.success(successMessage, undefined, { duration: 2500 });
        this.notifySuccess(newPost);
      }, 250);
    } catch (err: any) {
      console.warn('Background upload failed:', err);
      this.isUploading = false;
      this.lastFailedPayload = payload;

      island.uploadError(
        'Upload failed · Tap to Retry',
        () => this.enqueueUpload(payload),
        () => island.dismiss()
      );
    }
  }

  public getFailedPayload(): UploadTaskPayload | null {
    return this.lastFailedPayload;
  }
}

export const uploadQueue = new UploadQueue();
