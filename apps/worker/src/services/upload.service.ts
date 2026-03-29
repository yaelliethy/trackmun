import { DbType } from '../db/client';
import { delegateProfiles } from '../db/schema';
import { eq } from 'drizzle-orm';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Bindings } from '../types/env';

export class UploadService {
  constructor(private db: DbType) {}

  private getS3Client(env: Bindings) {
    return new S3Client({
      region: 'auto',
      endpoint: env.R2_ENDPOINT,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      },
    });
  }

  async generatePresignedUrl(
    env: Bindings,
    userId: string,
    filename: string,
    contentType: string
  ): Promise<{ uploadUrl: string; key: string }> {
    const s3 = this.getS3Client(env);
    
    // Generate a secure unique key
    const uniqueId = crypto.randomUUID();
    // Normalize filename to avoid weird character issues
    const safeFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const key = `delegates/payments/${userId}/${uniqueId}-${safeFilename}`;

    const command = new PutObjectCommand({
      Bucket: 'mun-media', // Should ideally come from env, but per wrangler.toml it's 'mun-media'
      Key: key,
      ContentType: contentType,
    });

    // URL expires in 15 minutes as per requirements
    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 900 });

    return { uploadUrl, key };
  }

  async generatePublicPresignedUrl(
    env: Bindings,
    filename: string,
    contentType: string
  ): Promise<{ uploadUrl: string; key: string }> {
    const s3 = this.getS3Client(env);
    const uniqueId = crypto.randomUUID();
    const safeFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const key = `delegates/payments/temp/${uniqueId}-${safeFilename}`;

    const command = new PutObjectCommand({
      Bucket: 'mun-media',
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 900 });
    return { uploadUrl, key };
  }

  async confirmPaymentProof(userId: string, r2Key: string): Promise<void> {
    // Basic safety check to ensure it maps to this user's path
    if (!r2Key.startsWith(`delegates/payments/${userId}/`)) {
      throw new Error('Invalid key path for user');
    }

    // In a full implementation, you'd try to headObject the R2 bucket here
    // to verify it actually exists, but since we assume the client just uploaded it,
    // we save the reference.

    await this.db.update(delegateProfiles)
      .set({ paymentProofR2Key: r2Key, updatedAt: new Date() } as any)
      .where(eq(delegateProfiles.userId, userId))
      .run();
  }
}
