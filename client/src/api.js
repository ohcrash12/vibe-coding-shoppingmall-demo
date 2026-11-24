/**
 * API Base URL
 * - 로컬: client/.env 에 VITE_API_URL=http://localhost:5000
 * - 배포(Vercel): VITE_API_URL=https://your-app.herokuapp.com
 */
const RAW_BASE = import.meta.env.VITE_API_URL ?? "";

export const API_BASE = String(RAW_BASE).trim().replace(/\/+$/, "");

export function apiUrl(path = "") {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${normalized}`;
}
