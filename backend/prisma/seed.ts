import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as dns from 'dns';

// CONNECTIVITY FIX: Override DNS lookup to bypass local DNS blocks on Neon DB
if (process.env.NODE_ENV !== 'production') {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
  const originalLookup = dns.lookup;
  (dns as any).lookup = function (hostname: string, options: any, callback: any) {
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return originalLookup(hostname, options, callback);
    }
    dns.resolve4(hostname, (err, addresses) => {
      if (err || !addresses || addresses.length === 0) {
        return originalLookup(hostname, options, callback);
      }
      if (options.all) {
        callback(null, addresses.map((addr) => ({ address: addr, family: 4 })));
      } else {
        callback(null, addresses[0], 4);
      }
    });
  };
}

function sanitizeDatabaseUrl(url: string | undefined): string | undefined {
  if (!url) return url;
  try {
    const parsedUrl = new URL(url);
    parsedUrl.searchParams.delete('channel_binding');
    if (parsedUrl.hostname.includes('-pooler') && !parsedUrl.searchParams.has('pgbouncer')) {
      parsedUrl.searchParams.set('pgbouncer', 'true');
    }
    return parsedUrl.toString();
  } catch (err) {
    return url;
  }
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: sanitizeDatabaseUrl(process.env.DATABASE_URL),
    },
  },
});

