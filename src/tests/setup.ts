import { prisma } from '../config/constants';

// Clean up DB before all tests? 
// Or just let individual tests handle their cleanup.
// For SQLite in-memory or file-based, it's good to ensure clean state.

afterAll(async () => {
  await prisma.$disconnect();
});
