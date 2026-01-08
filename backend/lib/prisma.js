const { PrismaClient } = require('../prisma/generated/client');

// Prevent multiple instances of Prisma Client in development
const globalForPrisma = global;

if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = new PrismaClient();
}

const prisma = globalForPrisma.prisma;

module.exports = prisma;
