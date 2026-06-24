const { PrismaClient } = require('../prisma/generated/client');

const globalForPrisma = global;

if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = new PrismaClient();
}

const prisma = globalForPrisma.prisma;

// ── DB readiness flag ─────────────────────────────────────────────────
// Prisma connects lazily; this flag tracks whether the first $connect()
// succeeded so that socket handlers can skip DB work gracefully.
let _dbReady = false;

async function ensureConnected(retries = 5, delayMs = 5000) {
  for (let i = 1; i <= retries; i++) {
    try {
      await prisma.$connect();
      _dbReady = true;
      console.log('✅ Prisma connected to Oracle ADB');
      return true;
    } catch (err) {
      console.error(
        `❌ Prisma connect attempt ${i}/${retries}: ${err.message}`
      );
      if (i < retries) {
        console.log(`   Retrying in ${delayMs / 1000}s...`);
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }
  console.error('⚠️  Prisma: all connect attempts failed — running without DB');
  return false;
}

function isDbReady() {
  return _dbReady;
}

module.exports = prisma;
module.exports.ensureConnected = ensureConnected;
module.exports.isDbReady = isDbReady;
