import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Cleanup Tests', () => {
  const testEmail = 'test@test.test';

  it('should check for test user by test@test.test in database', async () => {
    const user = await prisma.user.findUnique({
      where: { email: testEmail },
    });

    if (!user) {
      console.log('No test data: User not found');
      return;
    }

    expect(user).not.toBeNull();
  });

  it('should check all chats related to this user in database', async () => {
    const user = await prisma.user.findUnique({
      where: { email: testEmail },
    });

    if (!user) {
      console.log('No test data: User not found');
      return;
    }

    const chats = await prisma.chat.findMany({
      where: { user_id: user.id },
    });

    if (chats.length === 0) {
      console.log('No test data: No chats found for user');
      return;
    }

    expect(chats.length).toBeGreaterThan(0);
  });

  it('should check for all messages related to users chats in database', async () => {
    const user = await prisma.user.findUnique({
      where: { email: testEmail },
    });

    if (!user) {
      console.log('No test data: User not found');
      return;
    }

    const chats = await prisma.chat.findMany({
      where: { user_id: user.id },
    });

    if (chats.length === 0) {
      console.log('No test data: No chats found for user');
      return;
    }

    const chatIds = chats.map(chat => chat.chat_id);
    const messages = await prisma.chatHistory.findMany({
      where: { chat_id: { in: chatIds } },
    });

    if (messages.length === 0) {
      console.log('No test data: No messages found for user chats');
      return;
    }

    expect(messages.length).toBeGreaterThan(0);
  });

  it('should delete all test data from database if existed', async () => {
    const user = await prisma.user.findUnique({
      where: { email: testEmail },
    });

    if (!user) {
      console.log('No test data: User not found');
      return;
    }

    const chats = await prisma.chat.findMany({
      where: { user_id: user.id },
    });

    if (chats.length === 0) {
      console.log('No test data: No chats found for user');
      return;
    }

    const chatIds = chats.map(chat => chat.chat_id);
    await prisma.chatHistory.deleteMany({
      where: { chat_id: { in: chatIds } },
    });

    await prisma.chat.deleteMany({
      where: { user_id: user.id },
    });

    await prisma.user.delete({
      where: { email: testEmail },
    });

    console.log('Test data deleted successfully');
  });
});
