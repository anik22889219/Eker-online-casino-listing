import { handleFirestoreError, OperationType } from "../firebase/firestore";

/**
 * Standardized App Error Wrapper
 */
export class AppError extends Error {
  public code: string;
  public details?: any;

  constructor(message: string, code: string = "INTERNAL_ERROR", details?: any) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.details = details;
  }
}

/**
 * Maps database/network anomalies to custom error signatures and reports them cleanly.
 */
export function handleAppError(error: unknown, operation: OperationType, path: string): AppError {
  console.error(`[AppError] Operation ${operation} failed on path: ${path}`, error);

  // Parse if it was already handled by handleFirestoreError
  if (error instanceof Error) {
    try {
      const parsed = JSON.parse(error.message);
      if (parsed.error && parsed.operationType) {
        return new AppError(
          `Database Error during ${parsed.operationType}: ${parsed.error}`,
          "DATABASE_PERMISSION_DENIED",
          parsed
        );
      }
    } catch {
      // Not a JSON string error, fallback below
    }

    if (error.message.includes("permission-denied") || error.message.includes("Missing or insufficient permissions")) {
      return new AppError(
        "You do not have sufficient permissions to perform this action.",
        "PERMISSION_DENIED",
        error
      );
    }

    if (error.message.includes("offline")) {
      return new AppError(
        "Your internet connection appears to be offline.",
        "NETWORK_OFFLINE",
        error
      );
    }
  }

  // Handle standard firebase errors
  try {
    handleFirestoreError(error, operation, path);
  } catch (err: any) {
    return new AppError(err.message, "FIRESTORE_ERROR", err);
  }

  return new AppError(
    error instanceof Error ? error.message : String(error),
    "UNKNOWN_ERROR",
    error
  );
}
