import prisma from '@/lib/prismaClient';

/**
 * Ensures that a user exists in the database, creating one if needed
 * @param email User email from auth session (required)
 * @param name User name from auth session (optional)
 * @returns The user object or null if creation failed
 */
export async function ensureUserExists(
    email: string,
    name?: string
): Promise<any> {
    if (!email) {
        console.error('Cannot create user: Missing required email');
        return null;
    }

    try {
        // First check if the user already exists by email
        let user = await prisma.user.findUnique({
            where: { email }
        });

        if (user) {
            return user;
        }

        // Create a new user if none exists
        console.log(`Creating new user record for ${email}`);
        user = await prisma.user.create({
            data: {
                email: email,
                name: name || 'User',
                credits_remaining: '0',
                credits_used: '0',
                last_login: new Date(),
            }
        });

        console.log(`Successfully created user with email: ${email}, ID: ${user.id}`);
        return user;
    } catch (error) {
        console.error('Error ensuring user exists:', error);
        return null;
    }
}

/**
 * Get a user's ID from their email, or create a new user if needed
 * @param email User email
 * @param name User name (optional)
 * @returns The user ID or null if user could not be found or created
 */
export async function getUserIdFromEmail(
    email: string,
    name?: string
): Promise<string | null> {
    const user = await ensureUserExists(email, name);
    return user ? user.id : null;
}
