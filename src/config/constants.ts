import { PrismaClient } from '@prisma/client';

// Initialize Prisma Client
export const prisma = new PrismaClient();

export const APP_CONSTANTS = {
  DEFAULT_CURRENCY: 'USD',
};
