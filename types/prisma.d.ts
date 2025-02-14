import { Prisma } from '@prisma/client';

declare global {
  namespace PrismaTypes {
    // ...existing types...
    type DecimalValue = Prisma.Decimal;
    // ...existing types...
  }
}
