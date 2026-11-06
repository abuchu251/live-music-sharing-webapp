import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { env } from "../config/env.js";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Zod validation error
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        message: err.errors[0]?.message || "Validation error",
        details: err.errors,
        code: "VALIDATION_ERROR",
      },
    });
    return;
  }

  // Known AppError
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        code: err.code,
      },
    });
    return;
  }

  // Expected operational error (e.g., auth check failed)
  const isClientError =
    err.message.includes("Invalid credentials") ||
    err.message.includes("already exists") ||
    err.message.includes("Invalid email") ||
    err.message.includes("must be at least");

  if (isClientError) {
    res.status(400).json({
      success: false,
      error: {
        message: err.message,
        code: "BAD_REQUEST",
      },
    });
    return;
  }

  console.error(`[Internal Error] ${err.message}`, env.isDevelopment ? err.stack : "");

  res.status(500).json({
    success: false,
    error: {
      message: env.isDevelopment ? err.message : "Internal server error",
      code: "INTERNAL_ERROR",
    },
  });
}
