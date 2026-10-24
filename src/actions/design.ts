"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ok, fail, type ApiResponse } from "@/lib/response";
import { createEmptyDesign, type DesignDocument } from "@/lib/editor-types";

const layerSchema = z.object({
  id: z.string(),
  type: z.enum(["TEXT", "IMAGE", "CLIPART"]),
  x: z.number(),
  y: z.number(),
  width: z.number().positive().max(5000),
  height: z.number().positive().max(5000),
  angle: z.number(),
  opacity: z.number().min(0).max(1),
  text: z.string().max(500).optional(),
  fontFamily: z.string().max(80).optional(),
  fontSize: z.number().min(4).max(600).optional(),
  fontWeight: z.enum(["normal", "bold"]).optional(),
  fontStyle: z.enum(["normal", "italic"]).optional(),
  textAlign: z.enum(["left", "center", "right"]).optional(),
  letterSpacing: z.number().min(-20).max(100).optional(),
  lineHeight: z.number().min(0.5).max(4).optional(),
  fill: z.string().max(32).optional(),
  src: z.string().max(2_000_000).optional(),
  clipartKey: z.string().max(60).optional(),
  naturalWidth: z.number().optional(),
  naturalHeight: z.number().optional(),
});

const designStateSchema = z.object({
  FRONT: z.object({ layers: z.array(layerSchema).max(60) }),
  BACK: z.object({ layers: z.array(layerSchema).max(60) }),
});

const saveDesignSchema = z.object({
  designId: z.string().optional().nullable(),
  productId: z.string().min(1),
  name: z.string().min(1).max(80).default("Untitled design"),
  state: designStateSchema,
  thumbnailUrl: z.string().max(2_000_000).optional().nullable(),
  previewUrl: z.string().max(2_000_000).optional().nullable(),
  printReadyUrls: z.record(z.string().max(2_000_000)).optional().nullable(),
});

export interface SerializedDesign {
  id: string;
  name: string;
  productId: string;
  productSlug: string;
  productName: string;
  thumbnailUrl: string | null;
  state: DesignDocument;
  updatedAt: string;
}

export async function saveDesign(input: z.infer<typeof saveDesignSchema>): Promise<ApiResponse<{ id: string }>> {
  const session = await auth();
  if (!session?.user?.id) return fail("Sign in to save your designs.", "UNAUTHENTICATED");

  const parsed = saveDesignSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Invalid design data.", "VALIDATION", parsed.error.flatten().fieldErrors as Record<string, string[]>);
  }

  try {
    const { designId, productId, name, state, thumbnailUrl, previewUrl, printReadyUrls } = parsed.data;

    const product = await prisma.product.findFirst({ where: { id: productId, deletedAt: null } });
    if (!product) return fail("Product not found.", "NOT_FOUND");

    // Flatten layers into DesignLayer rows for admin/production tooling, while the
    // full document is frozen in `state` for fast rehydration.
    const layers = [...state.FRONT.layers.map((l) => ({ ...l, side: "FRONT" as const })),
      ...state.BACK.layers.map((l) => ({ ...l, side: "BACK" as const }))];

    if (designId) {
      const existing = await prisma.design.findFirst({ where: { id: designId, userId: session.user.id, deletedAt: null } });
      if (!existing) return fail("Design not found.", "NOT_FOUND");

      await prisma.$transaction([
        prisma.designLayer.deleteMany({ where: { designId: existing.id } }),
        prisma.design.update({
          where: { id: existing.id },
          data: {
            name,
            state: state as unknown as Prisma.InputJsonValue,
            thumbnailUrl: thumbnailUrl ?? existing.thumbnailUrl,
            previewUrl: previewUrl ?? existing.previewUrl,
            printReadyUrls: (printReadyUrls as Prisma.InputJsonValue | null) ?? undefined,
            lastEditedAt: new Date(),
            layers: {
              create: layers.map((l, index) => ({
                side: l.side,
                type: l.type,
                zIndex: index,
                x: l.x,
                y: l.y,
                width: l.width,
                height: l.height,
                angle: l.angle,
                opacity: l.opacity,
                text: l.text ?? null,
                fontFamily: l.fontFamily ?? null,
                fontSize: l.fontSize ?? null,
                fill: l.fill ?? null,
                imageUrl: l.type === "IMAGE" ? (l.src ?? null) : null,
                clipartKey: l.clipartKey ?? null,
              })),
            },
          },
        }),
      ]);

      revalidatePath("/account");
      return ok({ id: existing.id });
    }

    const created = await prisma.design.create({
      data: {
        userId: session.user.id,
        productId,
        name,
        state: state as unknown as Prisma.InputJsonValue,
        thumbnailUrl: thumbnailUrl ?? null,
        previewUrl: previewUrl ?? null,
        printReadyUrls: (printReadyUrls as Prisma.InputJsonValue | null) ?? undefined,
        layers: {
          create: layers.map((l, index) => ({
            side: l.side,
            type: l.type,
            zIndex: index,
            x: l.x,
            y: l.y,
            width: l.width,
            height: l.height,
            angle: l.angle,
            opacity: l.opacity,
            text: l.text ?? null,
            fontFamily: l.fontFamily ?? null,
            fontSize: l.fontSize ?? null,
            fill: l.fill ?? null,
            imageUrl: l.type === "IMAGE" ? (l.src ?? null) : null,
            clipartKey: l.clipartKey ?? null,
          })),
        },
      },
    });

    revalidatePath("/account");
    return ok({ id: created.id });
  } catch (error) {
    console.error("[design] saveDesign", error);
    return fail("Could not save your design.");
  }
}

