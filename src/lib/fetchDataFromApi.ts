import axios from "axios";

// Use the browser origin for client-side requests.
// On the server, use the configured internal API URL.
const baseURL =
  typeof window !== "undefined"
    ? `${window.location.origin}/api`
    : process.env.INTERNAL_API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "http://localhost:3000/api";

const getBrowserToken = (): string | null => {
  // document is unavailable during server-side rendering.
  if (typeof document === "undefined") {
    return null;
  }

  const tokenCookie = document.cookie
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith("token="));

  if (!tokenCookie) {
    return null;
  }

  try {
    return decodeURIComponent(
      tokenCookie.substring("token=".length)
    );
  } catch {
    return null;
  }
};

export const axiosInstance = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// Add browser authentication token when available.
axiosInstance.interceptors.request.use(
  (config) => {
    const token = getBrowserToken();

    if (token) {
      config.headers.set("Authorization", `Bearer ${token}`);
    }

    return config;
  },
  (error) => Promise.reject(error)
);

const fetchData = {
  get: async (url: string, params = {}) => {
    try {
      return await axiosInstance.get(url, { params });
    } catch (error) {
      console.error("Error fetching data:", error);
      throw error;
    }
  },

  post: async (url: string, data = {}) => {
    try {
      return await axiosInstance.post(url, data);
    } catch (error) {
      console.error("Error posting data:", error);
      throw error;
    }
  },
};

export default fetchData;
