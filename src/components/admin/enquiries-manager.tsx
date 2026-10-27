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
  NEW: "border-[#0EA5E9]/50 bg-[#0EA5E9]/15 text-[#0284C7]",
  CONTACTED: "border-[#0891B2]/40 bg-[#0891B2]/10 text-[#0E7490]",
  QUOTED: "border-[#7C3AED]/40 bg-[#7C3AED]/15 text-[#6D28D9]",
  CONVERTED: "border-[#22c55e]/40 bg-[#22c55e]/10 text-[#047857]",
  CLOSED: "border-slate-900/[0.1] bg-slate-900/[0.05] text-slate-500",
};

export function EnquiriesManager({ enquiries }: { enquiries: Enquiry[] }) {
  if (enquiries.length === 0) {
    return (
      <div className="glass-panel p-space-xl text-center">
        <MessageSquare className="size-7 text-slate-400 mx-auto mb-space-sm" />
        <p className="font-label-lg text-label-lg text-slate-900">No bulk enquiries yet</p>
        <p className="font-body-sm text-body-sm text-slate-500 mt-1">
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
            <h2 className="font-headline-md text-headline-md font-bold text-slate-900">{enquiry.name}</h2>
            <span
              className={cn(
                "rounded-full border px-2.5 py-0.5 font-label-technical text-[9px] uppercase tracking-widest",
                STATUS_TONE[status],
              )}
            >
              {status.replace(/_/g, " ")}
            </span>
            {overdue ? (
              <span className="rounded-full border border-[#F43F5E]/40 bg-[#E11D48]/25 px-2.5 py-0.5 font-label-technical text-[9px] uppercase tracking-widest text-[#BE123C]">
                SLA overdue
              </span>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-x-space-sm gap-1 mt-1 font-body-sm text-body-sm text-slate-600">
            <a href={`mailto:${enquiry.email}`} className="inline-flex items-center gap-1 hover:text-[#0891B2] transition-colors">
              <Mail className="size-3.5" /> {enquiry.email}
            </a>
            <a href={`tel:${enquiry.phone}`} className="inline-flex items-center gap-1 hover:text-[#0891B2] transition-colors">
              <Phone className="size-3.5" /> {enquiry.phone}
            </a>
            {enquiry.company ? (
              <span className="inline-flex items-center gap-1">
                <Building2 className="size-3.5" /> {enquiry.company}
              </span>
            ) : null}
            {enquiry.deadline ? (
              <span className="inline-flex items-center gap-1 text-[#B45309]">
                <CalendarClock className="size-3.5" /> Needed by {formatDate(enquiry.deadline)}
              </span>
            ) : null}
          </div>
        </div>

        <div className="text-right">
          <p className="font-headline-md text-headline-md font-bold text-slate-900 tabular-nums">{enquiry.quantity} pcs</p>
          <p className="font-label-technical text-[9px] uppercase tracking-widest text-slate-500">
            {enquiry.productName ?? "mixed blanks"}
          </p>
        </div>
      </div>

      {enquiry.message ? (
        <p className="font-body-md text-body-md text-slate-600 leading-relaxed mb-space-sm whitespace-pre-line">
          {enquiry.message}
        </p>
      ) : null}

      {enquiry.artworkUrl ? (
        <a
          href={enquiry.artworkUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-1.5 mb-space-sm px-3 h-8 rounded-full bg-slate-900/[0.05] border border-slate-900/[0.1] font-label-md text-label-md text-slate-800 hover:bg-slate-900/[0.09] transition-all"
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
                  : "border-slate-900/[0.1] bg-slate-900/[0.03] text-slate-500 hover:text-slate-900 hover:border-slate-900/[0.1]",
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
