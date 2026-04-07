import { Context } from 'hono';
import { Bindings } from '../../types/env';
import { AuthContext } from '../../middleware/auth';
import { PressService } from '../../services/press/press.service';
import { getDb } from '../../db/client';

type PressContext = Context<{ Bindings: Bindings; Variables: AuthContext }>;

export class PressController {
  private getService = () => new PressService(getDb());

  getFeed = async (c: PressContext) => {
    const user = c.get('user');
    const query = c.req.valid('query');
    const cursor = query.cursor ? parseInt(query.cursor, 10) : undefined;

    const result = await this.getService().getFeed(user.id, cursor);

    return c.json({ success: true as const, data: result });
  };

  createPost = async (c: PressContext) => {
    const user = c.get('user');
    const body = c.req.valid('json');

    const result = await this.getService().createPost(user.id, body.body, body.mediaKeys);

    return c.json({ success: true as const, data: result });
  };

  deletePost = async (c: PressContext) => {
    const user = c.get('user');
    const { id } = c.req.valid('param');

    try {
      await this.getService().deletePost(id, user.id, user.role);
    } catch (err) {
      if (err instanceof Error && err.message === 'NOT_FOUND') {
        return c.json({ success: false as const, error: 'Post not found', code: 'NOT_FOUND' }, 404);
      }
      if (err instanceof Error && err.message === 'FORBIDDEN') {
        return c.json({ success: false as const, error: 'Forbidden', code: 'FORBIDDEN' }, 403);
      }
      throw err;
    }

    return c.json({ success: true as const, data: null });
  };

  toggleLike = async (c: PressContext) => {
    const user = c.get('user');
    const { id } = c.req.valid('param');

    const result = await this.getService().toggleLike(id, user.id);

    return c.json({ success: true as const, data: result });
  };

  getReplies = async (c: PressContext) => {
    const { id } = c.req.valid('param');
    const query = c.req.valid('query');
    const cursor = query.cursor ? parseInt(query.cursor, 10) : undefined;

    const result = await this.getService().getReplies(id, cursor);

    return c.json({ success: true as const, data: result });
  };

  createReply = async (c: PressContext) => {
    const user = c.get('user');
    const { id } = c.req.valid('param');
    const body = c.req.valid('json');

    const result = await this.getService().createReply(id, user.id, body.body);

    return c.json({ success: true as const, data: result });
  };

  getUploadUrl = async (c: PressContext) => {
    const user = c.get('user');
    const body = c.req.valid('json');

    const result = await this.getService().getUploadUrl(
      user.id,
      body.filename,
      body.contentType,
      c.env
    );

    return c.json({ success: true as const, data: result });
  };

  searchUsers = async (c: PressContext) => {
    const query = c.req.valid('query');
    const result = await this.getService().searchUsers(query.q || '');
    return c.json({ success: true as const, data: result });
  };

  searchPosts = async (c: PressContext) => {
    const query = c.req.valid('query');
    const result = await this.getService().searchPosts(query.q || '');
    return c.json({ success: true as const, data: result });
  };

  getUserProfile = async (c: PressContext) => {
    const user = c.get('user');
    const { userId } = c.req.valid('param');

    try {
      const result = await this.getService().getUserProfile(userId, user.id);
      return c.json({ success: true as const, data: result });
    } catch (err) {
      if (err instanceof Error && err.message === 'NOT_FOUND') {
        return c.json({ success: false as const, error: 'User not found', code: 'NOT_FOUND' }, 404);
      }
      throw err;
    }
  };
}

export const pressController = new PressController();
