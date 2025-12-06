import { PrismaClient, DiscountType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  // 1. Create a Product
  const product = await prisma.product.upsert({
    where: { sku: 'PROD-1' },
    update: {},
    create: {
      sku: 'PROD-1',
      name: 'Sample Product',
      priceCents: 1000, // $10.00
    },
  });
  console.log(`Created product with id: ${product.id}`);

  // 2. Create a Coupon (Fixed)
  await prisma.coupon.upsert({
    where: { code: 'SAVE10' },
    update: {},
    create: {
      code: 'SAVE10',
      discountType: DiscountType.FIXED,
      discountValue: 10, // $10 off (value store as decimal)
      expiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)), // 1 year from now
    },
  });

  // 3. Create a Coupon (Percentage)
  await prisma.coupon.upsert({
    where: { code: 'OFF10' },
    update: {},
    create: {
      code: 'OFF10',
      discountType: DiscountType.PERCENTAGE,
      discountValue: 10, // 10%
      maxDiscountCents: 500, // Max $5
    },
  });

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
