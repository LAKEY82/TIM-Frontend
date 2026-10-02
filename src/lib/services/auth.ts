import { api, extractAccessToken, tokenStore } from "@/lib/api";
import { rec, toUser } from "@/lib/services/normalize";
import type { User } from "@/types/domain";

export interface LoginInput {
  email: string;
  password: string;
}

function userFrom(payload: unknown): User | null {
  const obj = rec(payload);
  const candidate = obj.user ?? (obj.email ? obj : null);
  return candidate ? toUser(candidate) : null;
}

export const authService = {
  async login(input: LoginInput): Promise<User> {
    const payload = await api.post("/api/auth/login", input, { skipAuthRefresh: true });
    const token = extractAccessToken(payload);
    if (token) tokenStore.set(token);
    const user = userFrom(payload);
    return user ?? authService.me();
  },

  async me(): Promise<User> {
    const payload = await api.get("/api/auth/me", { skipAuthRefresh: true });
    const user = userFrom(payload);
    if (!user) throw new Error("Unexpected response from /api/auth/me");
    return user;
  },

  async logout(): Promise<void> {
    try {
      await api.post("/api/auth/logout", {}, { skipAuthRefresh: true });
    } finally {
      tokenStore.clear();
    }
  },

  forgotPassword: (email: string) => api.post("/api/auth/forgot-password", { email }, { skipAuthRefresh: true }),

  resetPassword: (token: string, password: string) =>
    api.post("/api/auth/reset-password", { token, password }, { skipAuthRefresh: true }),

  changePassword: (currentPassword: string, newPassword: string) =>
    api.post("/api/auth/change-password", { currentPassword, newPassword }),
};
