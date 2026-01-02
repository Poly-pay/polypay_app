import { useIdentityStore } from "../store";
import { authApi } from "./authApi";
import axios, { AxiosError, AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { API_BASE_URL } from "~~/constants";

const AUTHORIZATION_HEADER = (accessToken: string) => `Bearer ${accessToken}`;
const ZK_TIMEOUT = 300000; // 300s for ZK proof generation + verification

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Increase timeout for auth endpoints (ZK proof takes time)
    if (config.url?.includes("/auth") || config.url?.includes("/transaction")) {
      config.timeout = ZK_TIMEOUT;
    }

    // Add auth header if token exists
    const { accessToken } = useIdentityStore.getState();
    if (accessToken) {
      config.headers.Authorization = AUTHORIZATION_HEADER(accessToken);
    }

    if (process.env.NODE_ENV === "development") {
      console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    }
    return config;
  },
  (error: AxiosError) => {
    console.error("❌ Request Error:", error);
    return Promise.reject(error);
  },
);

apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    if (process.env.NODE_ENV === "development") {
      console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`, response.data);
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Auto refresh token on 401
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      // Skip auto-refresh for auth endpoints (prevent loop)
      if (originalRequest.url?.includes("/auth/")) {
        const { logout } = useIdentityStore.getState();
        logout();
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      const { refreshToken, setTokens, logout } = useIdentityStore.getState();

      if (refreshToken) {
        try {
          const response = await authApi.refresh({ refreshToken });
          const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response;
          setTokens(newAccessToken, newRefreshToken);

          originalRequest.headers.Authorization = AUTHORIZATION_HEADER(newAccessToken);
          return apiClient(originalRequest);
        } catch {
          logout();
        }
      } else {
        logout();
      }
    }

    // Existing error handling
    if (error.response) {
      const status = error.response.status;
      const message = (error.response.data as any)?.message || error.message;

      console.error(`❌ API Error [${status}]:`, message);

      switch (status) {
        case 400:
          throw new Error(message || "Bad Request");
        case 401:
          throw new Error("Unauthorized - Please login again");
        case 403:
          throw new Error("Forbidden - You don't have permission");
        case 404:
          throw new Error(message || "Resource not found");
        case 500:
          throw new Error("Internal Server Error - Please try again later");
        default:
          throw new Error(message || `Request failed with status ${status}`);
      }
    } else if (error.request) {
      console.error("❌ Network Error:", error.message);
      throw new Error("Network Error - Please check your connection");
    } else {
      console.error("❌ Error:", error.message);
      throw new Error(error.message || "An unexpected error occurred");
    }
  },
);

export const handleApiError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return "An unexpected error occurred";
};

export default apiClient;
