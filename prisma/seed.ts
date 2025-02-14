import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('testpassword', 10); // Hash the password before storing

  await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      password: hashedPassword, // Store hashed password
    },
  });

  console.log('✅ Test user created!');

  const apis = [
    { api_name: "ChatGPT", pricing_per_token: 0.00001, input_output_type: "Text", llm_model: "GPT-4o" },
    { api_name: "ChatGPT", pricing_per_token: 0.0000025, input_output_type: "Text", llm_model: "GPT-4o mini" },
    { api_name: "Gemini", pricing_per_token: 0.0000025, input_output_type: "Text", llm_model: "Gemini" },
    { api_name: "DeepSeek", pricing_per_token: 0.0000018, input_output_type: "Text", llm_model: "DeepSeek" },
    { api_name: "Claude", pricing_per_token: 0.0000030, input_output_type: "Text", llm_model: "Claude 3.5 Sonnet" },
  ];

  for (const api of apis) {
    await prisma.aPI.upsert({
      where: { api_name: api.api_name },
      update: { pricing_per_token: api.pricing_per_token },
      create: api,
    });    
  }

  console.log("✅ AI API pricing data seeded successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
