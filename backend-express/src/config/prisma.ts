import { PrismaClient } from "@prisma/client";

// Esto evita crear múltiples instancias de Prisma en desarrollo
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const dbPrisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = dbPrisma;



