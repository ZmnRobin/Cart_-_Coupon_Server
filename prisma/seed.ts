import { PrismaClient, DiscountType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  // ========================================
  // PRODUCTS
  // ========================================
  // SKU = Stock Keeping Unit - A unique identifier for each product
  // It's like a product's "serial number" used in inventory management
  // Format here: CATEGORY-NUMBER (e.g., ELEC-001, ACCS-001)

  const products = [
    // Electronics
    {
      sku: 'ELEC-001',
      name: 'Wireless Headphones',
      priceCents: 5999, // $59.99
    },
    {
      sku: 'ELEC-002',
      name: 'Smart Watch Pro',
      priceCents: 19999, // $199.99
    },
    {
      sku: 'ELEC-003',
      name: 'Bluetooth Speaker',
      priceCents: 7999, // $79.99
    },
    {
      sku: 'ELEC-004',
      name: 'Wireless Mouse',
      priceCents: 2999, // $29.99
    },
    {
      sku: 'ELEC-005',
      name: 'Mechanical Keyboard',
      priceCents: 12999, // $129.99
    },
    
    // Accessories
    {
      sku: 'ACCS-001',
      name: 'Laptop Stand',
      priceCents: 3499, // $34.99
    },
    {
      sku: 'ACCS-002',
      name: 'USB-C Cable (2m)',
      priceCents: 1299, // $12.99
    },
    {
      sku: 'ACCS-003',
      name: 'Phone Case Premium',
      priceCents: 1999, // $19.99
    },
    {
      sku: 'ACCS-004',
      name: 'Screen Protector',
      priceCents: 999, // $9.99
    },
    {
      sku: 'ACCS-005',
      name: 'Webcam HD 1080p',
      priceCents: 6999, // $69.99
    },
    
    // Computing
    {
      sku: 'COMP-001',
      name: 'Gaming Mouse Pad',
      priceCents: 2499, // $24.99
    },
    {
      sku: 'COMP-002',
      name: 'USB Hub 7-Port',
      priceCents: 3999, // $39.99
    },
    {
      sku: 'COMP-003',
      name: 'External SSD 1TB',
      priceCents: 8999, // $89.99
    },
    {
      sku: 'COMP-004',
      name: 'Monitor Arm Mount',
      priceCents: 4999, // $49.99
    },
    {
      sku: 'COMP-005',
      name: 'Desk Cable Organizer',
      priceCents: 1499, // $14.99
    },
  ];

  console.log('Creating products...');
  for (const product of products) {
    const created = await prisma.product.upsert({
      where: { sku: product.sku },
      update: {},
      create: product,
    });
    console.log(`✓ Created product: ${created.name} (${created.sku}) - $${(created.priceCents / 100).toFixed(2)}`);
  }

  // ========================================
  // COUPONS
  // ========================================
  
  console.log('\nCreating coupons...');
  
  // Manual Coupons
  await prisma.coupon.upsert({
    where: { code: 'SAVE10' },
    update: {},
    create: {
      code: 'SAVE10',
      discountType: DiscountType.FIXED,
      discountValue: 10, // $10 off
      expiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
    },
  });
  console.log('✓ Created coupon: SAVE10 (Fixed $10 off)');

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
  console.log('✓ Created coupon: OFF10 (10% off, max $5)');

  await prisma.coupon.upsert({
    where: { code: 'WELCOME20' },
    update: {},
    create: {
      code: 'WELCOME20',
      discountType: DiscountType.PERCENTAGE,
      discountValue: 20, // 20% off
      maxDiscountCents: 3000, // Max $30
      minCartTotalCents: 5000, // Min $50 cart
    },
  });
  console.log('✓ Created coupon: WELCOME20 (20% off, max $30, min cart $50)');

  // Auto-Apply Coupons
  await prisma.coupon.upsert({
    where: { code: 'AUTO5' },
    update: {},
    create: {
      code: 'AUTO5',
      discountType: DiscountType.FIXED,
      discountValue: 5, // $5 off
      autoApply: true,
      minCartTotalCents: 2000, // Minimum $20 in cart
    },
  });
  console.log('✓ Created coupon: AUTO5 (Auto-apply $5 off when cart > $20)');

  await prisma.coupon.upsert({
    where: { code: 'AUTO10PCT' },
    update: {},
    create: {
      code: 'AUTO10PCT',
      discountType: DiscountType.PERCENTAGE,
      discountValue: 10, // 10% off
      maxDiscountCents: 1000, // Max $10 discount
      autoApply: true,
      minCartItems: 3, // Need 3+ items
    },
  });
  console.log('✓ Created coupon: AUTO10PCT (Auto-apply 10% off when 3+ items, max $10)');

  await prisma.coupon.upsert({
    where: { code: 'BIGSPENDER' },
    update: {},
    create: {
      code: 'BIGSPENDER',
      discountType: DiscountType.FIXED,
      discountValue: 25, // $25 off
      autoApply: true,
      minCartTotalCents: 15000, // Minimum $150 in cart
    },
  });
  console.log('✓ Created coupon: BIGSPENDER (Auto-apply $25 off when cart > $150)');

  console.log('\n✅ Seeding finished successfully!');
  console.log('\n📦 Summary:');
  console.log(`   - ${products.length} products created`);
  console.log(`   - 6 coupons created (3 manual, 3 auto-apply)`);
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });