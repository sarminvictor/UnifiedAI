import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

async function clearDB() {
  console.log('🧹 Starting database cleanup...');
  try {
    // Tables in order of dependencies matching Prisma schema
    const deleteOrder = [
      // Level 1 - Most dependent tables (transactions, logs, history)
      { name: 'creditTransaction', label: 'CreditTransaction' },
      { name: 'aPIUsageLog', label: 'APIUsageLog' },
      { name: 'chatHistory', label: 'ChatHistory' },

      // Level 2 - Intermediate dependencies
      { name: 'subscription', label: 'Subscription' },
      { name: 'chat', label: 'Chat' },

      // Level 3 - Base tables
      { name: 'user', label: 'User' },
      { name: 'plan', label: 'Plan' },
      { name: 'aPI', label: 'API' }
    ];

    // Process each table
    for (const table of deleteOrder) {
      try {
        console.log(`🗑️ Clearing ${table.label}...`);
        // @ts-ignore - Dynamic table access
        await prisma[table.name].deleteMany();
        console.log(`✅ Cleared ${table.label}`);
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === 'P2021') {
            console.log(`⚠️ Table ${table.label} not found, skipping...`);
            continue;
          }
        }
        throw error;
      }
    }

    console.log('✅ All tables cleared successfully');
  } catch (error) {
    console.error('❌ Database clear failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

clearDB()
  .catch((error) => {
    console.error('Failed to clear database:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
