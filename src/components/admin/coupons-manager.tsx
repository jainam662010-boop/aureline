"use client";

import * as React from "react";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Power, TicketPercent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { adminSaveCoupon, adminToggleCoupon } from "@/actions/admin";
import { cn, formatINR } from "@/lib/utils";

interface CouponRow {
  id: string;
  code: string;
  description: string | null;
  type: "PERCENTAGE" | "FIXED" | "FREE_SHIPPING";
  value: number;
  minOrderAmount: number;
  maxDiscountAmount: number | null;
  usageLimit: number | null;
  usedCount: number;
  endsAt: string | null;
  isActive: boolean;
  redemptions: number;
}

interface FormState {
  code: string;
  description: string;
  type: CouponRow["type"];
  value: number;
  minOrderAmount: number;
  maxDiscountAmount: string;
  usageLimit: string;
  endsAt: string;
  isActive: boolean;
}

const EMPTY: FormState = {
  code: "",
  description: "",
  type: "PERCENTAGE",
  value: 10,
  minOrderAmount: 0,
  maxDiscountAmount: "",
  usageLimit: "",
  endsAt: "",
  isActive: true,
};

export function CouponsManager({ coupons }: { coupons: CouponRow[] }) {
  const [open, setOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<FormState>(EMPTY);
  const [busy, setBusy] = React.useState(false);

  const openNew = () => {
    setEditingId(null);
    setForm(EMPTY);
    setOpen(true);
  };

  const openEdit = (coupon: CouponRow) => {
    setEditingId(coupon.id);
    setForm({
      code: coupon.code,
      description: coupon.description ?? "",
      type: coupon.type,
      value: coupon.value,
      minOrderAmount: coupon.minOrderAmount,
      maxDiscountAmount: coupon.maxDiscountAmount !== null ? String(coupon.maxDiscountAmount) : "",
      usageLimit: coupon.usageLimit !== null ? String(coupon.usageLimit) : "",
      endsAt: coupon.endsAt ? coupon.endsAt.slice(0, 10) : "",
      isActive: coupon.isActive,
    });
    setOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.code.trim().length < 3) {
      toast.error("Codes need at least 3 characters.");
      return;
    }
    setBusy(true);
    const result = await adminSaveCoupon({
      id: editingId ?? undefined,
      code: form.code.trim().toUpperCase(),
      description: form.description || undefined,
      type: form.type,
      value: Number(form.value) || 0,
      minOrderAmount: Number(form.minOrderAmount) || 0,
      maxDiscountAmount: form.maxDiscountAmount ? Number(form.maxDiscountAmount) : null,
      usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
      endsAt: form.endsAt || null,
      isActive: form.isActive,
    });
    setBusy(false);
    if (result.ok) {
      toast.success(editingId ? "Coupon updated." : "Coupon created.");
      setOpen(false);
    } else {
      toast.error(result.error);
    }
  };

  const toggle = async (coupon: CouponRow) => {
    const result = await adminToggleCoupon(coupon.id, !coupon.isActive);
    if (result.ok) toast.success(`${coupon.code} ${!coupon.isActive ? "activated" : "deactivated"}.`);
    else toast.error(result.error);
  };

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={openNew} size="md">
          <Plus className="size-4" /> New coupon
        </Button>
      </div>

      <div className="glass-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/[0.08]">
                {["Code", "Discount", "Conditions", "Used", "Expires", "State", ""].map((head) => (
                  <th key={head} className="px-space-md py-3 font-label-technical text-[9px] uppercase tracking-widest text-white/40">
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {coupons.map((coupon) => {
                const expired = coupon.endsAt ? new Date(coupon.endsAt) < new Date() : false;
                return (
                  <tr key={coupon.id} className="border-b border-white/[0.05] hover:bg-white/[0.03] transition-colors">
                    <td className="px-space-md py-3">
                      <span className="inline-flex items-center gap-1.5 font-label-lg text-label-lg text-white">
                        <TicketPercent className="size-3.5 text-[#FF6BC0]" />
                        {coupon.code}
                      </span>
                      {coupon.description ? (
                        <p className="font-body-sm text-body-sm text-white/45 truncate max-w-52">{coupon.description}</p>
                      ) : null}
                    </td>
                    <td className="px-space-md py-3 font-label-md text-label-md text-[#7ef0a8]">
                      {coupon.type === "PERCENTAGE" ? `−${coupon.value}%` : coupon.type === "FIXED" ? formatINR(coupon.value, true) : "Free shipping"}
                    </td>
                    <td className="px-space-md py-3 font-body-sm text-body-sm text-white/55">
                      {coupon.minOrderAmount > 0 ? `Min ${formatINR(coupon.minOrderAmount, true)}` : "No minimum"}
                      {coupon.maxDiscountAmount !== null ? ` · cap ${formatINR(coupon.maxDiscountAmount, true)}` : ""}
                      {coupon.usageLimit !== null ? ` · limit ${coupon.usageLimit}` : ""}
                    </td>
                    <td className="px-space-md py-3 font-body-sm text-body-sm text-white/55 tabular-nums">
                      {coupon.redemptions}
                      {coupon.usedCount > 0 ? ` (+${coupon.usedCount} sync)` : ""}
                    </td>
                    <td className="px-space-md py-3 font-body-sm text-body-sm text-white/55 whitespace-nowrap">
                      {coupon.endsAt ? (
                        <span className={expired ? "text-[#ff9d95]" : undefined}>{new Date(coupon.endsAt).toLocaleDateString("en-IN")}</span>
                      ) : (
                        "Never"
                      )}
                    </td>
                    <td className="px-space-md py-3">
                      <span
                        className={cn(
                          "inline-flex rounded-full border px-3 py-1 font-label-technical text-[9px] uppercase tracking-widest",
                          coupon.isActive && !expired
                            ? "border-[#22c55e]/40 bg-[#22c55e]/10 text-[#7ef0a8]"
                            : "border-white/15 bg-white/[0.05] text-white/50",
                        )}
                      >
                        {coupon.isActive ? (expired ? "Expired" : "Active") : "Off"}
                      </span>
                    </td>
                    <td className="px-space-md py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEdit(coupon)}
                          aria-label={`Edit ${coupon.code}`}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/[0.1] transition-all"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => toggle(coupon)}
                          aria-label={`${coupon.isActive ? "Deactivate" : "Activate"} ${coupon.code}`}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/[0.1] transition-all"
                        >
                          <Power className="size-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {coupons.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-space-md py-10 text-center font-body-sm text-body-sm text-white/40">
                    No coupons yet — create your first one.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit coupon" : "New coupon"}</DialogTitle>
            <DialogDescription>Discounts apply to print + blank charges before GST.</DialogDescription>
          </DialogHeader>

          <form onSubmit={submit} className="flex flex-col gap-space-sm mt-space-xs">
            <div className="grid grid-cols-2 gap-space-sm">
              <div>
                <Label htmlFor="coupon-code">Code</Label>
                <Input
                  id="coupon-code"
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                  placeholder="WELCOME10"
                  className="uppercase"
                  required
                />
              </div>
              <div>
                <Label htmlFor="coupon-type">Type</Label>
                <select
                  id="coupon-type"
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as FormState["type"] }))}
                  className="w-full h-11 px-space-sm rounded-2xl bg-white/[0.05] border border-white/[0.14] text-body-md text-white focus:outline-none focus:ring-2 focus:ring-[#FF3B30]"
                >
                  <option value="PERCENTAGE" className="bg-[#101014]">Percentage off</option>
                  <option value="FIXED" className="bg-[#101014]">Fixed ₹ off</option>
                  <option value="FREE_SHIPPING" className="bg-[#101014]">Free shipping</option>
                </select>
              </div>
            </div>

            <div>
              <Label htmlFor="coupon-desc">Description</Label>
              <Textarea
                id="coupon-desc"
                rows={2}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Shown internally; helpful for remembering campaign intent."
              />
            </div>

            <div className="grid grid-cols-2 gap-space-sm">
              {form.type !== "FREE_SHIPPING" ? (
                <div>
                  <Label htmlFor="coupon-value">{form.type === "PERCENTAGE" ? "Percent" : "Amount (₹)"}</Label>
                  <Input
                    id="coupon-value"
                    type="number"
                    min={0}
                    max={form.type === "PERCENTAGE" ? 100 : 100000}
                    value={form.value}
                    onChange={(e) => setForm((f) => ({ ...f, value: Number(e.target.value) }))}
                    required
                  />
                </div>
              ) : (
                <div>
                  <Label>Benefit</Label>
                  <Input value="Shipping waived" disabled className="opacity-60" />
                </div>
              )}
              <div>
                <Label htmlFor="coupon-min">Min order (₹)</Label>
                <Input
                  id="coupon-min"
                  type="number"
                  min={0}
                  value={form.minOrderAmount}
                  onChange={(e) => setForm((f) => ({ ...f, minOrderAmount: Number(e.target.value) }))}
                />
              </div>
              <div>
                <Label htmlFor="coupon-cap">Max discount (₹, optional)</Label>
                <Input
                  id="coupon-cap"
                  type="number"
                  min={0}
                  value={form.maxDiscountAmount}
                  onChange={(e) => setForm((f) => ({ ...f, maxDiscountAmount: e.target.value }))}
                  placeholder="e.g. 500"
                />
              </div>
              <div>
                <Label htmlFor="coupon-limit">Usage limit (optional)</Label>
                <Input
                  id="coupon-limit"
                  type="number"
                  min={1}
                  value={form.usageLimit}
                  onChange={(e) => setForm((f) => ({ ...f, usageLimit: e.target.value }))}
                  placeholder="Unlimited"
                />
              </div>
              <div>
                <Label htmlFor="coupon-ends">Expires (optional)</Label>
                <Input
                  id="coupon-ends"
                  type="date"
                  value={form.endsAt}
                  onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))}
                />
              </div>
              <label className="flex items-center gap-space-xs self-end pb-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                  className="accent-[#FF3B30] w-4 h-4"
                />
                <span className="font-body-sm text-body-sm text-white/70">Active immediately</span>
              </label>
            </div>

            <DialogFooter>
              <Button type="submit" size="md" disabled={busy}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                {editingId ? "Save changes" : "Create coupon"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
