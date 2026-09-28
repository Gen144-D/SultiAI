import { eq, desc, asc, sql } from 'drizzle-orm';
import { getDb } from '../connection';
import * as schema from '../schema-pg';

export async function getPosts(): Promise<any[]> {
  const db = getDb();
  return await (db as any)
    .select({
      postId: schema.communityPosts.postId,
      userId: schema.communityPosts.userId,
      title: schema.communityPosts.title,
      content: schema.communityPosts.content,
      phrase: schema.communityPosts.phrase,
      translation: schema.communityPosts.translation,
      category: schema.communityPosts.category,
      likesCount: schema.communityPosts.likesCount,
      createdAt: schema.communityPosts.createdAt,
      authorName: schema.users.fullname,
      authorRole: schema.users.role,
      authorVerified: schema.users.isVerified,
      commentsCount: sql<number>`(select count(*) from ${schema.comments} where ${schema.comments.postId} = ${schema.communityPosts.postId})`,
    })
    .from(schema.communityPosts)
    .leftJoin(schema.users, eq(schema.communityPosts.userId, schema.users.userId))
    .orderBy(desc(schema.communityPosts.createdAt));
}

export async function getResources(): Promise<any[]> {
  const db = getDb();
  return await (db as any)
    .select({
      postId: schema.communityPosts.postId,
      userId: schema.communityPosts.userId,
      title: schema.communityPosts.title,
      content: schema.communityPosts.content,
      phrase: schema.communityPosts.phrase,
      translation: schema.communityPosts.translation,
      category: schema.communityPosts.category,
      createdAt: schema.communityPosts.createdAt,
      authorName: schema.users.fullname,
    })
    .from(schema.communityPosts)
    .leftJoin(schema.users, eq(schema.communityPosts.userId, schema.users.userId))
    .orderBy(desc(schema.communityPosts.createdAt));
}

export async function getUserIdByEmail(email: string): Promise<number | undefined> {
  const db = getDb();
  const rows = await (db as any)
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .limit(1);
  return rows[0]?.userId;
}

export async function createPost(
  userId: number,
  data: {
    title?: string;
    content?: string;
    phrase?: string;
    translation?: string;
    category?: string;
  }
): Promise<number> {
  const db = getDb();
  const result = await (db as any)
    .insert(schema.communityPosts)
    .values({
      userId,
      title: data.title ?? null,
      content: data.content ?? null,
      phrase: data.phrase ?? null,
      translation: data.translation ?? null,
      category: data.category ?? null,
    })
    .returning();
  return result[0].postId;
}
export async function getComments(postId: number): Promise<any[]> {
  const db = getDb();
  return await (db as any)
    .select({
      commentId: schema.comments.commentId,
      postId: schema.comments.postId,
      userId: schema.comments.userId,
      comment: schema.comments.comment,
      createdAt: schema.comments.createdAt,
      authorName: schema.users.fullname,
    })
    .from(schema.comments)
    .leftJoin(schema.users, eq(schema.comments.userId, schema.users.userId))
    .where(eq(schema.comments.postId, postId))
    .orderBy(asc(schema.comments.createdAt));
}

export async function createComment(
  postId: number,
  userId: number,
  comment: string
): Promise<number> {
  const db = getDb();
  const result = await (db as any)
    .insert(schema.comments)
    .values({ postId, userId, comment })
    .returning();
  return result[0].commentId;
}
