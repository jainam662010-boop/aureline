"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  User as UserIcon,
  MapPin,
  Palette,
  Package,
  Plus,
  Trash2,
  Pencil,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { updateProfile, changePassword, saveAddress, deleteAddress, type AddressFormData } from "@/actions/account";
import { deleteDesign } from "@/actions/design";
import { GarmentMockup, garmentTypeFromCategory } from "@/components/shared/garment-mockup";
import { EmptyState } from "@/components/ui/states";
import { cn, formatDate } from "@/lib/utils";

export interface AccountAddress {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

export interface AccountDesign {
  id: string;
  name: string;
  productId: string;
  productSlug: string;
  productName: string;
  thumbnailUrl: string | null;
  updatedAt: string;
}

type TabKey = "profile" | "addresses" | "designs" | "orders";

const TABS: { key: TabKey; label: string; icon: typeof UserIcon }[] = [
  { key: "profile", label: "Profile", icon: UserIcon },
  { key: "addresses", label: "Addresses", icon: MapPin },
  { key: "designs", label: "My designs", icon: Palette },
  { key: "orders", label: "Orders", icon: Package },
];

const profileSchema = z.object({
  name: z.string().min(2, "Enter your name.").max(80),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number.")
    .optional()
    .or(z.literal("")),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password."),
  newPassword: z
    .string()
    .min(8, "Use at least 8 characters.")
    .regex(/[A-Za-z]/, "Include at least one letter.")
    .regex(/[0-9]/, "Include at least one number."),
});

const addressSchema = z.object({
  label: z.string().min(1).max(30),
  fullName: z.string().min(2, "Enter the recipient's name.").max(80),
  phone: z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number."),
  line1: z.string().min(4, "Enter the address.").max(160),
  line2: z.string().max(160).optional().or(z.literal("")),
  city: z.string().min(2, "Enter the city.").max(60),
  state: z.string().min(2, "Enter the state.").max(60),
  pincode: z.string().regex(/^\d{6}$/, "Enter a valid 6-digit PIN code."),
  isDefault: z.boolean(),
});

export function AccountClient({
  initialTab,
  user,
  addresses,
  designs,
  orderCount,
}: {
  initialTab?: string;
  user: { name: string; email: string; phone: string; role: string };
  addresses: AccountAddress[];
  designs: AccountDesign[];
  orderCount: number;
}) {
  const router = useRouter();
  const [tab, setTab] = React.useState<TabKey>(
    TABS.some((t) => t.key === initialTab) ? (initialTab as TabKey) : "profile",
  );

  const switchTab = (key: TabKey) => {
    setTab(key);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", key);
    window.history.replaceState({}, "", url.toString());
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)] gap-space-md">
      <nav className="flex lg:flex-col gap-space-xs overflow-x-auto hide-scrollbar" aria-label="Account sections">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => switchTab(item.key)}
            aria-current={tab === item.key ? "page" : undefined}
            className={cn(
              "flex items-center gap-space-xs px-space-sm py-2.5 rounded-2xl font-label-lg text-label-lg whitespace-nowrap transition-all text-left",
              tab === item.key
                ? "bg-slate-900/[0.08] text-slate-900 border border-slate-900/[0.1]"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-900/[0.05] border border-transparent",
            )}
          >
            <item.icon className="size-4 flex-shrink-0" />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="min-w-0">
        {tab === "profile" ? <ProfileTab user={user} /> : null}
        {tab === "addresses" ? <AddressesTab addresses={addresses} /> : null}
        {tab === "designs" ? <DesignsTab designs={designs} /> : null}
        {tab === "orders" ? (
          <div className="glass-panel p-space-md flex items-center justify-between gap-space-sm">
            <div>
              <p className="font-label-lg text-label-lg text-slate-900">
                {orderCount} {orderCount === 1 ? "order" : "orders"} placed
              </p>
              <p className="font-body-sm text-body-sm text-slate-600">
                Track production status, download invoices or reorder.
              </p>
            </div>
            <Button variant="glass" size="md" onClick={() => router.push("/orders")}>
              View orders <ExternalLink className="size-4" />
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Profile                                                                     */
/* -------------------------------------------------------------------------- */

function ProfileTab({ user }: { user: { name: string; email: string; phone: string } }) {
  const {
    register: registerProfile,
    handleSubmit: submitProfile,
    formState: { errors: profileErrors, isSubmitting: profileSaving },
  } = useForm<{ name: string; phone: string }>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user.name, phone: user.phone },
  });

  const {
    register: registerPassword,
    handleSubmit: submitPassword,
    reset: resetPassword,
    formState: { errors: passwordErrors, isSubmitting: passwordSaving },
  } = useForm<{ currentPassword: string; newPassword: string }>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "" },
  });

  const onProfile = async (values: { name: string; phone: string }) => {
    const result = await updateProfile(values);
    if (result.ok) {
      toast.success("Profile updated.");
    } else {
      toast.error(result.error);
    }
  };

  const onPassword = async (values: { currentPassword: string; newPassword: string }) => {
    const result = await changePassword(values);
    if (result.ok) {
      toast.success("Password changed.");
      resetPassword({ currentPassword: "", newPassword: "" });
    } else {
      toast.error(result.error);
    }
  };

  return (
    <div className="flex flex-col gap-space-md">
      <section className="glass-panel p-space-md">
        <h2 className="font-headline-md text-headline-md font-bold text-slate-900 mb-space-sm">Profile details</h2>
        <form onSubmit={submitProfile(onProfile)} className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
          <div className="flex flex-col gap-space-xs">
            <Label htmlFor="profile-name">Name</Label>
            <Input id="profile-name" {...registerProfile("name")} />
            {profileErrors.name ? (
              <span className="font-body-sm text-body-sm text-[#BE123C]">{profileErrors.name.message}</span>
            ) : null}
          </div>
          <div className="flex flex-col gap-space-xs">
            <Label htmlFor="profile-email">Email (contact support to change)</Label>
            <Input id="profile-email" value={user.email} disabled className="opacity-60" />
          </div>
          <div className="flex flex-col gap-space-xs">
            <Label htmlFor="profile-phone">Mobile</Label>
            <Input id="profile-phone" inputMode="numeric" placeholder="9876543210" {...registerProfile("phone")} />
            {profileErrors.phone ? (
              <span className="font-body-sm text-body-sm text-[#BE123C]">{profileErrors.phone.message}</span>
            ) : null}
          </div>
          <div className="flex items-end">
            <Button type="submit" size="md" disabled={profileSaving} className="h-11 w-full sm:w-auto">
              {profileSaving ? <Loader2 className="size-4 animate-spin" /> : null}
              Save changes
            </Button>
          </div>
        </form>
      </section>

      <section className="glass-panel p-space-md">
        <h2 className="font-headline-md text-headline-md font-bold text-slate-900 mb-1">Change password</h2>
        <p className="font-body-sm text-body-sm text-slate-600 mb-space-sm">
          Minimum 8 characters with at least one letter and one number.
        </p>
        <form onSubmit={submitPassword(onPassword)} className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
          <div className="flex flex-col gap-space-xs">
            <Label htmlFor="current-password">Current password</Label>
            <Input id="current-password" type="password" autoComplete="current-password" {...registerPassword("currentPassword")} />
            {passwordErrors.currentPassword ? (
              <span className="font-body-sm text-body-sm text-[#BE123C]">{passwordErrors.currentPassword.message}</span>
            ) : null}
          </div>
          <div className="flex flex-col gap-space-xs">
            <Label htmlFor="new-password">New password</Label>
            <Input id="new-password" type="password" autoComplete="new-password" {...registerPassword("newPassword")} />
            {passwordErrors.newPassword ? (
              <span className="font-body-sm text-body-sm text-[#BE123C]">{passwordErrors.newPassword.message}</span>
            ) : null}
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" variant="glass" size="md" disabled={passwordSaving} className="h-11">
              {passwordSaving ? <Loader2 className="size-4 animate-spin" /> : null}
              Update password
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Addresses                                                                   */
/* -------------------------------------------------------------------------- */

function AddressesTab({ addresses }: { addresses: AccountAddress[] }) {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<AccountAddress | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema as never),
    defaultValues: {
      label: "Home",
      fullName: "",
      phone: "",
      line1: "",
      line2: "",
      city: "",
      state: "",
      pincode: "",
      isDefault: false,
    },
  });

  const openNew = () => {
    setEditing(null);
    reset({
      label: "Home",
      fullName: "",
      phone: "",
      line1: "",
      line2: "",
      city: "",
      state: "",
      pincode: "",
      isDefault: addresses.length === 0,
    });
    setDialogOpen(true);
  };

  const openEdit = (address: AccountAddress) => {
    setEditing(address);
    reset({ ...address, line2: address.line2 ?? "", isDefault: address.isDefault });
    setDialogOpen(true);
  };

  const onSubmit = async (values: AddressFormData) => {
    const result = await saveAddress({ ...values, id: editing?.id });
    if (result.ok) {
      toast.success(editing ? "Address updated." : "Address saved.");
      setDialogOpen(false);
      setValue("isDefault", false);
    } else {
      toast.error(result.error);
    }
  };

  const remove = async (id: string) => {
    setBusyId(id);
    const result = await deleteAddress(id);
    setBusyId(null);
    if (result.ok) {
      toast.success("Address removed.");
    } else {
      toast.error(result.error);
    }
  };

  return (
    <div className="flex flex-col gap-space-sm">
      <div className="flex items-center justify-between">
        <h2 className="font-headline-md text-headline-md font-bold text-slate-900">
          Saved addresses <span className="text-slate-500 font-normal">({addresses.length})</span>
        </h2>
        <Button variant="glass" size="sm" onClick={openNew}>
          <Plus className="size-4" /> Add address
        </Button>
      </div>

      {addresses.length === 0 ? (
        <EmptyState
          icon={<MapPin className="size-6" />}
          title="No saved addresses"
          description="Save one and checkout becomes a two-tap affair."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
          {addresses.map((address) => (
            <div key={address.id} className="glass-panel p-space-sm relative">
              <div className="flex items-center gap-space-xs mb-1">
                <span className="font-label-lg text-label-lg text-slate-900">{address.label}</span>
                {address.isDefault ? (
                  <span className="rounded-full bg-[#0891B2]/15 border border-[#0891B2]/40 px-2 py-0.5 font-label-technical text-[9px] uppercase tracking-widest text-[#0E7490]">
                    Default
                  </span>
                ) : null}
              </div>
              <p className="font-body-sm text-body-sm text-slate-600 leading-relaxed">
                {address.fullName} · {address.line1}
                {address.line2 ? `, ${address.line2}` : ""}
                <br />
                {address.city}, {address.state} {address.pincode}
                <br />
                {address.phone}
              </p>
              <div className="flex items-center gap-space-xs mt-space-sm">
                <button
                  type="button"
                  onClick={() => openEdit(address)}
                  className="inline-flex items-center gap-1 px-3 h-8 rounded-full bg-slate-900/[0.05] border border-slate-900/[0.1] font-label-md text-label-md text-slate-800 hover:bg-slate-900/[0.09] transition-all"
                >
                  <Pencil className="size-3.5" /> Edit
                </button>
                <button
                  type="button"
                  onClick={() => remove(address.id)}
                  disabled={busyId === address.id}
                  className="inline-flex items-center gap-1 px-3 h-8 rounded-full bg-slate-900/[0.04] border border-slate-900/[0.1] font-label-md text-label-md text-[#BE123C] hover:bg-[#E11D48]/30 transition-all disabled:opacity-50"
                >
                  <Trash2 className="size-3.5" /> Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit address" : "Add address"}</DialogTitle>
            <DialogDescription>Used for shipping and courier updates.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 gap-space-sm mt-space-xs">
            <div className="col-span-2 sm:col-span-1">
              <Label htmlFor="addr-label">Label</Label>
              <Input id="addr-label" placeholder="Home" {...register("label")} />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label htmlFor="addr-name">Recipient</Label>
              <Input id="addr-name" placeholder="Priya Sharma" {...register("fullName")} />
              {errors.fullName ? <span className="font-body-sm text-body-sm text-[#BE123C]">{errors.fullName.message}</span> : null}
            </div>
            <div className="col-span-2">
              <Label htmlFor="addr-phone">Mobile</Label>
              <Input id="addr-phone" inputMode="numeric" placeholder="9876543210" {...register("phone")} />
              {errors.phone ? <span className="font-body-sm text-body-sm text-[#BE123C]">{errors.phone.message}</span> : null}
            </div>
            <div className="col-span-2">
              <Label htmlFor="addr-line1">Address line 1</Label>
              <Input id="addr-line1" placeholder="Flat / House no., Street" {...register("line1")} />
              {errors.line1 ? <span className="font-body-sm text-body-sm text-[#BE123C]">{errors.line1.message}</span> : null}
            </div>
            <div className="col-span-2">
              <Label htmlFor="addr-line2">Address line 2 (optional)</Label>
              <Input id="addr-line2" placeholder="Landmark, Area" {...register("line2")} />
            </div>
            <div>
              <Label htmlFor="addr-city">City</Label>
              <Input id="addr-city" placeholder="Bengaluru" {...register("city")} />
              {errors.city ? <span className="font-body-sm text-body-sm text-[#BE123C]">{errors.city.message}</span> : null}
            </div>
            <div>
              <Label htmlFor="addr-state">State</Label>
              <Input id="addr-state" placeholder="Karnataka" {...register("state")} />
              {errors.state ? <span className="font-body-sm text-body-sm text-[#BE123C]">{errors.state.message}</span> : null}
            </div>
            <div>
              <Label htmlFor="addr-pincode">PIN code</Label>
              <Input id="addr-pincode" inputMode="numeric" placeholder="560001" {...register("pincode")} />
              {errors.pincode ? <span className="font-body-sm text-body-sm text-[#BE123C]">{errors.pincode.message}</span> : null}
            </div>
            <label className="flex items-center gap-space-xs self-end pb-2 cursor-pointer">
              <input type="checkbox" className="accent-[#2563EB] w-4 h-4" {...register("isDefault")} />
              <span className="font-body-sm text-body-sm text-slate-700">Set as default</span>
            </label>

            <DialogFooter className="col-span-2">
              <Button type="submit" size="md" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
                {editing ? "Save changes" : "Save address"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Designs                                                                     */
/* -------------------------------------------------------------------------- */

function DesignsTab({ designs }: { designs: AccountDesign[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const remove = async (id: string) => {
    setBusyId(id);
    const result = await deleteDesign(id);
    setBusyId(null);
    if (result.ok) {
      toast.success("Design deleted.");
    } else {
      toast.error(result.error);
    }
  };

  if (designs.length === 0) {
    return (
      <EmptyState
        icon={<Palette className="size-6" />}
        title="No saved designs yet"
        description="Anything you create in the studio and hit 'Save design' on shows up here — editable forever."
        action={
          <Link href="/products?intent=design" className="btn-gradient px-space-lg py-space-sm">
            Open the studio
          </Link>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-space-sm">
      <h2 className="font-headline-md text-headline-md font-bold text-slate-900">
        My designs <span className="text-slate-500 font-normal">({designs.length})</span>
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-space-sm">
        {designs.map((design) => (
          <article key={design.id} className="glass-panel p-space-sm flex flex-col">
            <Link
              href={`/design/${design.productId}?design=${design.id}`}
              className="rounded-2xl bg-slate-900/[0.02] overflow-hidden flex items-center justify-center h-40 group"
            >
              {design.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={design.thumbnailUrl}
                  alt={design.name}
                  className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
                  draggable={false}
                />
              ) : (
                <GarmentMockup type={garmentTypeFromCategory(design.productName.toLowerCase())} color="#EEF3FA" className="h-full w-auto" />
              )}
            </Link>

            <div className="mt-space-xs flex-1">
              <p className="font-label-lg text-label-lg text-slate-900 truncate">{design.name}</p>
              <p className="font-body-sm text-body-sm text-slate-500 truncate">{design.productName}</p>
              <p className="font-label-technical text-[9px] uppercase tracking-widest text-slate-400 mt-0.5">
                Updated {formatDate(design.updatedAt)}
              </p>
            </div>

            <div className="flex items-center gap-space-xs mt-space-sm">
              <Button size="sm" variant="glass" className="flex-1" onClick={() => router.push(`/design/${design.productId}?design=${design.id}`)}>
                <Pencil className="size-3.5" /> Edit
              </Button>
              <button
                type="button"
                onClick={() => remove(design.id)}
                disabled={busyId === design.id}
                aria-label={`Delete ${design.name}`}
                className="w-9 h-9 rounded-full flex items-center justify-center text-[#BE123C] hover:bg-[#E11D48]/35 transition-all disabled:opacity-40 flex-shrink-0"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </article>
        ))}
      </div>
      <Separator className="mt-space-xs" />
    </div>
  );
}
