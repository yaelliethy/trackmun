import { api } from './api';
import type {
  FeedResponse,
  Post,
  Reply,
  LikeResponse,
  CreatePost,
  CreateReply,
  UploadUrlRequest,
  UploadUrlResponse,
} from '@trackmun/shared';

// Query key factory — use consistently across all press components
export const pressKeys = {
  feed: () => ['press', 'feed'] as const,
  replies: (postId: string) => ['press', 'replies', postId] as const,
};

export const fetchFeed = (cursor?: number): Promise<FeedResponse> =>
  api.get(`/press/feed${cursor ? `?cursor=${cursor}` : ''}`);

export const createPost = (data: CreatePost): Promise<Post> =>
  api.post('/press/posts', data);

export const deletePost = (postId: string): Promise<null> =>
  api.delete(`/press/posts/${postId}`);

export const toggleLike = (postId: string): Promise<LikeResponse> =>
  api.post(`/press/posts/${postId}/like`, {});

export const fetchReplies = (
  postId: string,
  cursor?: number,
): Promise<{ replies: Reply[]; nextCursor: number | null }> =>
  api.get(`/press/posts/${postId}/replies${cursor ? `?cursor=${cursor}` : ''}`);

export const createReply = (postId: string, data: CreateReply): Promise<Reply> =>
  api.post(`/press/posts/${postId}/replies`, data);

export const deleteReply = (postId: string, replyId: string): Promise<null> =>
  api.delete(`/press/posts/${postId}/replies/${replyId}`);

export const getUploadUrl = (data: UploadUrlRequest): Promise<UploadUrlResponse> =>
  api.post('/press/media/upload-url', data);

// Direct PUT to R2 presigned URL — NOT via api client (no auth header needed)
export const uploadFileToR2 = async (uploadUrl: string, file: File): Promise<void> => {
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type },
  });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
};

export const searchUsers = (query: string): Promise<{ id: string; displayName: string; role: string; council: string | null }[]> =>
  api.get(`/press/search/users?q=${encodeURIComponent(query)}`);

export const searchPosts = (query: string): Promise<Post[]> =>
  api.get(`/press/search/posts?q=${encodeURIComponent(query)}`);

export const getUserProfile = (userId: string): Promise<{ user: { id: string; name: string; role: string; council: string | null; chairTitle: string | null }; posts: Post[]; nextCursor: number | null }> =>
  api.get(`/press/users/${userId}`);
