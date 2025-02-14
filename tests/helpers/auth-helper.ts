import fetch from 'cross-fetch';
import prisma from './prisma';

export const authTestHelper = {
  async cleanupTestUser(email: string) {
    const normalizedEmail = email.toLowerCase();
    try {
      // First, find the user
      const user = await prisma.user.findFirst({
        where: {
          email: {
            equals: normalizedEmail,
            mode: 'insensitive'
          }
        }
      });

      if (user) {
        // Delete all related records first
        await prisma.chat.deleteMany({
          where: { user_id: user.id }
        });

        // Then delete the user
        await prisma.user.delete({
          where: { id: user.id }
        });
        
        console.log(`User and related records deleted:`, user.email);
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('P2025')) {
          console.log(`No user found to delete for email: ${normalizedEmail}`);
        } else {
          console.error('Error deleting user:', error.message);
        }
      } else {
        throw new Error('Error deleting user: Unknown error');
      }
    }
  },

  async createTestUser(email: string, password: string) {
    try {
      // First ensure the user doesn't exist
      await this.cleanupTestUser(email);

      const response = await fetch('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: email.toLowerCase(), 
          password 
        }),
      });

      if (!response.ok) {
        const error = await response.clone().json();
        console.error('Create user failed:', error);
      }

      return response;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Authentication failed: ${error.message}`);
      }
      throw new Error('Authentication failed: Unknown error');
    }
  },

  async loginUser(email: string, password: string) {
    const response = await fetch('http://localhost:3000/api/auth/signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        redirect: false,
        json: true
      }),
    });
    return response;
  },

  async getSessionToken(email: string, password: string) {
    try {
      // For testing, just get the user and create a test token
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Create a mock session token using the user ID
      return `mock_session_${user.id}`;
    } catch (error) {
      if (error instanceof Error) {
        console.error('Error getting session token:', error.message);
        throw new Error(`Error getting session token: ${error.message}`);
      }
      throw new Error('Error getting session token: Unknown error');
    }
  }
};
