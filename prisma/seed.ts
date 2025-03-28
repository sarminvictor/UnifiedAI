import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create or update Plans with specific UUIDs
  const plans = [
    {
      plan_id: '71a6c031-69c2-4723-8313-812524ebe90a',  // Free plan fixed UUID
      plan_name: 'Free',
      credits_per_month: '5',
      price: '0'
    },
    {
      plan_id: '9388d5c6-0ce4-4a8f-9930-6f5fb74c3ae9',  // Starter plan fixed UUID
      plan_name: 'Starter',
      credits_per_month: '1000',
      price: '10'
    },
    {
      plan_id: 'b4f5c4d8-9c7b-4b1a-8f4e-1a9c7b4b1a8f',  // Pro plan fixed UUID
      plan_name: 'Pro',
      credits_per_month: '2500',
      price: '20'
    }
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { plan_id: plan.plan_id },
      update: {
        plan_name: plan.plan_name,
        credits_per_month: plan.credits_per_month,
        price: plan.price
      },
      create: plan
    });
  }
  console.log('✅ Plans seeded successfully');

  // Create or update APIs with fixed UUIDs and updated model names
  const apis = [
    {
      api_id: '2d41b025-6e23-4b71-b31c-74c5cc412a94',
      api_name: 'gpt-3.5-turbo',
      pricing_per_token: '0.0015',
      input_output_type: 'text',
      status: 'Active',
      llm_model: 'gpt-3.5-turbo'
    },
    {
      api_id: '940f32b9-748b-490e-896b-519f45571faa',
      api_name: 'gpt-4',
      pricing_per_token: '0.06',
      input_output_type: 'text',
      status: 'Active',
      llm_model: 'gpt-4'
    },
    {
      api_id: '4a15e837-4e85-4e91-9c64-3c17f21d8635',
      api_name: 'claude-3-haiku',
      pricing_per_token: '0.015',
      input_output_type: 'text',
      status: 'Active',
      llm_model: 'claude-3-haiku-20240307'
    },
    {
      api_id: '7d9274a2-8820-4752-9fdd-38e1e7f27d8e',
      api_name: 'gemini-1.5-pro',
      pricing_per_token: '0.005',
      input_output_type: 'text',
      status: 'Active',
      llm_model: 'gemini-1.5-pro'
    },
    {
      api_id: 'c58c3963-d7e0-4d1e-9c4d-9e4f154a95a9',
      api_name: 'deepseek-chat',
      pricing_per_token: '0.0015',
      input_output_type: 'text',
      status: 'Active',
      llm_model: 'deepseek-chat'
    }
  ];

  for (const api of apis) {
    await prisma.aPI.upsert({
      where: { api_id: api.api_id },
      update: {
        api_name: api.api_name,
        pricing_per_token: api.pricing_per_token,
        input_output_type: api.input_output_type,
        status: api.status,
        llm_model: api.llm_model
      },
      create: api
    });
  }
  console.log('✅ APIs seeded successfully');

  console.log('✨ Database seeding completed');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