export async function listDesigns(): Promise<ApiResponse<SerializedDesign[]>> {
  const session = await auth();
  if (!session?.user?.id) return ok([]);

  try {
    const designs = await prisma.design.findMany({
      where: { userId: session.user.id, deletedAt: null },
      include: { product: { select: { slug: true, name: true } } },
      orderBy: { updatedAt: "desc" },
      take: 60,
    });

    return ok(
      designs.map((d) => ({
        id: d.id,
        name: d.name,
        productId: d.productId,
        productSlug: d.product.slug,
        productName: d.product.name,
        thumbnailUrl: d.thumbnailUrl,
        state: (d.state as unknown as DesignDocument) ?? createEmptyDesign(),
        updatedAt: d.updatedAt.toISOString(),
      })),
    );
  } catch {
    return fail("Could not load saved designs.");
  }
}

export async function getDesign(designId: string): Promise<ApiResponse<SerializedDesign | null>> {
  const session = await auth();
  if (!session?.user?.id) return fail("Sign in to open saved designs.", "UNAUTHENTICATED");

  try {
    const design = await prisma.design.findFirst({
      where: { id: designId, userId: session.user.id, deletedAt: null },
      include: { product: { select: { slug: true, name: true } } },
    });
    if (!design) return fail("Design not found.", "NOT_FOUND");

    return ok({
      id: design.id,
      name: design.name,
      productId: design.productId,
      productSlug: design.product.slug,
      productName: design.product.name,
      thumbnailUrl: design.thumbnailUrl,
      state: (design.state as unknown as DesignDocument) ?? createEmptyDesign(),
      updatedAt: design.updatedAt.toISOString(),
    });
  } catch {
    return fail("Could not load design.");
  }
}

export async function deleteDesign(designId: string): Promise<ApiResponse<{ deleted: boolean }>> {
  const session = await auth();
  if (!session?.user?.id) return fail("Sign in first.", "UNAUTHENTICATED");

  try {
    const design = await prisma.design.findFirst({ where: { id: designId, userId: session.user.id, deletedAt: null } });
    if (!design) return fail("Design not found.", "NOT_FOUND");
    await prisma.design.update({ where: { id: designId }, data: { deletedAt: new Date() } });
    revalidatePath("/account");
    return ok({ deleted: true });
  } catch {
    return fail("Could not delete design.");
  }
}
