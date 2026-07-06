import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as dns from 'dns';

// CONNECTIVITY FIX: Override DNS lookup to bypass local DNS blocks on Neon DB
const nodeEnv = (process.env.NODE_ENV || '').trim().replace(/^["']|["']$/g, '');
if (nodeEnv !== 'production') {
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
  const cleaned = url.trim().replace(/^["']|["']$/g, '');
  try {
    const parsedUrl = new URL(cleaned);
    parsedUrl.searchParams.delete('channel_binding');
    if (parsedUrl.hostname.includes('-pooler') && !parsedUrl.searchParams.has('pgbouncer')) {
      parsedUrl.searchParams.set('pgbouncer', 'true');
    }
    return parsedUrl.toString();
  } catch (err) {
    return cleaned;
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

  // ─── Roles (sequential to guarantee deterministic IDs) ────────────────
  const roleDefinitions = [
    { name: 'SUPER_ADMIN', description: 'Full system access' },
    { name: 'MESS_MANAGER', description: 'Manage purchases, inventory, reports' },
    { name: 'HOSTEL_WARDEN', description: 'Manage hostel attendance and complaints' },
    { name: 'STORE_KEEPER', description: 'Manage stock checks and dispatches' },
    { name: 'KITCHEN_STAFF', description: 'Kitchen culinary and batch logging' },
    { name: 'ACCOUNTANT', description: 'Audit budgets, spends, and PO payments' },
    { name: 'STUDENT_VIEWER', description: 'Student mess portal' },
  ];
  const roles: { id: number; name: string }[] = [];
  for (const def of roleDefinitions) {
    const role = await prisma.role.upsert({
      where: { name: def.name },
      update: {},
      create: def,
    });
    roles.push(role);
  }
  console.log(`✅ Created/Updated ${roles.length} roles`);

  // Reliable name-based role lookup (never depends on array index or ID order)
  const roleMap = new Map(roles.map((r) => [r.name, r.id]));
  const getRoleId = (name: string): number => {
    const id = roleMap.get(name);
    if (id === undefined) throw new Error(`Role "${name}" not found in database`);
    return id;
  };

  // ─── Demo Users ───────────────────────────────────────────────────
  // SUPER_ADMIN
  const adminPassword = await bcrypt.hash('Jkkm@Admin2026', 10);
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
  const managerPassword = await bcrypt.hash('Jkkm@Mess2026', 10);
  const manager = await prisma.user.upsert({
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
  console.log(`✅ Mess Manager user: ${manager.email}`);

  // HOSTEL_WARDEN
  const wardenPassword = await bcrypt.hash('Jkkm@Warden2026', 10);
  const warden = await prisma.user.upsert({
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
  console.log(`✅ Warden user: ${warden.email}`);

  // STOREKEEPER
  const storekeeperPassword = await bcrypt.hash('Jkkm@Store2026', 10);
  const storekeeper = await prisma.user.upsert({
    where: { email: 'storekeeper@jkkm.edu.in' },
    update: {
      name: 'Mess Storekeeper',
      password: storekeeperPassword,
      roleId: getRoleId('STORE_KEEPER'),
      failedLoginAttempts: 0,
      lockUntil: null,
    },
    create: {
      name: 'Mess Storekeeper',
      email: 'storekeeper@jkkm.edu.in',
      password: storekeeperPassword,
      phone: '9876543212',
      roleId: getRoleId('STORE_KEEPER'),
    },
  });
  console.log(`✅ Storekeeper user: ${storekeeper.email}`);

  // KITCHEN_STAFF
  const kitchenPassword = await bcrypt.hash('Jkkm@Kitchen2026', 10);
  const kitchen = await prisma.user.upsert({
    where: { email: 'kitchen@jkkm.edu.in' },
    update: {
      name: 'Kitchen Chef',
      password: kitchenPassword,
      roleId: getRoleId('KITCHEN_STAFF'),
      failedLoginAttempts: 0,
      lockUntil: null,
    },
    create: {
      name: 'Kitchen Chef',
      email: 'kitchen@jkkm.edu.in',
      password: kitchenPassword,
      phone: '9876543213',
      roleId: getRoleId('KITCHEN_STAFF'),
    },
  });
  console.log(`✅ Kitchen user: ${kitchen.email}`);

  // ACCOUNTANT
  const accountsPassword = await bcrypt.hash('Jkkm@Accounts2026', 10);
  const accountant = await prisma.user.upsert({
    where: { email: 'accounts@jkkm.edu.in' },
    update: {
      name: 'Mess Accountant',
      password: accountsPassword,
      roleId: getRoleId('ACCOUNTANT'),
      failedLoginAttempts: 0,
      lockUntil: null,
    },
    create: {
      name: 'Mess Accountant',
      email: 'accounts@jkkm.edu.in',
      password: accountsPassword,
      phone: '9876543214',
      roleId: getRoleId('ACCOUNTANT'),
    },
  });
  console.log(`✅ Accountant user: ${accountant.email}`);

  // STUDENT
  const studentPassword = await bcrypt.hash('Jkkm@Student2026', 10);
  const student = await prisma.user.upsert({
    where: { email: 'student@jkkm.edu.in' },
    update: {
      name: 'Student Guest',
      password: studentPassword,
      roleId: getRoleId('STUDENT_VIEWER'),
      failedLoginAttempts: 0,
      lockUntil: null,
    },
    create: {
      name: 'Student Guest',
      email: 'student@jkkm.edu.in',
      password: studentPassword,
      phone: '9876543215',
      roleId: getRoleId('STUDENT_VIEWER'),
    },
  });
  console.log(`✅ Student user: ${student.email}`);

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

  // ─── Daily Issues, Consumption Logs, and Wastage Seeding ──────────────
  const dbRice = await prisma.product.findFirst({ where: { name: 'Ponni Rice' } });
  const dbTomatoes = await prisma.product.findFirst({ where: { name: 'Tomatoes' } });
  const dbMilk = await prisma.product.findFirst({ where: { name: 'Fresh Milk' } });
  const dbKitchenUser = await prisma.user.findFirst({ where: { email: 'kitchen@jkkm.edu.in' } });

  if (dbRice && dbTomatoes && dbMilk && dbKitchenUser) {
    const today = new Date();

    // Clear legacy entries to prevent constraint duplication
    await prisma.consumptionLog.deleteMany({});
    await prisma.dailyIssue.deleteMany({});
    await prisma.wastage.deleteMany({});

    // Seed issues + consumption for past 15 days
    for (let i = 0; i < 15; i++) {
      const issueDate = new Date();
      issueDate.setDate(today.getDate() - i);
      const randomHeadcount = Math.floor(600 + Math.random() * 200); // 600 - 800 students

      const riceQty = Math.round((randomHeadcount * 0.15) * 100) / 100; // 0.15 kg per student
      const tomatoQty = Math.round((randomHeadcount * 0.04) * 100) / 100; // 0.04 kg per student

      const issueRice = await prisma.dailyIssue.create({
        data: {
          productId: dbRice.id,
          quantity: riceQty,
          unit: dbRice.unit,
          meal: 'LUNCH',
          issuedById: dbKitchenUser.id,
          issueDate,
        }
      });
      await prisma.consumptionLog.create({
        data: {
          dailyIssueId: issueRice.id,
          productId: dbRice.id,
          quantity: riceQty,
          unit: dbRice.unit,
          meal: 'LUNCH',
          date: issueDate,
          headcount: randomHeadcount,
          perHeadUsage: Math.round((riceQty / randomHeadcount) * 10000) / 10000,
        }
      });

      const issueTom = await prisma.dailyIssue.create({
        data: {
          productId: dbTomatoes.id,
          quantity: tomatoQty,
          unit: dbTomatoes.unit,
          meal: 'LUNCH',
          issuedById: dbKitchenUser.id,
          issueDate,
        }
      });
      await prisma.consumptionLog.create({
        data: {
          dailyIssueId: issueTom.id,
          productId: dbTomatoes.id,
          quantity: tomatoQty,
          unit: dbTomatoes.unit,
          meal: 'LUNCH',
          date: issueDate,
          headcount: randomHeadcount,
          perHeadUsage: Math.round((tomatoQty / randomHeadcount) * 10000) / 10000,
        }
      });
    }

    await prisma.wastage.createMany({
      data: [
        {
          productId: dbRice.id,
          quantity: 25.0,
          unit: dbRice.unit,
          valueAmount: 1250,
          reason: 'OVER_PREPARATION',
          reportedAt: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000),
        },
        {
          productId: dbRice.id,
          quantity: 15.0,
          unit: dbRice.unit,
          valueAmount: 750,
          reason: 'OVER_PREPARATION',
          reportedAt: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000),
        },
        {
          productId: dbTomatoes.id,
          quantity: 10.0,
          unit: dbTomatoes.unit,
          valueAmount: 300,
          reason: 'OVER_PREPARATION',
          reportedAt: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000),
        }
      ]
    });
    console.log('✅ Seeded demo DailyIssues, ConsumptionLogs and Wastage entries');
  }

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
