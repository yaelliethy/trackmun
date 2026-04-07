import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { Bindings } from '../../types/env';
import { AuthContext, withAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import {
  PostSchema,
  ReplySchema,
  FeedResponseSchema,
  CreatePostSchema,
  CreateReplySchema,
  UploadUrlResponseSchema,
  LikeResponseSchema,
} from '@trackmun/shared';
import { pressController } from '../../controllers/press/press.controller';

const routes = new OpenAPIHono<{ Bindings: Bindings; Variables: AuthContext }>();

routes.use('*', withAuth, requireRole('delegate', 'oc', 'chair', 'admin', 'press'));

// GET /press/feed
routes.openapi(
  createRoute({
    method: 'get',
    path: '/feed',
    request: {
      query: z.object({ cursor: z.string().optional() }),
    },
    responses: {
      200: {
        content: {
          'application/json': {
            schema: z.object({
              success: z.literal(true),
              data: FeedResponseSchema,
            }),
          },
        },
        description: 'Get feed posts with cursor-based pagination',
      },
    },
    summary: 'Get feed',
  }),
  pressController.getFeed as any
);

// POST /press/posts
routes.openapi(
  createRoute({
    method: 'post',
    path: '/posts',
    request: {
      body: {
        content: {
          'application/json': {
            schema: CreatePostSchema,
          },
        },
      },
    },
    responses: {
      200: {
        content: {
          'application/json': {
            schema: z.object({
              success: z.literal(true),
              data: PostSchema,
            }),
          },
        },
        description: 'Create a new post',
      },
    },
    summary: 'Create post',
  }),
  pressController.createPost as any
);

// DELETE /press/posts/:id
routes.openapi(
  createRoute({
    method: 'delete',
    path: '/posts/{id}',
    request: {
      params: z.object({ id: z.string() }),
    },
    responses: {
      200: {
        content: {
          'application/json': {
            schema: z.object({
              success: z.literal(true),
              data: z.null(),
            }),
          },
        },
        description: 'Delete a post',
      },
      404: {
        content: {
          'application/json': {
            schema: z.object({ success: z.literal(false), error: z.string(), code: z.string() }),
          },
        },
        description: 'Post not found',
      },
      403: {
        content: {
          'application/json': {
            schema: z.object({ success: z.literal(false), error: z.string(), code: z.string() }),
          },
        },
        description: 'Forbidden',
      },
    },
    summary: 'Delete post',
  }),
  pressController.deletePost as any
);

// POST /press/posts/:id/like
routes.openapi(
  createRoute({
    method: 'post',
    path: '/posts/{id}/like',
    request: {
      params: z.object({ id: z.string() }),
    },
    responses: {
      200: {
        content: {
          'application/json': {
            schema: z.object({
              success: z.literal(true),
              data: LikeResponseSchema,
            }),
          },
        },
        description: 'Toggle like on a post',
      },
    },
    summary: 'Toggle like',
  }),
  pressController.toggleLike as any
);

// GET /press/posts/:id/replies
routes.openapi(
  createRoute({
    method: 'get',
    path: '/posts/{id}/replies',
    request: {
      params: z.object({ id: z.string() }),
      query: z.object({ cursor: z.string().optional() }),
    },
    responses: {
      200: {
        content: {
          'application/json': {
            schema: z.object({
              success: z.literal(true),
              data: z.object({
                replies: z.array(ReplySchema),
                nextCursor: z.number().int().nullable(),
              }),
            }),
          },
        },
        description: 'Get replies for a post',
      },
    },
    summary: 'Get replies',
  }),
  pressController.getReplies as any
);

// POST /press/posts/:id/replies
routes.openapi(
  createRoute({
    method: 'post',
    path: '/posts/{id}/replies',
    request: {
      params: z.object({ id: z.string() }),
      body: {
        content: {
          'application/json': {
            schema: CreateReplySchema,
          },
        },
      },
    },
    responses: {
      200: {
        content: {
          'application/json': {
            schema: z.object({
              success: z.literal(true),
              data: ReplySchema,
            }),
          },
        },
        description: 'Create a reply to a post',
      },
    },
    summary: 'Create reply',
  }),
  pressController.createReply as any
);

// POST /press/media/upload-url
routes.openapi(
  createRoute({
    method: 'post',
    path: '/media/upload-url',
    request: {
      body: {
        content: {
          'application/json': {
            schema: z.object({
              filename: z.string(),
              mediaType: z.enum(['image', 'video']),
              contentType: z.string(),
            }),
          },
        },
      },
    },
    responses: {
      200: {
        content: {
          'application/json': {
            schema: z.object({
              success: z.literal(true),
              data: UploadUrlResponseSchema,
            }),
          },
        },
        description: 'Get a presigned upload URL for post media',
      },
    },
    summary: 'Get media upload URL',
  }),
  pressController.getUploadUrl
);

// GET /press/search/users
routes.openapi(
  createRoute({
    method: 'get',
    path: '/search/users',
    request: {
      query: z.object({ q: z.string().optional() }),
    },
    responses: {
      200: {
        content: {
          'application/json': {
            schema: z.object({
              success: z.literal(true),
              data: z.array(z.any()), // You could define a proper SearchUserResultSchema
            }),
          },
        },
        description: 'Search users by name',
      },
    },
    summary: 'Search users',
  }),
  pressController.searchUsers
);

// GET /press/search/posts
routes.openapi(
  createRoute({
    method: 'get',
    path: '/search/posts',
    request: {
      query: z.object({ q: z.string().optional() }),
    },
    responses: {
      200: {
        content: {
          'application/json': {
            schema: z.object({
              success: z.literal(true),
              data: z.array(PostSchema),
            }),
          },
        },
        description: 'Search posts by body content',
      },
    },
    summary: 'Search posts',
  }),
  pressController.searchPosts
);

// GET /press/users/:userId
routes.openapi(
  createRoute({
    method: 'get',
    path: '/users/{userId}',
    request: {
      params: z.object({ userId: z.string() }),
    },
    responses: {
      200: {
        content: {
          'application/json': {
            schema: z.object({
              success: z.literal(true),
              data: z.object({
                profile: z.any(), // Profile schema
                posts: z.array(PostSchema),
              }),
            }),
          },
        },
        description: 'Get user profile and their posts',
      },
      404: {
        content: {
          'application/json': {
            schema: z.object({ success: z.literal(false), error: z.string(), code: z.string() }),
          },
        },
        description: 'User not found',
      },
    },
    summary: 'Get user profile',
  }),
  pressController.getUserProfile
);

export default routes;
