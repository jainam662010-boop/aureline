"use client";

import * as React from "react";
import { toast } from "sonner";
import { Loader2, Mail, Phone, CalendarClock, Building2, Paperclip, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { adminUpdateEnquiry } from "@/actions/admin";
import { cn, formatDate } from "@/lib/utils";

interface Enquiry {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string | null;
  productName: string | null;
  quantity: number;
  deadline: string | null;
  message: string | null;
  artworkUrl: string | null;
  status: "NEW" | "CONTACTED" | "QUOTED" | "CONVERTED" | "CLOSED";
  adminNotes: string | null;
  createdAt: string;
}

const STATUS_TONE: Record<Enquiry["status"], string> = {
  NEW: "border-[#FF0D7B]/50 bg-[#FF0D7B]/15 text-[#FF6BC0]",
  CONTACTED: "border-[#00E0F2]/40 bg-[#00E0F2]/10 text-[#66EFFA]",
  QUOTED: "border-[#8026F2]/40 bg-[#8026F2]/15 text-[#B08CFF]",
  CONVERTED: "border-[#22c55e]/40 bg-[#22c55e]/10 text-[#7ef0a8]",
  CLOSED: "border-white/15 bg-white/[0.05] text-white/50",
};

export function EnquiriesManager({ enquiries }: { enquiries: Enquiry[] }) {
  if (enquiries.length === 0) {
    return (
      <div className="glass-panel p-space-xl text-center">
        <MessageSquare className="size-7 text-white/30 mx-auto mb-space-sm" />
        <p className="font-label-lg text-label-lg text-white">No bulk enquiries yet</p>
        <p className="font-body-sm text-body-sm text-white/50 mt-1">
          Enquiries from Instagram @aureline.tm are logged here with a 12-hour SLA reminder.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-space-sm">
      {enquiries.map((enquiry) => (
        <EnquiryCard key={enquiry.id} enquiry={enquiry} />
      ))}
    </div>
  );
}

function EnquiryCard({ enquiry }: { enquiry: Enquiry }) {
  const [notes, setNotes] = React.useState(enquiry.adminNotes ?? "");
  const [busy, setBusy] = React.useState(false);
  const [status, setStatus] = React.useState(enquiry.status);

  const save = async (nextStatus?: Enquiry["status"], nextNotes?: string) => {
    setBusy(true);
    const result = await adminUpdateEnquiry({
      enquiryId: enquiry.id,
      status: nextStatus ?? status,
      adminNotes: (nextNotes ?? notes) || "",
    });
    setBusy(false);
    if (result.ok) {
      if (nextStatus) setStatus(nextStatus);
      toast.success("Enquiry updated.");
    } else {
      toast.error(result.error);
    }
  };

  const overdue = enquiry.status === "NEW" && Date.now() - new Date(enquiry.createdAt).getTime() > 12 * 3600 * 1000;

  return (
    <article className="glass-panel p-space-md">
      <div className="flex items-start justify-between gap-space-sm flex-wrap mb-space-sm">
        <div className="min-w-0">
          <div className="flex items-center gap-space-xs flex-wrap">
            <h2 className="font-headline-md text-headline-md font-bold text-white">{enquiry.name}</h2>
            <span
              className={cn(
                "rounded-full border px-2.5 py-0.5 font-label-technical text-[9px] uppercase tracking-widest",
                STATUS_TONE[status],
              )}
            >
              {status.replace(/_/g, " ")}
            </span>
            {overdue ? (
              <span className="rounded-full border border-[#ff5545]/40 bg-[#93000a]/25 px-2.5 py-0.5 font-label-technical text-[9px] uppercase tracking-widest text-[#ff9d95]">
                SLA overdue
              </span>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-x-space-sm gap-1 mt-1 font-body-sm text-body-sm text-white/55">
            <a href={`mailto:${enquiry.email}`} className="inline-flex items-center gap-1 hover:text-[#00E0F2] transition-colors">
              <Mail className="size-3.5" /> {enquiry.email}
            </a>
            <a href={`tel:${enquiry.phone}`} className="inline-flex items-center gap-1 hover:text-[#00E0F2] transition-colors">
              <Phone className="size-3.5" /> {enquiry.phone}
            </a>
            {enquiry.company ? (
              <span className="inline-flex items-center gap-1">
                <Building2 className="size-3.5" /> {enquiry.company}
              </span>
            ) : null}
            {enquiry.deadline ? (
              <span className="inline-flex items-center gap-1 text-[#FFC084]">
                <CalendarClock className="size-3.5" /> Needed by {formatDate(enquiry.deadline)}
              </span>
            ) : null}
          </div>
        </div>

        <div className="text-right">
          <p className="font-headline-md text-headline-md font-bold text-white tabular-nums">{enquiry.quantity} pcs</p>
          <p className="font-label-technical text-[9px] uppercase tracking-widest text-white/40">
            {enquiry.productName ?? "mixed blanks"}
          </p>
        </div>
      </div>

      {enquiry.message ? (
        <p className="font-body-md text-body-md text-white/65 leading-relaxed mb-space-sm whitespace-pre-line">
          {enquiry.message}
        </p>
      ) : null}

      {enquiry.artworkUrl ? (
        <a
          href={enquiry.artworkUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-1.5 mb-space-sm px-3 h-8 rounded-full bg-white/[0.06] border border-white/10 font-label-md text-label-md text-white/80 hover:bg-white/[0.12] transition-all"
        >
          <Paperclip className="size-3.5" /> Artwork file
        </a>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-space-sm items-end">
        <div>
          <label htmlFor={`notes-${enquiry.id}`} className="label-tech block mb-1">
            Internal notes / quote sent
          </label>
          <Textarea
            id={`notes-${enquiry.id}`}
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Pricing quoted, artwork fixed, PO number…"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {(["NEW", "CONTACTED", "QUOTED", "CONVERTED", "CLOSED"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => save(value)}
              disabled={busy || status === value}
              className={cn(
                "px-3 h-9 rounded-full border font-label-technical text-[9px] uppercase tracking-widest transition-all",
                status === value
                  ? STATUS_TONE[value]
                  : "border-white/10 bg-white/[0.03] text-white/45 hover:text-white hover:border-white/25",
                busy && "opacity-50",
              )}
            >
              {value.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-end mt-space-xs">
        <Button size="sm" variant="glass" className="h-9" onClick={() => save()} disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : null}
          Save notes
        </Button>
      </div>
    </article>
  );
}
