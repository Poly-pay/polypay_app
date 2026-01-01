import axios, { AxiosError, AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { API_BASE_URL } from "~~/constants";

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
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
  (error: AxiosError) => {
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
