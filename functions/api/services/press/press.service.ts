import { DbType } from '../../db/client';
import { posts, postMedia, postLikes, postReplies, users, delegateProfiles, councils, countryAssignments } from '../../db/schema';
import { eq, and, lt, gt, desc, asc, inArray, sql, like } from 'drizzle-orm';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Bindings } from '../../types/env';
import { Post, PostMedia, Reply } from '@trackmun/shared';

export class PressService {
  constructor(private db: DbType) {}

  private resolveDisplayName(
    user: {
      name: string;
      role: string;
      chairTitle?: string | null;
      councilName?: string | null;
      councilShortName?: string | null;
      country?: string | null;
      pressAgency?: string | null;
      assignedCountry?: string | null;
    }
  ): string {
    if (user.role === 'press') {
      return user.pressAgency || user.name;
    }
    if (user.role === 'delegate') {
      const country = user.assignedCountry || user.country;
      if (country && user.councilShortName) {
        return `Delegation of ${country} - ${user.councilShortName}`;
      }
      return user.name;
    }
    if (user.role === 'chair') {
      if (user.councilName) {
        if (user.chairTitle) {
          return `${user.chairTitle} of ${user.councilName}`;
        }
        return `Chair of ${user.councilName}`;
      }
      return user.name;
    }
    return user.name;
  }

  async getFeed(
    userId: string,
    cursor?: number
  ): Promise<{ posts: Post[]; nextCursor: number | null }> {
    const likesCountSubquery = sql<number>`(SELECT COUNT(*) FROM post_likes WHERE post_id = posts.id)`;
    const replyCountSubquery = sql<number>`(SELECT COUNT(*) FROM post_replies WHERE post_id = posts.id)`;
    const likedByCurrentUserSubquery = sql<number>`(SELECT COUNT(*) FROM post_likes WHERE post_id = posts.id AND user_id = ${userId})`;

    const rows = await this.db
      .select({
        id: posts.id,
        body: posts.body,
        createdAt: posts.createdAt,
        updatedAt: posts.updatedAt,
        authorId: posts.authorId,
        authorName: users.name,
        authorRole: users.role,
        chairTitle: users.chairTitle,
        pressAgency: delegateProfiles.pressAgency,
        country: delegateProfiles.country,
        assignedCountry: countryAssignments.country,
        councilName: councils.name,
        councilShortName: councils.shortName,
        likesCount: likesCountSubquery,
        replyCount: replyCountSubquery,
        likedByCurrentUser: likedByCurrentUserSubquery,
      })
      .from(posts)
      .innerJoin(users, eq(users.id, posts.authorId))
      .leftJoin(delegateProfiles, eq(delegateProfiles.userId, users.id))
      .leftJoin(councils, eq(councils.id, users.council))
      .leftJoin(countryAssignments, and(eq(countryAssignments.userId, users.id), eq(countryAssignments.council, users.council)))
      .where(cursor ? lt(posts.createdAt, cursor) : undefined)
      .orderBy(desc(posts.createdAt))
      .limit(21)
      .all();

    let hasMore = false;
    let feedRows = rows;
    if (rows.length === 21) {
      feedRows = rows.slice(0, 20);
      hasMore = true;
    }

    const postIds = feedRows.map((r) => r.id);

    let mediaByPost: Record<string, PostMedia[]> = {};
    if (postIds.length > 0) {
      const mediaRows = await this.db
        .select()
        .from(postMedia)
        .where(inArray(postMedia.postId, postIds))
        .all();

      mediaByPost = {};
      for (const m of mediaRows) {
        const key = m.postId;
        if (!mediaByPost[key]) mediaByPost[key] = [];
        mediaByPost[key].push({
          id: m.id,
          mediaType: m.mediaType as 'image' | 'video',
          r2Key: m.r2Key,
          displayOrder: m.displayOrder,
        });
      }
    }

    const mappedPosts: Post[] = feedRows.map((r) => ({
      id: r.id,
      body: r.body,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      authorId: r.authorId,
      authorName: this.resolveDisplayName({
        name: r.authorName,
        role: r.authorRole,
        chairTitle: r.chairTitle,
        pressAgency: r.pressAgency,
        country: r.country,
        assignedCountry: r.assignedCountry,
        councilName: r.councilName,
        councilShortName: r.councilShortName,
      }),
      authorRole: r.authorRole as 'delegate' | 'oc' | 'chair' | 'admin' | 'press',
      likesCount: r.likesCount,
      replyCount: r.replyCount,
      likedByCurrentUser: Number(r.likedByCurrentUser) > 0,
      media: mediaByPost[r.id] ?? [],
    }));

    const nextCursor = hasMore && feedRows.length > 0 ? feedRows[feedRows.length - 1].createdAt : null;

    return { posts: mappedPosts, nextCursor };
  }

