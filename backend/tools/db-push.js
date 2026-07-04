const dns = require('dns');
const { execSync } = require('child_process');

// Set DNS servers to Google DNS to bypass local lookup restrictions
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

console.log('🔄 Running Prisma DB Push with custom DNS resolver...');
try {
    execSync('npx prisma db push', { stdio: 'inherit', env: process.env });
    console.log('✅ Prisma DB Push completed successfully!');
} catch (error) {
    console.error('❌ Prisma DB Push failed:', error.message);
    process.exit(1);
}
