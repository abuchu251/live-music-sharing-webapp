import { prisma, isDatabaseReady } from "../../db/prisma.js";
import { nanoid } from "nanoid";

export interface UserRecord {
  id: string;
  email: string;
  username: string;
  passwordHash: string;
  avatar: string;
  role: "USER" | "ADMIN";
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserData {
  email: string;
  username: string;
  passwordHash: string;
  avatar?: string;
  role?: "USER" | "ADMIN";
}

export interface IUserRepository {
  findById(id: string): Promise<UserRecord | null>;
  findByEmail(email: string): Promise<UserRecord | null>;
  findByUsername(username: string): Promise<UserRecord | null>;
  findByEmailOrUsername(identifier: string): Promise<UserRecord | null>;
  create(data: CreateUserData): Promise<UserRecord>;
}

export class InMemoryUserRepository implements IUserRepository {
  private users = new Map<string, UserRecord>();

  async findById(id: string): Promise<UserRecord | null> {
    return this.users.get(id) ?? null;
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    const lower = email.toLowerCase();
    for (const user of this.users.values()) {
      if (user.email.toLowerCase() === lower) return user;
    }
    return null;
  }

  async findByUsername(username: string): Promise<UserRecord | null> {
    const lower = username.toLowerCase();
    for (const user of this.users.values()) {
      if (user.username.toLowerCase() === lower) return user;
    }
    return null;
  }

  async findByEmailOrUsername(identifier: string): Promise<UserRecord | null> {
    const lower = identifier.toLowerCase();
    for (const user of this.users.values()) {
      if (user.email.toLowerCase() === lower || user.username.toLowerCase() === lower) {
        return user;
      }
    }
    return null;
  }

  async create(data: CreateUserData): Promise<UserRecord> {
    const now = new Date();
    const user: UserRecord = {
      id: nanoid(16),
      email: data.email.toLowerCase().trim(),
      username: data.username.trim(),
      passwordHash: data.passwordHash,
      avatar: data.avatar || "🎧",
      role: data.role || "USER",
      createdAt: now,
      updatedAt: now,
    };
    this.users.set(user.id, user);
    return user;
  }
}

export class PrismaUserRepository implements IUserRepository {
  async findById(id: string): Promise<UserRecord | null> {
    const record = await prisma.user.findUnique({ where: { id } });
    if (!record) return null;
    return {
      ...record,
      role: record.role as "USER" | "ADMIN",
    };
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    const record = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
    if (!record) return null;
    return {
      ...record,
      role: record.role as "USER" | "ADMIN",
    };
  }

  async findByUsername(username: string): Promise<UserRecord | null> {
    const record = await prisma.user.findUnique({
      where: { username: username.trim() },
    });
    if (!record) return null;
    return {
      ...record,
      role: record.role as "USER" | "ADMIN",
    };
  }

  async findByEmailOrUsername(identifier: string): Promise<UserRecord | null> {
    const trimmed = identifier.trim();
    const record = await prisma.user.findFirst({
      where: {
        OR: [
          { email: trimmed.toLowerCase() },
          { username: trimmed },
        ],
      },
    });
    if (!record) return null;
    return {
      ...record,
      role: record.role as "USER" | "ADMIN",
    };
  }

  async create(data: CreateUserData): Promise<UserRecord> {
    const record = await prisma.user.create({
      data: {
        email: data.email.toLowerCase().trim(),
        username: data.username.trim(),
        passwordHash: data.passwordHash,
        avatar: data.avatar || "🎧",
        role: data.role || "USER",
      },
    });
    return {
      ...record,
      role: record.role as "USER" | "ADMIN",
    };
  }
}

// Global user repository instance with DB fallback
let repositoryInstance: IUserRepository | null = null;

export function getUserRepository(): IUserRepository {
  if (!repositoryInstance) {
    if (isDatabaseReady()) {
      repositoryInstance = new PrismaUserRepository();
    } else {
      repositoryInstance = new InMemoryUserRepository();
    }
  }
  return repositoryInstance;
}

export function setUserRepository(repo: IUserRepository): void {
  repositoryInstance = repo;
}