  async createPost(
    authorId: string,
    body: string,
    mediaKeys: string[]
  ): Promise<Post> {
    const postId = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);

    await this.db
      .insert(posts)
      .values({
        id: postId,
        authorId,
        body,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    if (mediaKeys.length > 0) {
      const mediaValues = mediaKeys.map((key, index) => {
        const ext = key.split('.').pop()?.toLowerCase() ?? '';
        const mediaType = ['mp4', 'mov', 'webm'].includes(ext) ? 'video' : 'image';
        return {
          id: crypto.randomUUID(),
          postId,
          mediaType,
          r2Key: key,
          displayOrder: index,
        };
      });

      await this.db.insert(postMedia).values(mediaValues).run();
    }

    return this.getPostById(postId);
  }

  private async getPostById(postId: string): Promise<Post> {
    const likesCountSubquery = sql<number>`(SELECT COUNT(*) FROM post_likes WHERE post_id = posts.id)`;
    const replyCountSubquery = sql<number>`(SELECT COUNT(*) FROM post_replies WHERE post_id = posts.id)`;

    const row = await this.db
      .select({
        id: posts.id,
        body: posts.body,
        createdAt: posts.createdAt,
        updatedAt: posts.updatedAt,
        authorId: posts.authorId,
        authorName: users.name,
        authorRole: users.role,
        chairTitle: users.chairTitle,
        pressAgency: delegateProfiles.pressAgency,
        country: delegateProfiles.country,
        assignedCountry: countryAssignments.country,
        councilName: councils.name,
        councilShortName: councils.shortName,
        likesCount: likesCountSubquery,
        replyCount: replyCountSubquery,
        likedByCurrentUser: sql<number>`0`,
      })
      .from(posts)
      .innerJoin(users, eq(users.id, posts.authorId))
      .leftJoin(delegateProfiles, eq(delegateProfiles.userId, users.id))
      .leftJoin(councils, eq(councils.id, users.council))
      .leftJoin(countryAssignments, and(eq(countryAssignments.userId, users.id), eq(countryAssignments.council, users.council)))
      .where(eq(posts.id, postId))
      .get();

    if (!row) {
      throw new Error('NOT_FOUND');
    }

    const mediaRows = await this.db
      .select()
      .from(postMedia)
      .where(eq(postMedia.postId, postId))
      .all();

    const media: PostMedia[] = mediaRows.map((m) => ({
      id: m.id,
      mediaType: m.mediaType as 'image' | 'video',
      r2Key: m.r2Key,
      displayOrder: m.displayOrder,
    }));

    return {
      id: row.id,
      body: row.body,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      authorId: row.authorId,
      authorName: this.resolveDisplayName({
        name: row.authorName,
        role: row.authorRole,
        chairTitle: row.chairTitle,
        pressAgency: row.pressAgency,
        country: row.country,
        assignedCountry: row.assignedCountry,
        councilName: row.councilName,
        councilShortName: row.councilShortName,
      }),
      authorRole: row.authorRole as 'delegate' | 'oc' | 'chair' | 'admin' | 'press',
      likesCount: row.likesCount,
      replyCount: row.replyCount,
      likedByCurrentUser: false,
      media,
    };
  }

  async toggleLike(
    postId: string,
    userId: string
  ): Promise<{ likedByCurrentUser: boolean; likesCount: number }> {
    const existing = await this.db
      .select()
      .from(postLikes)
      .where(and(eq(postLikes.postId, postId), eq(postLikes.userId, userId)))
      .get();

    if (existing) {
      await this.db
        .delete(postLikes)
        .where(and(eq(postLikes.postId, postId), eq(postLikes.userId, userId)))
        .run();
    } else {
      await this.db
        .insert(postLikes)
        .values({
          postId,
          userId,
          likedAt: Math.floor(Date.now() / 1000),
        })
        .run();
    }

    const countResult = await this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(postLikes)
      .where(eq(postLikes.postId, postId))
      .get();

    return {
      likedByCurrentUser: !existing,
      likesCount: countResult?.count ?? 0,
    };
  }

  async deletePost(
    postId: string,
    requesterId: string,
    requesterRole: string
  ): Promise<void> {
    const post = await this.db
      .select({ id: posts.id, authorId: posts.authorId })
      .from(posts)
      .where(eq(posts.id, postId))
      .get();

    if (!post) {
      throw new Error('NOT_FOUND');
    }

    if (post.authorId !== requesterId && requesterRole !== 'admin') {
      throw new Error('FORBIDDEN');
    }

    await this.db.delete(postMedia).where(eq(postMedia.postId, postId)).run();
    await this.db.delete(postLikes).where(eq(postLikes.postId, postId)).run();
    await this.db.delete(postReplies).where(eq(postReplies.postId, postId)).run();
    await this.db.delete(posts).where(eq(posts.id, postId)).run();
  }

  async getReplies(
    postId: string,
    cursor?: number
  ): Promise<{ replies: Reply[]; nextCursor: number | null }> {
    const rows = await this.db
      .select({
        id: postReplies.id,
        postId: postReplies.postId,
        body: postReplies.body,
        createdAt: postReplies.createdAt,
        authorId: postReplies.authorId,
        authorName: users.name,
        authorRole: users.role,
        chairTitle: users.chairTitle,
        pressAgency: delegateProfiles.pressAgency,
        country: delegateProfiles.country,
        assignedCountry: countryAssignments.country,
        councilName: councils.name,
        councilShortName: councils.shortName,
      })
      .from(postReplies)
      .innerJoin(users, eq(users.id, postReplies.authorId))
      .leftJoin(delegateProfiles, eq(delegateProfiles.userId, users.id))
      .leftJoin(councils, eq(councils.id, users.council))
      .leftJoin(countryAssignments, and(eq(countryAssignments.userId, users.id), eq(countryAssignments.council, users.council)))
      .where(
        cursor
          ? and(eq(postReplies.postId, postId), gt(postReplies.createdAt, cursor))
          : eq(postReplies.postId, postId)
      )
      .orderBy(asc(postReplies.createdAt))
      .limit(21)
      .all();

    let hasMore = false;
    let replyRows = rows;
    if (rows.length === 21) {
      replyRows = rows.slice(0, 20);
      hasMore = true;
    }

    const replies: Reply[] = replyRows.map((r) => ({
      id: r.id,
      postId: r.postId,
      body: r.body,
      createdAt: r.createdAt,
      authorId: r.authorId,
      authorName: this.resolveDisplayName({
        name: r.authorName,
        role: r.authorRole,
        chairTitle: r.chairTitle,
        pressAgency: r.pressAgency,
        country: r.country,
        assignedCountry: r.assignedCountry,
        councilName: r.councilName,
        councilShortName: r.councilShortName,
      }),
      authorRole: r.authorRole as 'delegate' | 'oc' | 'chair' | 'admin' | 'press',
    }));

    const nextCursor = hasMore && replyRows.length > 0 ? replyRows[replyRows.length - 1].createdAt : null;

    return { replies, nextCursor };
  }

  async createReply(
    postId: string,
    authorId: string,
    body: string
  ): Promise<Reply> {
    const replyId = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);

    await this.db
      .insert(postReplies)
      .values({
        id: replyId,
        postId,
        authorId,
        body,
        createdAt: now,
      })
      .run();

    const row = await this.db
      .select({
        id: postReplies.id,
        postId: postReplies.postId,
        body: postReplies.body,
        createdAt: postReplies.createdAt,
        authorId: postReplies.authorId,
        authorName: users.name,
        authorRole: users.role,
        chairTitle: users.chairTitle,
        pressAgency: delegateProfiles.pressAgency,
        country: delegateProfiles.country,
        assignedCountry: countryAssignments.country,
        councilName: councils.name,
        councilShortName: councils.shortName,
      })
      .from(postReplies)
      .innerJoin(users, eq(users.id, postReplies.authorId))
      .leftJoin(delegateProfiles, eq(delegateProfiles.userId, users.id))
      .leftJoin(councils, eq(councils.id, users.council))
      .leftJoin(countryAssignments, and(eq(countryAssignments.userId, users.id), eq(countryAssignments.council, users.council)))
      .where(eq(postReplies.id, replyId))
      .get();

    if (!row) {
      throw new Error('REPLY_NOT_FOUND');
    }

    return {
      id: row.id,
      postId: row.postId,
      body: row.body,
      createdAt: row.createdAt,
      authorId: row.authorId,
      authorName: this.resolveDisplayName({
        name: row.authorName,
        role: row.authorRole,
        chairTitle: row.chairTitle,
        pressAgency: row.pressAgency,
        country: row.country,
        assignedCountry: row.assignedCountry,
        councilName: row.councilName,
        councilShortName: row.councilShortName,
      }),
      authorRole: row.authorRole as 'delegate' | 'oc' | 'chair' | 'admin' | 'press',
    };
  }

