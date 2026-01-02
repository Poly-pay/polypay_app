import { notification } from "~~/utils/scaffold-eth";

export enum ErrorCode {
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  SERVER_ERROR = 500,
  NETWORK_ERROR = 0,
}

export interface AppError {
  code: ErrorCode;
  message: string;
  shouldLogout?: boolean;
}

/**
 * Parse error from API response or network error
 */
export function parseError(error: any): AppError {
  // Network error (no response)
  if (!error.response && error.message?.includes("Network")) {
    return {
      code: ErrorCode.NETWORK_ERROR,
      message: "Connection failed. Please check your internet.",
      shouldLogout: false,
    };
  }

  // API error with response
  const status = error.response?.status || error.status;
  const serverMessage = error.response?.data?.message || error.message;

  switch (status) {
    case 401:
      return {
        code: ErrorCode.UNAUTHORIZED,
        message: "Session expired. Please login again.",
        shouldLogout: true,
      };

    case 403:
      return {
        code: ErrorCode.FORBIDDEN,
        message: "Access denied. You don't have permission.",
        shouldLogout: false,
      };

    case 404:
      return {
        code: ErrorCode.NOT_FOUND,
        message: serverMessage || "Resource not found.",
        shouldLogout: false,
      };

    case 500:
      return {
        code: ErrorCode.SERVER_ERROR,
        message: "Server error. Please try again later.",
        shouldLogout: false,
      };

    default:
      return {
        code: status || ErrorCode.NETWORK_ERROR,
        message: serverMessage || "An unexpected error occurred.",
        shouldLogout: false,
      };
  }
}

/**
 * Handle error with notification and optional logout
 * @returns parsed AppError for further handling
 */
export function handleError(
  error: any,
  options?: {
    showNotification?: boolean;
    onLogout?: () => void;
  },
): AppError {
  const { showNotification = true, onLogout } = options || {};

  const appError = parseError(error);

  if (showNotification) {
    notification.error(appError.message);
  }

  if (appError.shouldLogout && onLogout) {
    onLogout();
  }

  return appError;
}

/**
 * Check if error is a specific code
 */
export function isErrorCode(error: AppError, code: ErrorCode): boolean {
  return error.code === code;
}
