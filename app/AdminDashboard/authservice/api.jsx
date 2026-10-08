"use client";

import axios from "axios";
import { toast } from "react-hot-toast";

function normalizeApiBaseUrl(baseUrl) {
  const trimmedBaseUrl = baseUrl?.replace(/\/+$/, "");

  if (!trimmedBaseUrl) {
    return "";
  }

  return /\/api$/i.test(trimmedBaseUrl)
    ? trimmedBaseUrl
    : `${trimmedBaseUrl}/api`;
}

function getBaseUrl() {
  const envBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  return envBaseUrl ? normalizeApiBaseUrl(envBaseUrl) : "/api";
}

/**
 * Generic API request function
 */
export async function apiRequest(
  endpoint,
  {
    method = "GET",
    data = null,
    headers = {},
    includeAuth = false,
    formData = false,
    successMessage = null,
    timeout = 30 * 60 * 1000,
    params = null,
    onUploadProgress = null,
    fullResponse = false,
  } = {}
) {
  try {
    let finalHeaders = { ...headers };

    // ----------------------------
    // FormData Handling
    // ----------------------------
    if (formData) {
      if (!(data instanceof FormData)) {
        console.warn("apiRequest: formData=true but data is not FormData");
      }
      delete finalHeaders["Content-Type"];
    } else if (data && typeof data === "object") {
      finalHeaders["Content-Type"] = "application/json";
    }

    // ----------------------------
    // Optional Bearer Token (if used)
    // ----------------------------
    if (includeAuth && typeof window !== "undefined") {
      const token = sessionStorage.getItem("authToken");
      if (token) {
        finalHeaders["Authorization"] = `Bearer ${token}`;
      }
    }

    // ----------------------------
    // Build URL
    // ----------------------------
    const baseUrl = getBaseUrl();
    const url = `${baseUrl}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

    if (process.env.NODE_ENV === "development") {
      console.log("API Request:", {
        url,
        method,
        headers: finalHeaders,
        params,
        hasBody: !["GET", "HEAD"].includes(method.toUpperCase()),
      });
    }

    // ----------------------------
    // Axios Config
    // ----------------------------
    const config = {
      url,
      method: method.toUpperCase(),
      headers: finalHeaders,
      timeout,
      params,
      withCredentials: true,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      onUploadProgress:
        typeof onUploadProgress === "function"
          ? onUploadProgress
          : undefined,
    };

    if (!["GET", "HEAD"].includes(config.method)) {
      config.data = data;
    }

    // ----------------------------
    // Make Request
    // ----------------------------
    const response = await axios(config);

    // ----------------------------
    // Success Toast
    // ----------------------------
    const msg = successMessage || response.data?.message;

    if (
      msg &&
      typeof window !== "undefined" &&
      !["GET", "HEAD"].includes(config.method)
    ) {
      toast.success(msg);
    }

    return fullResponse ? response : response.data;
  } catch (error) {
    const status = error?.response?.status;
    const reason = error?.response?.data?.reason;
    const isDatabaseUnavailable =
      status === 503 && reason === "database_unavailable";

    if (![401, 403, 409].includes(status) && !isDatabaseUnavailable) {
      console.error("API Request Error:", error);
    } else if (process.env.NODE_ENV === "development") {
      console.warn("API Request Rejected:", {
        status,
        url: error?.config?.url,
        message: error?.response?.data?.message || error?.message,
      });
    }

    const errorMessage =
      error.response?.data?.message ||
      error.response?.data?.error ||
      (error.code === "ECONNABORTED"
        ? "Request timed out. Please try again."
        : null) ||
      (error.message?.includes("Network Error")
        ? "Network error - check backend connection."
        : null) ||
      error.message ||
      "Something went wrong";

    if (typeof window !== "undefined") {
      toast.error(errorMessage);
    }

    const customError = new Error(errorMessage);
    customError.original = error;
    customError.response = error?.response;
    customError.status = error?.response?.status;
    throw customError;
  }
}
