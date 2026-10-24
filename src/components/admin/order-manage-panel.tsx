"use client";

import * as React from "react";
import { toast } from "sonner";
import { Loader2, Truck, StickyNote, BellRing, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/orders/order-status";
import {
  adminUpdateOrderStatus,
  adminSetTracking,
  adminAddOrderNote,
  adminNotifyCustomer,
} from "@/actions/admin";
import { cn } from "@/lib/utils";

const NEXT_STATUSES = [
  "ARTWORK_REVIEW",
  "IN_PRODUCTION",
  "QUALITY_CHECK",
  "PACKED",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REFUND_REQUESTED",
  "REFUNDED",
] as const;

interface NoteItem {
  id: string;
  body: string;
  isInternal: boolean;
  author: string;
  createdAt: string;
}

export function OrderManagePanel({
  orderId,
  status,
  courier,
  trackingNumber,
  trackingUrl,
  notes,
  whatsappPhone,
  orderNumber,
  shippingMethod,
  pickupAddress,
}: {
  orderId: string;
  status: string;
  courier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  notes: NoteItem[];
  whatsappPhone?: string | null;
  orderNumber?: string;
  shippingMethod?: string;
  pickupAddress?: string | null;
}) {
  const [busy, setBusy] = React.useState<string | null>(null);
  const [currentStatus, setCurrentStatus] = React.useState(status);
  const [statusNote, setStatusNote] = React.useState("");
  const [noteBody, setNoteBody] = React.useState("");
  const [noteInternal, setNoteInternal] = React.useState(true);
  const [noteList, setNoteList] = React.useState<NoteItem[]>(notes);
  const [track, setTrack] = React.useState({
    courier: courier ?? "",
    trackingNumber: trackingNumber ?? "",
    trackingUrl: trackingUrl ?? "",
  });

  React.useEffect(() => setNoteList(notes), [notes]);

  const changeStatus = async () => {
    const next = (document.getElementById("status-select") as HTMLSelectElement | null)?.value;
    if (!next || next === currentStatus) {
      toast.error("Pick a different status first.");
      return;
    }
    setBusy("status");
    const result = await adminUpdateOrderStatus({ orderId, status: next as never, note: statusNote });
    setBusy(null);
    if (result.ok) {
      setCurrentStatus(result.data.status);
      setStatusNote("");
      toast.success(`Order moved to ${result.data.status.replace(/_/g, " ").toLowerCase()}.`);
    } else {
      toast.error(result.error);
    }
  };

  const saveTracking = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy("tracking");
    const result = await adminSetTracking({ orderId, ...track });
    setBusy(null);
    if (result.ok) toast.success("Tracking saved — customer can see it on their order page.");
    else toast.error(result.error);
  };

  const addNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (noteBody.trim().length < 2) return;
    setBusy("note");
    const result = await adminAddOrderNote({ orderId, body: noteBody.trim(), isInternal: noteInternal });
    setBusy(null);
    if (result.ok) {
      setNoteList((prev) => [
        {
          id: `local-${Date.now()}`,
          body: noteBody.trim(),
          isInternal: noteInternal,
          author: "You",
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
      setNoteBody("");
      toast.success("Note added.");
    } else {
      toast.error(result.error);
    }
  };

  const notify = async () => {
    setBusy("notify");
    const result = await adminNotifyCustomer(orderId, statusNote || undefined);
    setBusy(null);
    if (result.ok) toast.success(result.data.sent ? "Status email sent." : "Queued (console fallback in dev).");
    else toast.error(result.error);
  };

  /* One-click WhatsApp to the customer: opens wa.me pre-filled so the message
     reaches them even before Cloud API keys are configured. The wording follows
     the order's real stage (accepted, dispatched, or ready for pickup). */
  const isPickup = shippingMethod === "PICKUP";
  const whatsappLabel = isPickup
    ? "WhatsApp pickup ready"
    : "WhatsApp request accepted";

  const openWhatsapp = () => {
    const digits = (whatsappPhone ?? "").replace(/\D/g, "");
    if (!digits) {
      toast.error("No WhatsApp number captured for this order.");
      return;
    }
    const to = digits.length === 10 ? `91${digits}` : digits;

    let message: string;
    if (currentStatus === "SHIPPED" && !isPickup) {
      message =
        `Hi! Your order ${orderNumber ?? ""} is on its way.` +
        (courier ? `\nCourier: ${courier}` : "") +
        (trackingNumber ? `\nTracking: ${trackingNumber}` : "") +
        (trackingUrl ? `\nFollow: ${trackingUrl}` : "");
    } else if (isPickup && (currentStatus === "PACKED" || currentStatus === "QUALITY_CHECK")) {
      message =
        `Hi! Your order ${orderNumber ?? ""} is packed and ready for pickup at ${pickupAddress ?? "our store"}.` +
        `\n\nPlease bring this message and a photo ID. We hold pickups for 7 days.`;
    } else {
      message =
        `Hi! Your request ${orderNumber ?? ""} has been accepted and your print slot is confirmed.` +
        (statusNote ? `\n\nUpdate: ${statusNote}` : "");
    }

    window.open(`https://wa.me/${to}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="flex flex-col gap-space-md sticky top-24">
      {/* Status */}
      <section className="glass-panel p-space-md">
        <div className="flex items-center justify-between mb-space-sm">
          <h2 className="font-headline-md text-headline-md font-bold text-white">Status</h2>
          <StatusBadge status={currentStatus} />
        </div>

        <Label htmlFor="status-select">Move to</Label>
        <select
          id="status-select"
          defaultValue={currentStatus}
          className="w-full h-11 px-space-sm rounded-2xl bg-white/[0.05] border border-white/[0.14] text-body-md text-white focus:outline-none focus:ring-2 focus:ring-[#FF3B30] mt-1"
        >
          {NEXT_STATUSES.map((value) => (
            <option key={value} value={value} className="bg-[#101014] text-white">
              {value.replace(/_/g, " ")}
            </option>
          ))}
        </select>

        <Label htmlFor="status-note" className="mt-space-sm block">
          Customer-visible note (optional)
        </Label>
        <Textarea
          id="status-note"
          rows={2}
          value={statusNote}
          onChange={(e) => setStatusNote(e.target.value)}
          placeholder="e.g. Print looks great — moving to production."
        />

        <div className="flex gap-space-xs mt-space-sm">
          <Button size="sm" className="flex-1 h-10" onClick={changeStatus} disabled={busy === "status"}>
            {busy === "status" ? <Loader2 className="size-4 animate-spin" /> : null}
            Update status
          </Button>
          <Button variant="glass" size="sm" className="flex-1 h-10" onClick={notify} disabled={busy === "notify"}>
            {busy === "notify" ? <Loader2 className="size-4 animate-spin" /> : <BellRing className="size-4" />}
            Email customer
          </Button>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-full h-10 mt-space-xs border-[#22c55e]/40 text-[#7ef0a8] hover:bg-[#22c55e]/12"
          onClick={openWhatsapp}
        >
          <MessageCircle className="size-4" />
          {whatsappLabel}
        </Button>
      </section>

      {/* Tracking */}
      <section className="glass-panel p-space-md">
        <h2 className="font-headline-md text-headline-md font-bold text-white mb-space-sm flex items-center gap-space-xs">
          <Truck className="size-4 text-[#00E0F2]" /> Shipping
        </h2>
        <form onSubmit={saveTracking} className="flex flex-col gap-space-sm">
          <div>
            <Label htmlFor="courier">Courier</Label>
            <Input
              id="courier"
              value={track.courier}
              onChange={(e) => setTrack((t) => ({ ...t, courier: e.target.value }))}
              placeholder="Delhivery / Bluedart"
              required
            />
          </div>
          <div>
            <Label htmlFor="tracking-number">Tracking number</Label>
            <Input
              id="tracking-number"
              value={track.trackingNumber}
              onChange={(e) => setTrack((t) => ({ ...t, trackingNumber: e.target.value }))}
              placeholder="DLV123456789"
              required
            />
          </div>
          <div>
            <Label htmlFor="tracking-url">Tracking URL (optional)</Label>
            <Input
              id="tracking-url"
              type="url"
              value={track.trackingUrl}
              onChange={(e) => setTrack((t) => ({ ...t, trackingUrl: e.target.value }))}
              placeholder="https://…"
            />
          </div>
          <Button type="submit" variant="glass" size="sm" className="h-10" disabled={busy === "tracking"}>
            {busy === "tracking" ? <Loader2 className="size-4 animate-spin" /> : null}
            Save tracking
          </Button>
        </form>
      </section>

      {/* Notes */}
      <section className="glass-panel p-space-md">
        <h2 className="font-headline-md text-headline-md font-bold text-white mb-space-sm flex items-center gap-space-xs">
          <StickyNote className="size-4 text-[#FF6BC0]" /> Notes
        </h2>

        <form onSubmit={addNote} className="flex flex-col gap-space-xs mb-space-sm">
          <Textarea
            rows={2}
            value={noteBody}
            onChange={(e) => setNoteBody(e.target.value)}
            placeholder="Internal note or message to include in the customer email…"
          />
          <label className="flex items-center gap-space-xs cursor-pointer">
            <input
              type="checkbox"
              checked={noteInternal}
              onChange={(e) => setNoteInternal(e.target.checked)}
              className="accent-[#FF3B30] w-4 h-4"
            />
            <span className="font-body-sm text-body-sm text-white/60">Internal only (hidden from the customer)</span>
          </label>
          <Button type="submit" variant="glass" size="sm" className="h-9" disabled={busy === "note"}>
            {busy === "note" ? <Loader2 className="size-4 animate-spin" /> : null}
            Add note
          </Button>
        </form>

        <ul className="flex flex-col gap-space-xs max-h-72 overflow-y-auto hide-scrollbar">
          {noteList.map((note) => (
            <li
              key={note.id}
              className={cn(
                "rounded-2xl p-space-sm border",
                note.isInternal ? "border-white/10 bg-white/[0.03]" : "border-[#00E0F2]/30 bg-[#00E0F2]/[0.07]",
              )}
            >
              <div className="flex items-center justify-between gap-space-xs mb-1">
                <span className="font-label-technical text-[9px] uppercase tracking-widest text-white/45">
                  {note.author} {note.isInternal ? "· internal" : "· customer"}
                </span>
                <span className="font-label-technical text-[9px] text-white/30">
                  {new Date(note.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                </span>
              </div>
              <p className="font-body-sm text-body-sm text-white/75 leading-relaxed">{note.body}</p>
            </li>
          ))}
          {noteList.length === 0 ? (
            <li className="font-body-sm text-body-sm text-white/40">No notes yet.</li>
          ) : null}
        </ul>
      </section>
    </div>
  );
}
