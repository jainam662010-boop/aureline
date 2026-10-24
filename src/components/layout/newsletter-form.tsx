"use client";

import * as React from "react";
import { toast } from "sonner";
import { Loader2, ArrowRight } from "lucide-react";

/** Newsletter capture → POST /api/newsletter (rate-limited, Zod-validated). */
export function NewsletterForm() {
  const [email, setEmail] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      toast.error("That doesn't look like a valid email.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (json.ok) {
        toast.success("You're on the list — new drops and print tips, no spam.");
        setEmail("");
      } else {
        toast.error(json.error ?? "Could not subscribe. Please try again.");
      }
    } catch {
      toast.error("Network error — please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex items-center gap-space-xs w-full max-w-sm">
      <label htmlFor="newsletter-email" className="sr-only">
        Email address
      </label>
      <input
        id="newsletter-email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        className="flex-1 h-11 px-space-sm rounded-full bg-white/[0.05] border border-white/[0.12] text-body-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#FF3B30]"
      />
      <button
        type="submit"
        disabled={busy}
        aria-label="Subscribe"
        className="h-11 w-11 rounded-full bg-gradient-to-tr from-[#FF3B30] to-[#FF0D7B] flex items-center justify-center text-white hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 flex-shrink-0"
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
      </button>
    </form>
  );
}
