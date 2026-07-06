const dns = require('dns');
const { PrismaClient } = require('@prisma/client');

// Apply DNS overrides to avoid local connection timeouts on Neon/Supabase DB
dns.setServers(['8.8.8.8', '8.8.4.4']);
const originalLookup = dns.lookup;
dns.lookup = function (hostname, options, callback) {
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

function sanitizeDatabaseUrl(url) {
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
    console.log('⚡ Starting database user-role mapping realignment...');

    // 1. Fetch correct roles mapped by name
    const existingRoles = await prisma.role.findMany();
    const getRoleId = (name) => {
        const found = existingRoles.find((r) => r.name === name);
        if (!found) {
            throw new Error(`Role ${name} not found in database. Seed the database first.`);
        }
        return found.id;
    };

    // 2. Define target mapping
    const mappings = [
        { email: 'admin@jkkm.edu.in', role: 'SUPER_ADMIN' },
        { email: 'messmanager@jkkm.edu.in', role: 'MESS_MANAGER' },
        { email: 'warden@jkkm.edu.in', role: 'HOSTEL_WARDEN' },
        { email: 'storekeeper@jkkm.edu.in', role: 'STORE_KEEPER' },
        { email: 'kitchen@jkkm.edu.in', role: 'KITCHEN_STAFF' },
        { email: 'accounts@jkkm.edu.in', role: 'ACCOUNTANT' },
        { email: 'student@jkkm.edu.in', role: 'STUDENT_VIEWER' },
    ];

    for (const map of mappings) {
        try {
            const targetRoleId = getRoleId(map.role);
            const user = await prisma.user.findUnique({
                where: { email: map.email },
            });

            if (user) {
                await prisma.user.update({
                    where: { email: map.email },
                    data: { roleId: targetRoleId },
                });
                console.log(`✅ Realigned user: ${map.email} -> ${map.role} (Role ID ${targetRoleId})`);
            } else {
                console.log(`⚠️ User not found: ${map.email}`);
            }
        } catch (err) {
            console.error(`❌ Realignment failed for: ${map.email}:`, err.message);
        }
    }

    console.log('🎉 Realignment complete!');
}

main()
    .catch((e) => {
        console.error('❌ Realignment runner failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
