import { PrismaClient } from '@prisma/client';

// Initialize Prisma Client
export const prisma = new PrismaClient();

// Global constants can be added here
export const APP_CONSTANTS = {
  DEFAULT_CURRENCY: 'USD',
};
