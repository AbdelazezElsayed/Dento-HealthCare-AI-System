/**
 * Axios API Client
 * Configured with interceptors, error handling, and defaults
 */

import axios, { AxiosInstance, AxiosError, AxiosResponse } from "axios";
import API_CONFIG from "./config";
import { setupInterceptors } from "./interceptors/setup";
import { ApiError, ApiResponse } from "./types/api.types";

// ─── CSRF Token Cache ──────────────────────────────────────────────────────
// FIX (H7): Fetch a CSRF double-submit token on first mutating request and
// inject it as x-csrf-token. Token is cached for the lifetime of the page.
let csrfToken: string | null = null;

async function getCsrfToken(): Promise<string | null> {
  if (csrfToken) return csrfToken;
  try {
    const res = await axios.get("/api/v1/csrf-token", { withCredentials: true });
    csrfToken = res.data?.token ?? null;
  } catch {
    // Non-fatal: dev environments may not enforce CSRF
    csrfToken = null;
  }
  return csrfToken;
}

const MUTATING_METHODS = new Set(["post", "put", "patch", "delete"]);

/**
 * Create and configure Axios instance
 */
const createApiClient = (): AxiosInstance => {
  const instance = axios.create({
    baseURL: API_CONFIG.BASE_URL,
    timeout: API_CONFIG.TIMEOUT,
    headers: API_CONFIG.HEADERS,
    // SECURITY FIX (C6): must be true so the browser sends the session
    // cookie (connect.sid) with every Axios request. Without this, all
    // protected API calls return 401 because the server never sees the session.
    withCredentials: true,
  });

  // FIX (H7): Inject CSRF token on mutating requests
  instance.interceptors.request.use(async (config) => {
    if (config.method && MUTATING_METHODS.has(config.method.toLowerCase())) {
      const token = await getCsrfToken();
      if (token) {
        config.headers["x-csrf-token"] = token;
      }
    }
    return config;
  });

  // If we get a 403 with CSRF error, clear the cached token and retry once
  instance.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const is403 = error.response?.status === 403;
      const isCsrfError = (error.response?.data as any)?.code === "INVALID_CSRF_TOKEN";
      if (is403 && isCsrfError && error.config && !(error.config as any)._csrfRetried) {
        csrfToken = null; // force refresh
        (error.config as any)._csrfRetried = true;
        const newToken = await getCsrfToken();
        if (newToken && error.config.headers) {
          error.config.headers["x-csrf-token"] = newToken;
        }
        return instance.request(error.config);
      }
      return Promise.reject(error);
    }
  );

  // Setup request and response interceptors
  setupInterceptors(instance);

  return instance;
};


/**
 * API Client instance
 */
export const apiClient = createApiClient();

/**
 * Helper function to make GET requests
 */
export const apiGet = async <T = any>(
  url: string,
  config = {}
): Promise<ApiResponse<T>> => {
  try {
    const response = await apiClient.get<T>(url, config);
    return {
      data: response.data,
      status: response.status,
      success: true,
    };
  } catch (error) {
    throw handleApiError(error);
  }
};

/**
 * Helper function to make POST requests
 */
export const apiPost = async <T = any>(
  url: string,
  data?: any,
  config = {}
): Promise<ApiResponse<T>> => {
  try {
    const response = await apiClient.post<T>(url, data, config);
    return {
      data: response.data,
      status: response.status,
      success: true,
    };
  } catch (error) {
    throw handleApiError(error);
  }
};

/**
 * Helper function to make PATCH requests
 */
export const apiPatch = async <T = any>(
  url: string,
  data?: any,
  config = {}
): Promise<ApiResponse<T>> => {
  try {
    const response = await apiClient.patch<T>(url, data, config);
    return {
      data: response.data,
      status: response.status,
      success: true,
    };
  } catch (error) {
    throw handleApiError(error);
  }
};

/**
 * Helper function to make PUT requests
 */
export const apiPut = async <T = any>(
  url: string,
  data?: any,
  config = {}
): Promise<ApiResponse<T>> => {
  try {
    const response = await apiClient.put<T>(url, data, config);
    return {
      data: response.data,
      status: response.status,
      success: true,
    };
  } catch (error) {
    throw handleApiError(error);
  }
};

/**
 * Helper function to make DELETE requests
 */
export const apiDelete = async <T = any>(
  url: string,
  config = {}
): Promise<ApiResponse<T>> => {
  try {
    const response = await apiClient.delete<T>(url, config);
    return {
      data: response.data,
      status: response.status,
      success: true,
    };
  } catch (error) {
    throw handleApiError(error);
  }
};

/**
 * Unified error handler
 */
export const handleApiError = (error: unknown): ApiError => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;
    return {
      message: axiosError.message,
      status: axiosError.response?.status || 500,
      data: axiosError.response?.data,
      isNetworkError: !axiosError.response,
    };
  }

  return {
    message: "Unknown error occurred",
    status: 500,
    isNetworkError: true,
  };
};

export default apiClient;
