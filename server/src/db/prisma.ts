import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma =
  globalThis.__prisma ||
  new PrismaClient({
    log: process.env["NODE_ENV"] === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env["NODE_ENV"] !== "production") {
  globalThis.__prisma = prisma;
}

let isDbConnected = false;

/**
 * Checks whether PostgreSQL database connection is alive.
 * Fails safely without throwing if PostgreSQL is unreachable.
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  if (!process.env["DATABASE_URL"]) {
    isDbConnected = false;
    return false;
  }

  try {
    // Attempt a lightweight raw query
    await prisma.$queryRaw`SELECT 1`;
    isDbConnected = true;
    return true;
  } catch (error) {
    isDbConnected = false;
    return false;
  }
}

export function isDatabaseReady(): boolean {
  return isDbConnected;
}

