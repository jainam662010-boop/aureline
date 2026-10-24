/**
 * Static-build replacements for src/actions/upload.ts + auth.ts + account.ts +
 * bulk.ts + admin.ts (GitHub Pages demo). Artwork upload runs fully client-side
 * (data URL) so the design studio keeps working; everything that needs a
 * backend politely reports demo mode.
 */
export interface UploadedArtwork {
  url: string;
  width: number;
  height: number;
  bytes: number;
}

import type { ApiResponse } from "@/lib/response";

const NOT_AVAILABLE = "This needs the full backend and is unavailable in the static demo build.";

/* ----------------------------------------------------------------- upload */

const ALLOWED = ["image/jpeg", "image/png", "image/svg+xml", "image/webp"];
const MAX_BYTES = 10 * 1024 * 1024;

export async function uploadArtwork(file: File): Promise<ApiResponse<UploadedArtwork>> {
  if (!ALLOWED.includes(file.type)) {
    return { ok: false, error: "Unsupported file type. Use PNG, JPG, WEBP or SVG." };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: "Artwork is larger than 10 MB." };
  }
  try {
    const url = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("read-failed"));
      reader.readAsDataURL(file);
    });
    const dims = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => reject(new Error("decode-failed"));
      img.src = url;
    });
    return { ok: true, data: { url, ...dims, bytes: file.size } };
  } catch {
    return { ok: false, error: "Could not read that file in the browser." };
  }
}

export async function sendContactMessage(_input: { name: string; email: string; message: string }): Promise<ApiResponse<{ sent: boolean }>> {
  return { ok: false, error: NOT_AVAILABLE };
}

/* ------------------------------------------------------------------- auth */

export async function registerUser(_input: { name: string; email: string; phone?: string; password: string }): Promise<ApiResponse<{ email: string }>> {
  return { ok: false, error: NOT_AVAILABLE };
}

export async function requestPasswordReset(_input: { email: string }): Promise<ApiResponse<{ sent: boolean }>> {
  return { ok: false, error: NOT_AVAILABLE };
}

export async function resetPassword(_input: { token: string; password: string }): Promise<ApiResponse<{ reset: boolean }>> {
  return { ok: false, error: NOT_AVAILABLE };
}

/* ---------------------------------------------------------------- account */

export interface AddressFormData {
  id?: string;
  label: string;
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

export async function updateProfile(_input: { name: string; phone?: string }): Promise<ApiResponse<{ saved: true }>> {
  return { ok: false, error: NOT_AVAILABLE };
}

export async function changePassword(_input: { currentPassword: string; newPassword: string }): Promise<ApiResponse<{ changed: true }>> {
  return { ok: false, error: NOT_AVAILABLE };
}

export async function saveAddress(_input: AddressFormData): Promise<ApiResponse<{ id: string }>> {
  return { ok: false, error: NOT_AVAILABLE };
}

export async function deleteAddress(_id: string): Promise<ApiResponse<{ deleted: true }>> {
  return { ok: false, error: NOT_AVAILABLE };
}

export async function listAddresses(): Promise<never[]> {
  return [];
}

/* ------------------------------------------------------------------- bulk */

export async function submitBulkEnquiry(_input: unknown, _artwork?: File | null): Promise<ApiResponse<{ id: string; reference: string }>> {
  return { ok: false, error: NOT_AVAILABLE };
}

/* ------------------------------------------------------------------ admin */

const adminFail = () => ({ ok: false as const, error: NOT_AVAILABLE });

export async function adminUpdateOrderStatus(_input: unknown): Promise<ApiResponse<{ status: string }>> {
  return adminFail();
}
export async function adminSetTracking(_input: unknown): Promise<ApiResponse<{ saved: true }>> {
  return adminFail();
}
export async function adminAddOrderNote(_input: unknown): Promise<ApiResponse<{ saved: true }>> {
  return adminFail();
}
export async function adminNotifyCustomer(_orderId: string, _message?: string): Promise<ApiResponse<{ sent: boolean }>> {
  return adminFail();
}
export async function adminUpdateProduct(_input: unknown): Promise<ApiResponse<{ saved: true }>> {
  return adminFail();
}
export async function adminUpdateVariantStock(_input: unknown): Promise<ApiResponse<{ stock: number }>> {
  return adminFail();
}
export async function adminSaveCoupon(_input: unknown): Promise<ApiResponse<{ id: string }>> {
  return adminFail();
}
export async function adminToggleCoupon(_id: string, _isActive: boolean): Promise<ApiResponse<{ saved: true }>> {
  return adminFail();
}
export async function adminUpdateEnquiry(_input: unknown): Promise<ApiResponse<{ saved: true }>> {
  return adminFail();
}
export async function adminSaveSettings(_input: unknown): Promise<ApiResponse<{ saved: true }>> {
  return adminFail();
}
export interface AdminStatsShim {
  revenue: number;
  paidOrders: number;
  pendingReview: number;
  inProduction: number;
  newEnquiries: number;
  lowStock: { name: string; size: string; color: string; stock: number }[];
  revenueByDay: { day: string; revenue: number }[];
  statusBreakdown: { status: string; count: number }[];
  topProducts: { name: string; units: number; revenue: number }[];
  recentOrders: { id: string; status: string }[];
}

export async function getAdminStats(): Promise<ApiResponse<AdminStatsShim>> {
  return adminFail();
}
/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
export async function requireUserOrAdmin(): Promise<any> {
  return null;
}
