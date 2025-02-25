import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearDatabase() {
  try {
    console.log('🗑️ Clearing database...');

    // Delete records with foreign key relationships first
    await prisma.creditTransaction.deleteMany();
    console.log('✅ Cleared credit transactions');

    await prisma.chatHistory.deleteMany();
    console.log('✅ Cleared chat history');

    await prisma.aPIUsageLog.deleteMany(); // Note the capital 'API' in the model name
    console.log('✅ Cleared API usage logs');

    await prisma.chat.deleteMany();
    console.log('✅ Cleared chats');

    await prisma.subscription.deleteMany();
    console.log('✅ Cleared subscriptions');

    // Delete records that are referenced by others
    await prisma.user.deleteMany();
    console.log('✅ Cleared users');

    await prisma.plan.deleteMany();
    console.log('✅ Cleared plans');

    await prisma.aPI.deleteMany(); // Note the capital 'API' in the model name
    console.log('✅ Cleared APIs');

    console.log('🎉 Database cleared successfully!');
  } catch (error) {
    console.error('Error clearing database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

clearDatabase()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
