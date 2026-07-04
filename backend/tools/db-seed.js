const dns = require('dns');
const { execSync } = require('child_process');

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

console.log('🌱 Seeding database with DNS override...');
try {
    execSync('npx prisma db seed', { stdio: 'inherit', env: process.env });
    console.log('✅ Database seed completed successfully!');
} catch (error) {
    console.error('❌ Database seed failed:', error.message);
    process.exit(1);
}
