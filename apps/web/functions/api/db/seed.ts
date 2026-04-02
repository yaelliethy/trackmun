import { getDb } from '../db/client';
import { users } from '../db/schema';
/**
 * Seed an admin user into the database.
 * This is intended to be run from a script or during initial setup.
 */
export async function seedAdmin(uid: string, email: string, name: string) {
  const db = getDb();
  
  console.log(`Seeding admin user: ${email} (${uid})`);
  
  await db
    .insert(users)
    .values({
      id: uid,
      email,
      name,
      role: 'admin',
    })
    .onConflictDoUpdate({
      target: users.id,
      set: {
        role: 'admin',
        email,
        name,
      },
    })
    .run();
    
  console.log('Admin user seeded successfully.');
}
