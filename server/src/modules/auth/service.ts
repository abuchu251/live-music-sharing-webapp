import { getUserRepository, IUserRepository } from "./repository.js";
import { hashPassword, verifyPassword } from "./password.js";
import { signToken } from "./jwt.js";
import { nanoid } from "nanoid";
import type {
  User,
  AuthResponse,
  GuestAuthResponse,
  LoginRequest,
  RegisterRequest,
  GuestAuthRequest,
  AuthSessionUser,
} from "@synctune/shared-types";

export class AuthService {
  private repo: IUserRepository;

  constructor(repo?: IUserRepository) {
    this.repo = repo ?? getUserRepository();
  }

  private sanitizeUser(user: {
    id: string;
    email: string;
    username: string;
    avatar: string;
    role: "USER" | "ADMIN";
    createdAt: Date;
    updatedAt: Date;
  }): User {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      avatar: user.avatar,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  async register(req: RegisterRequest): Promise<AuthResponse> {
    const email = req.email.trim().toLowerCase();
    const username = req.username.trim();

    if (!email || !email.includes("@")) {
      throw new Error("Invalid email address");
    }

    if (!username || username.length < 3 || username.length > 30) {
      throw new Error("Username must be between 3 and 30 characters");
    }

    if (!req.password || req.password.length < 6) {
      throw new Error("Password must be at least 6 characters long");
    }

    // Check existing email
    const existingEmail = await this.repo.findByEmail(email);
    if (existingEmail) {
      throw new Error("An account with this email already exists");
    }

    // Check existing username
    const existingUsername = await this.repo.findByUsername(username);
    if (existingUsername) {
      throw new Error("Username is already taken");
    }

    const passwordHash = await hashPassword(req.password);
    const userRecord = await this.repo.create({
      email,
      username,
      passwordHash,
      avatar: req.avatar || "🎧",
      role: "USER",
    });

    const user = this.sanitizeUser(userRecord);
    const sessionPayload: AuthSessionUser = {
      id: user.id,
      username: user.username,
      avatar: user.avatar,
      email: user.email,
      role: user.role,
      isGuest: false,
    };

    const token = signToken(sessionPayload);
    return { user, token };
  }

  async login(req: LoginRequest): Promise<AuthResponse> {
    const identifier = req.emailOrUsername.trim();
    if (!identifier) {
      throw new Error("Email or username is required");
    }
    if (!req.password) {
      throw new Error("Password is required");
    }

    const userRecord = await this.repo.findByEmailOrUsername(identifier);
    if (!userRecord) {
      throw new Error("Invalid credentials");
    }

    const isMatch = await verifyPassword(req.password, userRecord.passwordHash);
    if (!isMatch) {
      throw new Error("Invalid credentials");
    }

    const user = this.sanitizeUser(userRecord);
    const sessionPayload: AuthSessionUser = {
      id: user.id,
      username: user.username,
      avatar: user.avatar,
      email: user.email,
      role: user.role,
      isGuest: false,
    };

    const token = signToken(sessionPayload);
    return { user, token };
  }

  async createGuestSession(req: GuestAuthRequest): Promise<GuestAuthResponse> {
    const username = req.username?.trim() || `Guest_${nanoid(5)}`;
    const guestUser: AuthSessionUser = {
      id: `guest_${nanoid(12)}`,
      username,
      avatar: req.avatar || "🎧",
      role: "GUEST",
      isGuest: true,
    };

    const token = signToken(guestUser);
    return {
      token,
      user: guestUser,
    };
  }

  async getCurrentUser(userId: string): Promise<User | null> {
    const userRecord = await this.repo.findById(userId);
    if (!userRecord) return null;
    return this.sanitizeUser(userRecord);
  }
}

export const authService = new AuthService();
