/**
 * Request Interceptor
 * Handles request configuration, authentication, logging
 */

import { InternalAxiosRequestConfig } from "axios";

export const setupRequestInterceptor = (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
  // NOTE: Authentication is handled via the session cookie (connect.sid).
  // withCredentials: true on the Axios instance ensures the cookie is sent automatically.
  // There is no JWT / Bearer token in this application.

  // Add request ID for tracking
  if (config.headers) {
    config.headers["X-Request-ID"] = generateRequestId();
  }

  // Add language header
  const language = localStorage.getItem("language") || "ar";
  if (config.headers) {
    config.headers["Accept-Language"] = language;
  }

  // Log request in development
  if (import.meta.env.DEV) {
    console.debug(`[API Request] ${config.method?.toUpperCase()} ${config.url}`, {
      headers: config.headers,
      data: config.data,
    });
  }

  return config;
};


/**
 * Generate unique request ID for tracking
 */
const generateRequestId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};
