// scripts/create-test-user.ts
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  try {
    // Delete existing user
    await prisma.user.deleteMany({
      where: {
        email: 'test@test.com'
      }
    })

    // Create new user
    const password = 'test123'
    const hashedPassword = await bcrypt.hash(password, 10)
    
    const user = await prisma.user.create({
      data: {
        email: 'test@test.com',
        password: hashedPassword,
      }
    })

    console.log('Created test user:', {
      id: user.id,
      email: user.email,
    })

  } catch (error) {
    console.error('Error:', error)
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect()
  })
