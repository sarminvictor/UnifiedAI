import { authTestHelper } from '../helpers/auth-helper';
import prisma from '../helpers/prisma';

describe('Authentication Regression Tests', () => {
  const testEmail = 'test@test.test';
  const testPassword = 'testPassword123';

  // Clean up only test users to avoid affecting production data
  beforeAll(async () => {
    await authTestHelper.cleanupTestUser(testEmail);
  });

  afterEach(async () => {
    // Clean up after each test to keep database clean
    await prisma.chat.deleteMany({
      where: { user_id: (await prisma.user.findUnique({ where: { email: testEmail } }))?.id }
    });
  });

  // Add cleanup after all tests
  afterAll(async () => {
    await prisma.user.deleteMany({
      where: {
        email: testEmail
      }
    });
    await prisma.$disconnect();
  });

  it('should complete full auth lifecycle', async () => {
    // 1. Register new user
    const signupResponse = await authTestHelper.createTestUser(testEmail, testPassword);
    
    // Handle response body
    const signupData = await signupResponse.clone().json();
    console.log('Signup response:', signupData);
    
    if (signupResponse.status !== 200) {
      console.error('Signup failed with status:', signupResponse.status);
      console.error('Signup error response:', signupData);
    }
    
    expect(signupResponse.status).toBe(200);
    expect(signupData).toHaveProperty('id');
    expect(signupData.email).toBe(testEmail);

    // 2. Login with new user
    const loginResponse = await authTestHelper.loginUser(testEmail, testPassword);
    console.log('Login response status:', loginResponse.status);
    expect(loginResponse.status).toBe(200);
    
    // No need to check token as NextAuth handles the session
    const user = await prisma.user.findUnique({
      where: { email: testEmail }
    });
    console.log('Logged in user:', user);
    expect(user).not.toBeNull();
    expect(user?.email).toBe(testEmail);
  });

  it('should not allow duplicate registration', async () => {
    // First registration
    const firstResponse = await authTestHelper.createTestUser(testEmail, testPassword);
    expect(firstResponse.status).toBe(200);
    
    // Wait for the first registration to complete
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { email: testEmail }
    });
    expect(user).not.toBeNull();

    // Attempt duplicate registration
    const duplicateResponse = await fetch('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email: testEmail.toLowerCase(), 
        password: testPassword 
      }),
    });

    console.log('Duplicate registration response status:', duplicateResponse.status);
    expect(duplicateResponse.status).toBe(400);
    
    const errorData = await duplicateResponse.json();
    console.log('Duplicate registration error:', errorData);
    expect(errorData.error).toBe('User already exists');
  });

  it('should not allow login with incorrect password', async () => {
    const loginResponse = await authTestHelper.loginUser(testEmail, 'wrongpassword');
    console.log('Incorrect login response status:', loginResponse.status);
    const responseData = await loginResponse.json();
    console.log('Incorrect login response data:', responseData);
    expect(responseData).toHaveProperty('error', 'Invalid email or password');
  });
});
