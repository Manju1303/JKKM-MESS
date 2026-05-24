import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // ─── Roles ───────────────────────────────────────────────────────
  const roles = await Promise.all([
    prisma.role.upsert({
      where: { name: 'Super Admin' },
      update: {},
      create: { name: 'Super Admin', description: 'Full system access' },
    }),
    prisma.role.upsert({
      where: { name: 'Mess Manager' },
      update: {},
      create: { name: 'Mess Manager', description: 'Manage purchases, inventory, reports' },
    }),
    prisma.role.upsert({
      where: { name: 'Kitchen Staff' },
      update: {},
      create: { name: 'Kitchen Staff', description: 'Issue stock, log consumption' },
    }),
    prisma.role.upsert({
      where: { name: 'Store Keeper' },
      update: {},
      create: { name: 'Store Keeper', description: 'Manage inventory and purchases' },
    }),
    prisma.role.upsert({
      where: { name: 'Accountant' },
      update: {},
      create: { name: 'Accountant', description: 'View financial reports' },
    }),
  ]);
  console.log(`✅ Created ${roles.length} roles`);

  // ─── Super Admin User ─────────────────────────────────────────────
  const adminPassword = await bcrypt.hash('Admin@123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@jkkm.edu.in' },
    update: {
      password: adminPassword,
    },
    create: {
      name: 'Super Admin',
      email: 'admin@jkkm.edu.in',
      password: adminPassword,
      phone: '9876543210',
      roleId: roles[0].id, // Super Admin
    },
  });
  console.log(`✅ Admin user: ${admin.email}`);

  // Mess Manager
  const managerPassword = await bcrypt.hash('Manager@123', 12);
  await prisma.user.upsert({
    where: { email: 'manager@jkkm.edu.in' },
    update: {
      password: managerPassword,
    },
    create: {
      name: 'Mess Manager',
      email: 'manager@jkkm.edu.in',
      password: managerPassword,
      phone: '9876543211',
      roleId: roles[1].id,
    },
  });

  // Kitchen Staff
  const staffPassword = await bcrypt.hash('Staff@123', 12);
  await prisma.user.upsert({
    where: { email: 'kitchen@jkkm.edu.in' },
    update: {
      password: staffPassword,
    },
    create: {
      name: 'Kitchen Staff',
      email: 'kitchen@jkkm.edu.in',
      password: staffPassword,
      phone: '9876543212',
      roleId: roles[2].id,
    },
  });
  console.log('✅ Demo users created');

  // ─── Categories ───────────────────────────────────────────────────
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { name: 'Rice & Grains' },
      update: {},
      create: { name: 'Rice & Grains', type: 'BULK' },
    }),
    prisma.category.upsert({
      where: { name: 'Vegetables' },
      update: {},
      create: { name: 'Vegetables', type: 'VEGETABLE' },
    }),
    prisma.category.upsert({
      where: { name: 'Oils & Fats' },
      update: {},
      create: { name: 'Oils & Fats', type: 'PACKAGED' },
    }),
    prisma.category.upsert({
      where: { name: 'Spices & Masalas' },
      update: {},
      create: { name: 'Spices & Masalas', type: 'PACKAGED' },
    }),
    prisma.category.upsert({
      where: { name: 'Dairy Products' },
      update: {},
      create: { name: 'Dairy Products', type: 'PACKAGED' },
    }),
    prisma.category.upsert({
      where: { name: 'Pulses & Lentils' },
      update: {},
      create: { name: 'Pulses & Lentils', type: 'BULK' },
    }),
    prisma.category.upsert({
      where: { name: 'Beverages' },
      update: {},
      create: { name: 'Beverages', type: 'PACKAGED' },
    }),
    prisma.category.upsert({
      where: { name: 'Condiments' },
      update: {},
      create: { name: 'Condiments', type: 'PACKAGED' },
    }),
  ]);
  console.log(`✅ Created ${categories.length} categories`);

  // ─── Products ─────────────────────────────────────────────────────
  const products = [
    { name: 'Ponni Rice', code: 'RICE-001', categoryId: categories[0].id, type: 'BULK', unit: 'KG', unitSize: 25, minStockLevel: 100 },
    { name: 'Wheat Flour (Atta)', code: 'ATTA-001', categoryId: categories[0].id, type: 'BULK', unit: 'KG', unitSize: 50, minStockLevel: 80 },
    { name: 'Tomatoes', code: 'VEG-001', categoryId: categories[1].id, type: 'VEGETABLE', unit: 'KG', minStockLevel: 20 },
    { name: 'Onions', code: 'VEG-002', categoryId: categories[1].id, type: 'VEGETABLE', unit: 'KG', minStockLevel: 30 },
    { name: 'Potatoes', code: 'VEG-003', categoryId: categories[1].id, type: 'VEGETABLE', unit: 'KG', minStockLevel: 25 },
    { name: 'Sunflower Oil', code: 'OIL-001', barcode: '8901030861894', categoryId: categories[2].id, type: 'PACKAGED', unit: 'LITRE', unitSize: 5, minStockLevel: 20 },
    { name: 'Groundnut Oil', code: 'OIL-002', categoryId: categories[2].id, type: 'PACKAGED', unit: 'LITRE', unitSize: 5, minStockLevel: 15 },
    { name: 'Turmeric Powder', code: 'SPICE-001', categoryId: categories[3].id, type: 'PACKAGED', unit: 'KG', unitSize: 1, minStockLevel: 5 },
    { name: 'Red Chilli Powder', code: 'SPICE-002', categoryId: categories[3].id, type: 'PACKAGED', unit: 'KG', unitSize: 1, minStockLevel: 5 },
    { name: 'Coriander Powder', code: 'SPICE-003', categoryId: categories[3].id, type: 'PACKAGED', unit: 'KG', unitSize: 1, minStockLevel: 3 },
    { name: 'Fresh Milk', code: 'DAIRY-001', categoryId: categories[4].id, type: 'PACKAGED', unit: 'LITRE', minStockLevel: 50 },
    { name: 'Toor Dal', code: 'PULSE-001', categoryId: categories[5].id, type: 'BULK', unit: 'KG', unitSize: 25, minStockLevel: 40 },
    { name: 'Moong Dal', code: 'PULSE-002', categoryId: categories[5].id, type: 'BULK', unit: 'KG', unitSize: 25, minStockLevel: 20 },
    { name: 'Tea Powder', code: 'BEV-001', categoryId: categories[6].id, type: 'PACKAGED', unit: 'KG', unitSize: 1, minStockLevel: 5 },
    { name: 'Sugar', code: 'COND-001', categoryId: categories[7].id, type: 'BULK', unit: 'KG', unitSize: 50, minStockLevel: 50 },
    { name: 'Salt', code: 'COND-002', categoryId: categories[7].id, type: 'BULK', unit: 'KG', unitSize: 25, minStockLevel: 20 },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: { code: product.code },
      update: {},
      create: product as any,
    });
  }
  console.log(`✅ Created ${products.length} products`);

  // ─── Suppliers ────────────────────────────────────────────────────
  const suppliers = [
    {
      name: 'Sri Murugan Grocery Wholesale',
      contactPerson: 'Murugan K',
      phone: '9876501234',
      email: 'murugan@grocery.com',
      address: '12, Market Street, Namakkal - 637001',
      gstNumber: '33AAAAA0000A1Z5',
    },
    {
      name: 'Fresh Farms Vegetables',
      contactPerson: 'Rajan S',
      phone: '9876502345',
      email: 'rajan@freshfarms.in',
      address: 'Koyambedu Market, Chennai',
    },
    {
      name: 'Krishna Oils & Spices',
      contactPerson: 'Krishna M',
      phone: '9876503456',
      email: 'krishna@oils.com',
      address: '45, Anna Salai, Coimbatore - 641001',
      gstNumber: '33BBBBB0000B1Z5',
    },
    {
      name: 'Aavin Dairy',
      contactPerson: 'Dairy Manager',
      phone: '9876504567',
      email: 'supply@aavin.coop',
      address: 'Aavin Regional Office, Namakkal',
    },
  ];
  for (const supplier of suppliers) {
    const existing = await prisma.supplier.findFirst({
      where: { name: supplier.name }
    });
    if (!existing) {
      await prisma.supplier.create({
        data: supplier
      });
    }
  }
  console.log('✅ Suppliers seeded');

  console.log('\n🎉 Database seeded successfully!');
  console.log('📧 Admin login: admin@jkkm.edu.in / Admin@123');
  console.log('📧 Manager login: manager@jkkm.edu.in / Manager@123');
  console.log('📧 Kitchen login: kitchen@jkkm.edu.in / Staff@123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