async function main() {
  console.log('🌱 Starting database seed...');

  // ─── Roles ───────────────────────────────────────────────────────
  const roles = await Promise.all([
    prisma.role.upsert({
      where: { name: 'SUPER_ADMIN' },
      update: {},
      create: { name: 'SUPER_ADMIN', description: 'Full system access' },
    }),
    prisma.role.upsert({
      where: { name: 'MESS_MANAGER' },
      update: {},
      create: { name: 'MESS_MANAGER', description: 'Manage purchases, inventory, reports' },
    }),
    prisma.role.upsert({
      where: { name: 'STORE_KEEPER' },
      update: {},
      create: { name: 'STORE_KEEPER', description: 'Manage inventory and purchases' },
    }),
    prisma.role.upsert({
      where: { name: 'KITCHEN_STAFF' },
      update: {},
      create: { name: 'KITCHEN_STAFF', description: 'Issue stock, log consumption' },
    }),
    prisma.role.upsert({
      where: { name: 'ACCOUNTANT' },
      update: {},
      create: { name: 'ACCOUNTANT', description: 'View financial reports' },
    }),
    prisma.role.upsert({
      where: { name: 'HOSTEL_WARDEN' },
      update: {},
      create: { name: 'HOSTEL_WARDEN', description: 'Manage hostel attendance and complaints' },
    }),
    prisma.role.upsert({
      where: { name: 'STUDENT_VIEWER' },
      update: {},
      create: { name: 'STUDENT_VIEWER', description: 'View menu and submit complaints' },
    }),
  ]);
  console.log(`✅ Created ${roles.length} roles`);

  // Helper to find role ID by name
  const getRoleId = (name: string) => roles.find((r) => r.name === name)!.id;

  // ─── Demo Users ───────────────────────────────────────────────────
  // SUPER_ADMIN
  const adminPassword = await bcrypt.hash('Jkkm@Admin2026', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@jkkm.edu.in' },
    update: {
      name: 'Super Admin',
      password: adminPassword,
      roleId: getRoleId('SUPER_ADMIN'),
      failedLoginAttempts: 0,
      lockUntil: null,
    },
    create: {
      name: 'Super Admin',
      email: 'admin@jkkm.edu.in',
      password: adminPassword,
      phone: '9876543210',
      roleId: getRoleId('SUPER_ADMIN'),
    },
  });
  console.log(`✅ Admin user: ${admin.email}`);

  // MESS_MANAGER
  const managerPassword = await bcrypt.hash('Jkkm@Mess2026', 12);
  await prisma.user.upsert({
    where: { email: 'messmanager@jkkm.edu.in' },
    update: {
      name: 'Mess Manager',
      password: managerPassword,
      roleId: getRoleId('MESS_MANAGER'),
      failedLoginAttempts: 0,
      lockUntil: null,
    },
    create: {
      name: 'Mess Manager',
      email: 'messmanager@jkkm.edu.in',
      password: managerPassword,
      phone: '9876543211',
      roleId: getRoleId('MESS_MANAGER'),
    },
  });

  // STORE_KEEPER
  const storekeeperPassword = await bcrypt.hash('Jkkm@Store2026', 12);
  await prisma.user.upsert({
    where: { email: 'storekeeper@jkkm.edu.in' },
    update: {
      name: 'Storekeeper',
      password: storekeeperPassword,
      roleId: getRoleId('STORE_KEEPER'),
      failedLoginAttempts: 0,
      lockUntil: null,
    },
    create: {
      name: 'Storekeeper',
      email: 'storekeeper@jkkm.edu.in',
      password: storekeeperPassword,
      phone: '9786543210',
      roleId: getRoleId('STORE_KEEPER'),
    },
  });

  // KITCHEN_STAFF
  const staffPassword = await bcrypt.hash('Jkkm@Kitchen2026', 12);
  await prisma.user.upsert({
    where: { email: 'kitchen@jkkm.edu.in' },
    update: {
      name: 'Kitchen Staff',
      password: staffPassword,
      roleId: getRoleId('KITCHEN_STAFF'),
      failedLoginAttempts: 0,
      lockUntil: null,
    },
    create: {
      name: 'Kitchen Staff',
      email: 'kitchen@jkkm.edu.in',
      password: staffPassword,
      phone: '9876543212',
      roleId: getRoleId('KITCHEN_STAFF'),
    },
  });

  // ACCOUNTANT
  const accountantPassword = await bcrypt.hash('Jkkm@Accounts2026', 12);
  await prisma.user.upsert({
    where: { email: 'accounts@jkkm.edu.in' },
    update: {
      name: 'Accountant',
      password: accountantPassword,
      roleId: getRoleId('ACCOUNTANT'),
      failedLoginAttempts: 0,
      lockUntil: null,
    },
    create: {
      name: 'Accountant',
      email: 'accounts@jkkm.edu.in',
      password: accountantPassword,
      phone: '8122345678',
      roleId: getRoleId('ACCOUNTANT'),
    },
  });

  // HOSTEL_WARDEN
  const wardenPassword = await bcrypt.hash('Jkkm@Warden2026', 12);
  await prisma.user.upsert({
    where: { email: 'warden@jkkm.edu.in' },
    update: {
      name: 'Hostel Warden',
      password: wardenPassword,
      roleId: getRoleId('HOSTEL_WARDEN'),
      failedLoginAttempts: 0,
      lockUntil: null,
    },
    create: {
      name: 'Hostel Warden',
      email: 'warden@jkkm.edu.in',
      password: wardenPassword,
      phone: '8122345679',
      roleId: getRoleId('HOSTEL_WARDEN'),
    },
  });

  // STUDENT_VIEWER
  const studentPassword = await bcrypt.hash('Jkkm@Student2026', 12);
  await prisma.user.upsert({
    where: { email: 'student@jkkm.edu.in' },
    update: {
      name: 'Student Viewer',
      password: studentPassword,
      roleId: getRoleId('STUDENT_VIEWER'),
      failedLoginAttempts: 0,
      lockUntil: null,
    },
    create: {
      name: 'Student Viewer',
      email: 'student@jkkm.edu.in',
      password: studentPassword,
      phone: '8122345680',
      roleId: getRoleId('STUDENT_VIEWER'),
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
    { name: 'Ponni Rice', code: 'RICE-001', barcode: 'RICE1001', categoryId: categories[0].id, type: 'BULK', unit: 'KG', unitSize: 25, minStockLevel: 100 },
    { name: 'Wheat Flour (Atta)', code: 'ATTA-001', categoryId: categories[0].id, type: 'BULK', unit: 'KG', unitSize: 50, minStockLevel: 80 },
    { name: 'Tomatoes', code: 'VEG-001', categoryId: categories[1].id, type: 'VEGETABLE', unit: 'KG', minStockLevel: 20 },
    { name: 'Onions', code: 'VEG-002', categoryId: categories[1].id, type: 'VEGETABLE', unit: 'KG', minStockLevel: 30 },
    { name: 'Potatoes', code: 'VEG-003', categoryId: categories[1].id, type: 'VEGETABLE', unit: 'KG', minStockLevel: 25 },
    { name: 'Sunflower Oil', code: 'OIL-001', barcode: '8901030861894', categoryId: categories[2].id, type: 'PACKAGED', unit: 'LITRE', unitSize: 5, minStockLevel: 20 },
    { name: 'Groundnut Oil', code: 'OIL-002', categoryId: categories[2].id, type: 'PACKAGED', unit: 'LITRE', unitSize: 5, minStockLevel: 15 },
    { name: 'Turmeric Powder', code: 'SPICE-001', categoryId: categories[3].id, type: 'PACKAGED', unit: 'KG', unitSize: 1, minStockLevel: 5 },
    { name: 'Red Chilli Powder', code: 'SPICE-002', categoryId: categories[3].id, type: 'PACKAGED', unit: 'KG', unitSize: 1, minStockLevel: 5 },
    { name: 'Coriander Powder', code: 'SPICE-003', categoryId: categories[3].id, type: 'PACKAGED', unit: 'KG', unitSize: 1, minStockLevel: 3 },
    { name: 'Fresh Milk', code: 'DAIRY-001', barcode: 'MILK2002', categoryId: categories[4].id, type: 'PACKAGED', unit: 'LITRE', minStockLevel: 50 },
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
  console.log('📧 Admin login: admin@jkkm.edu.in / Jkkm@Admin2026');
  console.log('📧 Manager login: messmanager@jkkm.edu.in / Jkkm@Mess2026');
  console.log('📧 Storekeeper login: storekeeper@jkkm.edu.in / Jkkm@Store2026');
  console.log('📧 Kitchen login: kitchen@jkkm.edu.in / Jkkm@Kitchen2026');
  console.log('📧 Accountant login: accounts@jkkm.edu.in / Jkkm@Accounts2026');
  console.log('📧 Warden login: warden@jkkm.edu.in / Jkkm@Warden2026');
  console.log('📧 Student login: student@jkkm.edu.in / Jkkm@Student2026');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
