import { prisma } from '../config/constants';

afterAll(async () => {
  await prisma.$disconnect();
});
