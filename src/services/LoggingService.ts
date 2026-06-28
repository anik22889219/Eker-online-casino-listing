import { OperationType } from "../firebase/firestore";

export type LogSeverity = "info" | "warn" | "error" | "fatal";

export interface LogPayload {
  timestamp: string;
  severity: LogSeverity;
  category: "CLOUD_FUNCTIONS" | "AI_GENERATION" | "IMAGE_UPLOAD" | "AUTHENTICATION" | "FIRESTORE" | "SYSTEM";
  message: string;
  errorDetails?: any;
  context?: any;
}

export class LoggingService {
  private static isProduction = process.env.NODE_ENV === "production";

  /**
   * Universal internal logger that structures outputs to standard error streams.
   * In a Cloud Run environment, stdout/stderr is automatically parsed and indexed
   * as structured logging in Google Cloud Logging (Stackdriver).
   */
  private static writeLog(payload: LogPayload): void {
    const formattedMessage = `[${payload.category}] [${payload.severity.toUpperCase()}] ${payload.message}`;
    
    if (payload.severity === "error" || payload.severity === "fatal") {
      console.error(formattedMessage, {
        timestamp: payload.timestamp,
        error: payload.errorDetails,
        context: payload.context,
      });
    } else if (payload.severity === "warn") {
      console.warn(formattedMessage, {
        timestamp: payload.timestamp,
        context: payload.context,
      });
    } else {
      console.log(formattedMessage, {
        timestamp: payload.timestamp,
        context: payload.context,
      });
    }

    // In a future phase, these logs can also be synchronized with Sentry, Datadog, or an /errors collection
  }

  /**
   * Central log interceptor for Cloud Functions failures.
   */
  public static logCloudFunctionFailure(functionName: string, error: any, params?: any): void {
    const errorMessage = error?.message || String(error);
    this.writeLog({
      timestamp: new Date().toISOString(),
      severity: "error",
      category: "CLOUD_FUNCTIONS",
      message: `Firebase Cloud Function '${functionName}' failed: ${errorMessage}`,
      errorDetails: error,
      context: { functionName, params },
    });
  }

  /**
   * Central log interceptor for AI generation models and scraper operations.
   */
  public static logAiFailure(action: string, error: any, context?: any): void {
    const errorMessage = error?.message || String(error);
    this.writeLog({
      timestamp: new Date().toISOString(),
      severity: "error",
      category: "AI_GENERATION",
      message: `AI Generation failure during ${action}: ${errorMessage}`,
      errorDetails: error,
      context: { action, ...context },
    });
  }

  /**
   * Central log interceptor for Cloudinary image uploads.
   */
  public static logUploadFailure(folderType: string, error: any, fileDetails?: any): void {
    const errorMessage = error?.message || String(error);
    this.writeLog({
      timestamp: new Date().toISOString(),
      severity: "error",
      category: "IMAGE_UPLOAD",
      message: `Image host upload to folder '${folderType}' failed: ${errorMessage}`,
      errorDetails: error,
      context: { folderType, fileDetails },
    });
  }

  /**
   * Central log interceptor for authentication updates or token validation failures.
   */
  public static logAuthFailure(action: string, error: any, email?: string): void {
    const errorMessage = error?.message || String(error);
    this.writeLog({
      timestamp: new Date().toISOString(),
      severity: "warn",
      category: "AUTHENTICATION",
      message: `Authentication transaction '${action}' failed: ${errorMessage}`,
      errorDetails: error,
      context: { action, email },
    });
  }

  /**
   * Central log interceptor for Firestore rules or access exceptions.
   */
  public static logFirestoreFailure(path: string, operation: OperationType, error: any): void {
    const errorMessage = error?.message || String(error);
    this.writeLog({
      timestamp: new Date().toISOString(),
      severity: "error",
      category: "FIRESTORE",
      message: `Firestore access exception on path '${path}' during '${operation}': ${errorMessage}`,
      errorDetails: error,
      context: { path, operation },
    });
  }
}

export default LoggingService;
