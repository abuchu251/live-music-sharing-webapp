import { describe, it, expect, beforeEach } from "vitest";
import { hashPassword, verifyPassword } from "../server/src/modules/auth/password.js";
import { signToken, verifyToken } from "../server/src/modules/auth/jwt.js";
import { AuthService } from "../server/src/modules/auth/service.js";
import { InMemoryUserRepository } from "../server/src/modules/auth/repository.js";

describe("Password Security (Bcrypt)", () => {
  it("hashes password with high salt rounds and verifies accurately", async () => {
    const raw = "MySecurePassword2026!";
    const hash = await hashPassword(raw);

    expect(hash).not.toBe(raw);
    expect(hash).toMatch(/^\$2[aby]\$\d+\$/); // bcrypt hash signature

    const isMatch = await verifyPassword(raw, hash);
    expect(isMatch).toBe(true);

    const isWrong = await verifyPassword("WrongPassword!", hash);
    expect(isWrong).toBe(false);
  });
});

describe("JWT Authorization", () => {
  it("signs and verifies auth session tokens", () => {
    const userPayload = {
      id: "usr_abc123",
      username: "alex_beats",
      avatar: "🎧",
      email: "alex@synctune.test",
      role: "USER" as const,
      isGuest: false,
    };

    const token = signToken(userPayload);
    expect(typeof token).toBe("string");
    expect(token.split(".").length).toBe(3); // Header.Payload.Signature

    const verified = verifyToken(token);
    expect(verified).not.toBeNull();
    expect(verified?.id).toBe("usr_abc123");
    expect(verified?.username).toBe("alex_beats");
  });

  it("returns null for tampered or invalid tokens", () => {
    expect(verifyToken("invalid.token.here")).toBeNull();
    expect(verifyToken("")).toBeNull();
  });
});

describe("AuthService Domain Logic", () => {
  let authService: AuthService;

  beforeEach(() => {
    const memoryRepo = new InMemoryUserRepository();
    authService = new AuthService(memoryRepo);
  });

  it("registers new users and returns sanitized user object without password hash", async () => {
    const result = await authService.register({
      email: "test@synctune.com",
      username: "testuser",
      password: "password123",
      avatar: "🎹",
    });

    expect(result.token).toBeDefined();
    expect(result.user.username).toBe("testuser");
    expect(result.user.email).toBe("test@synctune.com");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((result.user as any).passwordHash).toBeUndefined();
  });

  it("rejects duplicate email or username registrations", async () => {
    await authService.register({
      email: "duplicate@synctune.com",
      username: "dupuser",
      password: "password123",
    });

    await expect(
      authService.register({
        email: "duplicate@synctune.com",
        username: "otheruser",
        password: "password123",
      })
    ).rejects.toThrow("email already exists");

    await expect(
      authService.register({
        email: "newemail@synctune.com",
        username: "dupuser",
        password: "password123",
      })
    ).rejects.toThrow("Username is already taken");
  });

  it("authenticates valid credentials and rejects incorrect ones", async () => {
    await authService.register({
      email: "login@synctune.com",
      username: "loginuser",
      password: "correctpassword",
    });

    const loginRes = await authService.login({
      emailOrUsername: "loginuser",
      password: "correctpassword",
    });
    expect(loginRes.token).toBeDefined();
    expect(loginRes.user.username).toBe("loginuser");

    await expect(
      authService.login({
        emailOrUsername: "loginuser",
        password: "wrongpassword",
      })
    ).rejects.toThrow("Invalid credentials");
  });

  it("generates guest session tokens with guest attributes", async () => {
    const guest = await authService.createGuestSession({
      username: "GuestMusician",
      avatar: "🎸",
    });

    expect(guest.token).toBeDefined();
    expect(guest.user.isGuest).toBe(true);
    expect(guest.user.username).toBe("GuestMusician");
    expect(guest.user.avatar).toBe("🎸");
  });
});