  async getUploadUrl(
    userId: string,
    filename: string,
    contentType: string,
    env: Bindings
  ): Promise<{ uploadUrl: string; r2Key: string }> {
    const s3 = new S3Client({
      region: 'auto',
      endpoint: env.R2_ENDPOINT,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      },
    });

    const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `press/posts/${userId}/${crypto.randomUUID()}-${safeFilename}`;

    const command = new PutObjectCommand({
      Bucket: 'mun-media',
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });

    return { uploadUrl, r2Key: key };
  }

  async searchUsers(query: string): Promise<any[]> {
    if (!query || query.trim() === '') return [];

    const rows = await this.db
      .select({
        id: users.id,
        name: users.name,
        role: users.role,
        image: users.image,
        chairTitle: users.chairTitle,
        pressAgency: delegateProfiles.pressAgency,
        country: delegateProfiles.country,
        assignedCountry: countryAssignments.country,
        councilName: councils.name,
        councilShortName: councils.shortName,
      })
      .from(users)
      .leftJoin(delegateProfiles, eq(delegateProfiles.userId, users.id))
      .leftJoin(councils, eq(councils.id, users.council))
      .leftJoin(countryAssignments, and(eq(countryAssignments.userId, users.id), eq(countryAssignments.council, users.council)))
      .where(like(users.name, `%${query}%`))
      .limit(10)
      .all();

    return rows.map(r => ({
      id: r.id,
      name: this.resolveDisplayName({
        name: r.name,
        role: r.role,
        chairTitle: r.chairTitle,
        pressAgency: r.pressAgency,
        country: r.country,
        assignedCountry: r.assignedCountry,
        councilName: r.councilName,
        councilShortName: r.councilShortName,
      }),
      role: r.role,
      image: r.image,
    }));
  }

  async searchPosts(query: string): Promise<Post[]> {
    if (!query || query.trim() === '') return [];

    const likesCountSubquery = sql<number>`(SELECT COUNT(*) FROM post_likes WHERE post_id = posts.id)`;
    const replyCountSubquery = sql<number>`(SELECT COUNT(*) FROM post_replies WHERE post_id = posts.id)`;

    const rows = await this.db
      .select({
        id: posts.id,
        body: posts.body,
        createdAt: posts.createdAt,
        updatedAt: posts.updatedAt,
        authorId: posts.authorId,
        authorName: users.name,
        authorRole: users.role,
        chairTitle: users.chairTitle,
        pressAgency: delegateProfiles.pressAgency,
        country: delegateProfiles.country,
        assignedCountry: countryAssignments.country,
        councilName: councils.name,
        councilShortName: councils.shortName,
        likesCount: likesCountSubquery,
        replyCount: replyCountSubquery,
        likedByCurrentUser: sql<number>`0`,
      })
      .from(posts)
      .innerJoin(users, eq(users.id, posts.authorId))
      .leftJoin(delegateProfiles, eq(delegateProfiles.userId, users.id))
      .leftJoin(councils, eq(councils.id, users.council))
      .leftJoin(countryAssignments, and(eq(countryAssignments.userId, users.id), eq(countryAssignments.council, users.council)))
      .where(like(posts.body, `%${query}%`))
      .orderBy(desc(posts.createdAt))
      .limit(20)
      .all();

    const postIds = rows.map((r) => r.id);
    let mediaByPost: Record<string, PostMedia[]> = {};

    if (postIds.length > 0) {
      const mediaRows = await this.db
        .select()
        .from(postMedia)
        .where(inArray(postMedia.postId, postIds))
        .all();

      for (const m of mediaRows) {
        const key = m.postId;
        if (!mediaByPost[key]) mediaByPost[key] = [];
        mediaByPost[key].push({
          id: m.id,
          mediaType: m.mediaType as 'image' | 'video',
          r2Key: m.r2Key,
          displayOrder: m.displayOrder,
        });
      }
    }

    return rows.map((r) => ({
      id: r.id,
      body: r.body,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      authorId: r.authorId,
      authorName: this.resolveDisplayName({
        name: r.authorName,
        role: r.authorRole,
        chairTitle: r.chairTitle,
        pressAgency: r.pressAgency,
        country: r.country,
        assignedCountry: r.assignedCountry,
        councilName: r.councilName,
        councilShortName: r.councilShortName,
      }),
      authorRole: r.authorRole as 'delegate' | 'oc' | 'chair' | 'admin' | 'press',
      likesCount: r.likesCount,
      replyCount: r.replyCount,
      likedByCurrentUser: false,
      media: mediaByPost[r.id] ?? [],
    }));
  }

  async getUserProfile(userId: string, viewerId: string): Promise<any> {
    const userRow = await this.db
      .select({
        id: users.id,
        name: users.name,
        role: users.role,
        image: users.image,
        chairTitle: users.chairTitle,
        pressAgency: delegateProfiles.pressAgency,
        country: delegateProfiles.country,
        assignedCountry: countryAssignments.country,
        councilName: councils.name,
        councilShortName: councils.shortName,
      })
      .from(users)
      .leftJoin(delegateProfiles, eq(delegateProfiles.userId, users.id))
      .leftJoin(councils, eq(councils.id, users.council))
      .leftJoin(countryAssignments, and(eq(countryAssignments.userId, users.id), eq(countryAssignments.council, users.council)))
      .where(eq(users.id, userId))
      .get();

    if (!userRow) {
      throw new Error('NOT_FOUND');
    }

    const likesCountSubquery = sql<number>`(SELECT COUNT(*) FROM post_likes WHERE post_id = posts.id)`;
    const replyCountSubquery = sql<number>`(SELECT COUNT(*) FROM post_replies WHERE post_id = posts.id)`;
    const likedByCurrentUserSubquery = sql<number>`(SELECT COUNT(*) FROM post_likes WHERE post_id = posts.id AND user_id = ${viewerId})`;

    const rows = await this.db
      .select({
        id: posts.id,
        body: posts.body,
        createdAt: posts.createdAt,
        updatedAt: posts.updatedAt,
        authorId: posts.authorId,
        authorName: users.name,
        authorRole: users.role,
        chairTitle: users.chairTitle,
        pressAgency: delegateProfiles.pressAgency,
        country: delegateProfiles.country,
        assignedCountry: countryAssignments.country,
        councilName: councils.name,
        councilShortName: councils.shortName,
        likesCount: likesCountSubquery,
        replyCount: replyCountSubquery,
        likedByCurrentUser: likedByCurrentUserSubquery,
      })
      .from(posts)
      .innerJoin(users, eq(users.id, posts.authorId))
      .leftJoin(delegateProfiles, eq(delegateProfiles.userId, users.id))
      .leftJoin(councils, eq(councils.id, users.council))
      .leftJoin(countryAssignments, and(eq(countryAssignments.userId, users.id), eq(countryAssignments.council, users.council)))
      .where(eq(posts.authorId, userId))
      .orderBy(desc(posts.createdAt))
      .limit(20)
      .all();

    const postIds = rows.map((r) => r.id);
    let mediaByPost: Record<string, PostMedia[]> = {};

    if (postIds.length > 0) {
      const mediaRows = await this.db
        .select()
        .from(postMedia)
        .where(inArray(postMedia.postId, postIds))
        .all();

      for (const m of mediaRows) {
        const key = m.postId;
        if (!mediaByPost[key]) mediaByPost[key] = [];
        mediaByPost[key].push({
          id: m.id,
          mediaType: m.mediaType as 'image' | 'video',
          r2Key: m.r2Key,
          displayOrder: m.displayOrder,
        });
      }
    }

    const mappedPosts: Post[] = rows.map((r) => ({
      id: r.id,
      body: r.body,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      authorId: r.authorId,
      authorName: this.resolveDisplayName({
        name: r.authorName,
        role: r.authorRole,
        chairTitle: r.chairTitle,
        pressAgency: r.pressAgency,
        country: r.country,
        assignedCountry: r.assignedCountry,
        councilName: r.councilName,
        councilShortName: r.councilShortName,
      }),
      authorRole: r.authorRole as 'delegate' | 'oc' | 'chair' | 'admin' | 'press',
      likesCount: r.likesCount,
      replyCount: r.replyCount,
      likedByCurrentUser: Number(r.likedByCurrentUser) > 0,
      media: mediaByPost[r.id] ?? [],
    }));

    return {
      profile: {
        id: userRow.id,
        name: this.resolveDisplayName({
          name: userRow.name,
          role: userRow.role,
          chairTitle: userRow.chairTitle,
          pressAgency: userRow.pressAgency,
          country: userRow.country,
          assignedCountry: userRow.assignedCountry,
          councilName: userRow.councilName,
          councilShortName: userRow.councilShortName,
        }),
        role: userRow.role,
        image: userRow.image,
      },
      posts: mappedPosts
    };
  }
}
