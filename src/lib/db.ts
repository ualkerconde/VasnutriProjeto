import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// Reaproveita a mesma conexão entre recarregamentos do `next dev`.
const globalParaPrisma = globalThis as unknown as { prisma?: PrismaClient };

function criarCliente() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

export const db = globalParaPrisma.prisma ?? criarCliente();

if (process.env.NODE_ENV !== "production") globalParaPrisma.prisma = db;
