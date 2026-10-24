"use client";

import * as React from "react";
import { Stage, Layer as KLayer, Group, Text as KText, Image as KImage, Rect, Line, Transformer, Path as KPath } from "react-konva";
import type Konva from "konva";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import {
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Save,
  ShoppingCart,
  ArrowLeft,
  AlertTriangle,
  Check,
  SlidersHorizontal,
  PanelRight,
  X,
} from "lucide-react";
import { GarmentMockup } from "@/components/shared/garment-mockup";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { LeftPanel, PropertiesPanel, type LeftTab } from "@/components/editor/editor-panels";
import { useImages } from "@/components/editor/use-image";
import {
  PX_PER_INCH,
  EXPORT_SCALE,
  canvasSize,
  clampLayer,
  cloneDoc,
  createTextLayer,
  createImageLayer,
  createClipartLayer,
  duplicateLayer,
  layerDpi,
  type EditorProduct,
  type PlacementInfo,
} from "@/components/editor/editor-utils";
import { createEmptyDesign, type DesignDocument, type DesignLayerState } from "@/lib/editor-types";
import { designPrintArea, resolvePrintCost, type PrintPricing } from "@/lib/print-area";
import { EDITOR_FONT_FAMILIES, CLIPART } from "@/lib/constants";
import { saveDesign } from "@/actions/design";
import { addToCart } from "@/actions/cart";
import { uploadArtwork } from "@/actions/upload";
import { cn, formatINR } from "@/lib/utils";

const SNAP = 6;
const MAX_HISTORY = 60;

/** The studio renders front + back; sleeves stay in the doc for future use. */
type StudioSide = "FRONT" | "BACK";
const STUDIO_SIDES: StudioSide[] = ["FRONT", "BACK"];

interface DesignStudioProps {
  product: EditorProduct;
  initialDoc: DesignDocument | null;
  initialDesignId: string | null;
  isLoggedIn: boolean;
  /** ₹/in² print pricing from Admin → Settings. */
  printPricing: PrintPricing;
}

export function DesignStudio({ product, initialDoc, initialDesignId, isLoggedIn, printPricing }: DesignStudioProps) {
  const router = useRouter();
  const stageRef = React.useRef<Konva.Stage>(null);
  const transformerRef = React.useRef<Konva.Transformer>(null);
  const guideRectRef = React.useRef<Konva.Rect>(null);
  const groupRefs = React.useRef<Record<string, Konva.Group | null>>({});
  const nodeRefs = React.useRef<Record<string, Konva.Node | null>>({});
  const fileRef = React.useRef<HTMLInputElement>(null);
  const replaceRef = React.useRef<HTMLInputElement>(null);

  const initialSide: StudioSide = (initialDoc && (initialDoc.BACK?.layers?.length ?? 0) > 0 && (initialDoc.FRONT?.layers?.length ?? 0) === 0 ? "BACK" : "FRONT");

  const [doc, setDoc] = React.useState<DesignDocument>(() => initialDoc ?? createEmptyDesign());
  const [activeSide, setActiveSide] = React.useState<StudioSide>(initialSide);
  const [placementKeys, setPlacementKeys] = React.useState<Record<StudioSide, string>>(() => {
    const front = product.placements.find((p) => p.side === "FRONT") ?? product.placements[0]!;
    const back = product.placements.find((p) => p.side === "BACK") ?? front;
    return { FRONT: front.key, BACK: back.key };
  });
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [zoom, setZoom] = React.useState(1);
  const [guides, setGuides] = React.useState<{ v: boolean; h: boolean }>({ v: false, h: false });
  const [tab, setTab] = React.useState<LeftTab>("tools");
  const [uploading, setUploading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [previews, setPreviews] = React.useState<Record<StudioSide, string | null>>({ FRONT: null, BACK: null });
  const [cartOpen, setCartOpen] = React.useState(false);
  /* Phone layout: left (tools) and right (preview) panels become slide-over drawers. */
  const [leftOpen, setLeftOpen] = React.useState(false);
  const [rightOpen, setRightOpen] = React.useState(false);
  const [designId, setDesignId] = React.useState<string | null>(initialDesignId);

  const [colorHex, setColorHex] = React.useState(product.colors[0]?.hex ?? "#111111");
  const [colorName, setColorName] = React.useState(product.colors[0]?.name ?? "Black");
  const [cartSize, setCartSize] = React.useState<string | null>(null);
  const [cartQty, setCartQty] = React.useState(1);
  const [adding, setAdding] = React.useState(false);

  // History
  const historyRef = React.useRef<DesignDocument[]>([cloneDoc(doc)]);
  const hIndexRef = React.useRef(0);
  const [historyVersion, setHistoryVersion] = React.useState(0);

  const sidePlacements = React.useMemo(
    () => product.placements.filter((p) => p.side === activeSide),
    [product.placements, activeSide],
  );
  const activePlacement: PlacementInfo =
    sidePlacements.find((p) => p.key === placementKeys[activeSide]) ?? sidePlacements[0] ?? product.placements[0]!;
  const canvas = React.useMemo(() => canvasSize(activePlacement), [activePlacement]);

  /** Square inches the artwork actually covers on the active side. */
  const printArea = React.useMemo(
    () => designPrintArea(doc, activeSide, activePlacement),
    [doc, activeSide, activePlacement],
  );

  const layers = doc[activeSide]?.layers ?? [];
  const selected = layers.find((l) => l.id === selectedId) ?? null;

  const layersForSide = (side: StudioSide) => doc[side]?.layers ?? [];

  const imageSrcs = React.useMemo(() => {
    const map: Record<string, string | undefined> = {};
    [...layersForSide("FRONT"), ...layersForSide("BACK")].forEach((l) => {
      if (l.type === "IMAGE" && l.src) map[l.id] = l.src;
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc]);

  const images = useImages(imageSrcs);

  /* Fonts ------------------------------------------------------------------ */
  React.useEffect(() => {
    const id = "aureline-editor-fonts";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${EDITOR_FONT_FAMILIES}&display=swap`;
    document.head.appendChild(link);
  }, []);

  /* Commit / history -------------------------------------------------------- */
  const commit = React.useCallback((next: DesignDocument, snapshot = true) => {
    setDoc(next);
    if (snapshot) {
      const history = historyRef.current.slice(0, hIndexRef.current + 1);
      history.push(cloneDoc(next));
      historyRef.current = history.slice(-MAX_HISTORY);
      hIndexRef.current = historyRef.current.length - 1;
      setHistoryVersion((v) => v + 1);
    }
  }, []);

  const undo = React.useCallback(() => {
    if (hIndexRef.current <= 0) return;
    hIndexRef.current -= 1;
    const snapshot = historyRef.current[hIndexRef.current]!;
    setDoc(cloneDoc(snapshot));
    setHistoryVersion((v) => v + 1);
  }, []);

  const redo = React.useCallback(() => {
    if (hIndexRef.current >= historyRef.current.length - 1) return;
    hIndexRef.current += 1;
    const snapshot = historyRef.current[hIndexRef.current]!;
    setDoc(cloneDoc(snapshot));
    setHistoryVersion((v) => v + 1);
  }, []);

  const canUndo = hIndexRef.current > 0;
  const canRedo = hIndexRef.current < historyRef.current.length - 1;

  const updateLayer = React.useCallback(
    (id: string, patch: Partial<DesignLayerState>, snapshot = false) => {
      setDoc((prev) => {
        const next = cloneDoc(prev);
        const list = next[activeSide].layers;
        const idx = list.findIndex((l) => l.id === id);
        if (idx === -1) return prev;
        list[idx] = { ...list[idx]!, ...patch };
        if (snapshot) {
          const history = historyRef.current.slice(0, hIndexRef.current + 1);
          history.push(cloneDoc(next));
          historyRef.current = history.slice(-MAX_HISTORY);
          hIndexRef.current = historyRef.current.length - 1;
          setHistoryVersion((v) => v + 1);
        }
        return next;
      });
    },
    [activeSide],
  );

  /* Selection + transformer -------------------------------------------------- */
  React.useEffect(() => {
    const tr = transformerRef.current;
    if (!tr) return;
    if (!selectedId) {
      tr.nodes([]);
    } else {
      const node = nodeRefs.current[selectedId];
      tr.nodes(node ? [node] : []);
    }
    tr.getLayer()?.batchDraw();
  }, [selectedId, activeSide, historyVersion]);

  /* Layer interaction handlers ------------------------------------------------ */
  const clampNode = (node: Konva.Node, layer: DesignLayerState) => {
    const halfW = layer.width / 2;
    const halfH = layer.height / 2;
    const x = Math.min(Math.max(node.x(), halfW), canvas.width - halfW);
    const y = Math.min(Math.max(node.y(), halfH), canvas.height - halfH);
    if (x !== node.x() || y !== node.y()) node.position({ x, y });
  };

  const handleDragMove = (e: Konva.KonvaEventObject<DragEvent>, layer: DesignLayerState) => {
    const node = e.target;
    clampNode(node, layer);

    const cx = node.x();
    const cy = node.y();
    const snapV = Math.abs(cx - canvas.width / 2) < SNAP;
    const snapH = Math.abs(cy - canvas.height / 2) < SNAP;
    if (snapV) node.x(canvas.width / 2);
    if (snapH) node.y(canvas.height / 2);
    if (snapV !== guides.v || snapH !== guides.h) setGuides({ v: snapV, h: snapH });
  };

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>, layer: DesignLayerState) => {
    const node = e.target;
    setGuides({ v: false, h: false });
    updateLayer(layer.id, { x: node.x(), y: node.y() }, true);
  };

  const handleTransformEnd = (e: Konva.KonvaEventObject<Event>, layer: DesignLayerState) => {
    const node = e.target as Konva.Group;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    node.scaleX(1);
    node.scaleY(1);

    if (layer.type === "TEXT") {
      const factor = (scaleX + scaleY) / 2;
      const fontSize = Math.min(400, Math.max(6, Math.round((layer.fontSize ?? 32) * factor)));
      const width = Math.min(canvas.width, Math.max(20, layer.width * scaleX));
      const patch = clampLayer({ ...layer, fontSize, width, height: fontSize * 1.4, angle: node.rotation() }, canvas);
      updateLayer(layer.id, patch, true);
    } else if (layer.type === "CLIPART") {
      const width = Math.min(canvas.width, Math.max(16, 100 * node.scaleX()));
      const height = Math.min(canvas.height, Math.max(16, 100 * node.scaleY()));
      const patch = clampLayer({ ...layer, width, height, angle: node.rotation() }, canvas);
      updateLayer(layer.id, patch, true);
    } else {
      const width = Math.min(canvas.width * 1.5, Math.max(16, layer.width * scaleX));
      const height = Math.min(canvas.height * 1.5, Math.max(16, layer.height * scaleY));
      const patch = clampLayer({ ...layer, width, height, angle: node.rotation() }, canvas);
      updateLayer(layer.id, patch, true);
    }
    node.position({ x: layer.x, y: layer.y });
  };

  /* Export --------------------------------------------------------------------- */
  const exportSide = React.useCallback(
    (side: StudioSide, pixelRatio: number): string | null => {
      const stage = stageRef.current;
      if (!stage) return null;
      const target = stageSizeFor(side);
      if ((doc[side]?.layers?.length ?? 0) === 0) return null;

      const prevScale = { x: stage.scaleX(), y: stage.scaleY() };
      const prevPos = stage.position();
      const prevSize = { width: stage.width(), height: stage.height() };

      stage.scale({ x: 1, y: 1 });
      stage.position({ x: 0, y: 0 });
      stage.size({ width: target.width, height: target.height });

      const hidden: Konva.Node[] = [];
      Object.entries(groupRefs.current).forEach(([key, group]) => {
        if (group && key !== side) {
          hidden.push(group);
          group.visible(false);
        }
      });
      if (guideRectRef.current) {
        hidden.push(guideRectRef.current);
        guideRectRef.current.visible(false);
      }
      const tr = transformerRef.current;
      if (tr) {
        hidden.push(tr);
        tr.visible(false);
      }
      stage.getLayers().forEach((layer) => layer.draw());

      let url: string | null = null;
      try {
        url = stage.toDataURL({
          pixelRatio,
          x: 0,
          y: 0,
          width: target.width,
          height: target.height,
        });
      } catch (error) {
        console.error("[editor] export failed", error);
      }

      hidden.forEach((n) => n.visible(true));
      stage.scale(prevScale);
      stage.position(prevPos);
      stage.size(prevSize);
      stage.getLayers().forEach((layer) => layer.draw());

      return url;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [doc],
  );

  function stageSizeFor(side: StudioSide) {
    const placement =
      product.placements.find((p) => p.key === placementKeys[side] && p.side === side) ??
      product.placements.find((p) => p.side === side) ??
      product.placements[0]!;
    return canvasSize(placement);
  }

  /* Live preview thumbnail ------------------------------------------------------- */
  const previewTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  React.useEffect(() => {
    if (previewTimer.current) clearTimeout(previewTimer.current);
    previewTimer.current = setTimeout(() => {
      // 2× the editor resolution keeps the panel preview crisp on retina
      // displays without paying the full 300-DPI export cost.
      const url = exportSide(activeSide, 2);
      setPreviews((prev) => (prev[activeSide] === url ? prev : { ...prev, [activeSide]: url }));
    }, 250);
    return () => {
      if (previewTimer.current) clearTimeout(previewTimer.current);
    };
  }, [doc, activeSide, exportSide]);

  /* Tools --------------------------------------------------------------------- */
  const addText = () => {
    const layer = clampLayer(createTextLayer(canvas), canvas);
    commit({ ...cloneDoc(doc), [activeSide]: { layers: [...layers, layer] } });
    setSelectedId(layer.id);
    setTab("layers");
  };

  const addClipart = (key: string) => {
    const layer = clampLayer(createClipartLayer(canvas, key), canvas);
    commit({ ...cloneDoc(doc), [activeSide]: { layers: [...layers, layer] } });
    setSelectedId(layer.id);
    setTab("layers");
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const result = await uploadArtwork(file);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      const { url, width, height } = result.data;
      const layer = clampLayer(
        createImageLayer(canvas, url, width ?? 800, height ?? 800),
        canvas,
      );
      commit({ ...cloneDoc(doc), [activeSide]: { layers: [...layers, layer] } });
      setSelectedId(layer.id);
      setTab("layers");
      const dpi = layerDpi(layer);
      if (dpi !== null && dpi < 150) {
        toast.warning(`Heads up: this artwork is ${dpi} DPI at print size. 300 DPI looks best.`, { duration: 5000 });
      } else {
        toast.success("Artwork added to canvas");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const reorder = (id: string, dir: -1 | 1) => {
    const list = [...layers];
    const idx = list.findIndex((l) => l.id === id);
    const target = idx + dir;
    if (idx === -1 || target < 0 || target >= list.length) return;
    [list[idx], list[target]] = [list[target]!, list[idx]!];
    commit({ ...cloneDoc(doc), [activeSide]: { layers: list } });
  };

  const duplicate = (id: string) => {
    const layer = layers.find((l) => l.id === id);
    if (!layer) return;
    const copy = clampLayer(duplicateLayer(layer, canvas), canvas);
    commit({ ...cloneDoc(doc), [activeSide]: { layers: [...layers, copy] } });
    setSelectedId(copy.id);
  };

  const removeLayer = (id: string) => {
    commit({ ...cloneDoc(doc), [activeSide]: { layers: layers.filter((l) => l.id !== id) } });
    if (selectedId === id) setSelectedId(null);
  };

  /* Keyboard ------------------------------------------------------------------ */
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;

      const meta = e.ctrlKey || e.metaKey;
      if (meta && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (meta && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
        return;
      }
      if (meta && e.key.toLowerCase() === "d" && selectedId) {
        e.preventDefault();
        duplicate(selectedId);
        return;
      }
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        e.preventDefault();
        removeLayer(selectedId);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  /* Zoom --------------------------------------------------------------------- */
  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    if (!e.evt.ctrlKey && !e.evt.metaKey) return;
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const oldZoom = zoom;
    const dir = e.evt.deltaY > 0 ? -1 : 1;
    const newZoom = Math.min(4, Math.max(0.25, oldZoom * (dir > 0 ? 1.12 : 1 / 1.12)));
    const contentX = (pointer.x - stage.position().x) / oldZoom;
    const contentY = (pointer.y - stage.position().y) / oldZoom;
    stage.position({ x: pointer.x - contentX * newZoom, y: pointer.y - contentY * newZoom });
    setZoom(newZoom);
  };

  /* Save / add to cart ------------------------------------------------------------ */
  const handleSave = async () => {
    if (!isLoggedIn) {
      toast.error("Sign in to save designs to your account", {
        action: { label: "Sign in", onClick: () => router.push("/login?callbackUrl=/design/" + product.id) },
      });
      return;
    }
    const total = layersForSide("FRONT").length + layersForSide("BACK").length;
    if (total === 0) {
      toast.error("Add some artwork before saving");
      return;
    }

    setSaving(true);
    try {
      const thumb =
        previews[activeSide] ?? exportSide(activeSide, 1);
      const result = await saveDesign({
        designId,
        productId: product.id,
        name: `${product.name} design`,
        state: doc,
        thumbnailUrl: thumb,
      });
      if (result.ok) {
        setDesignId(result.data.id);
        toast.success("Design saved to your account");
      } else {
        toast.error(result.error);
      }
    } finally {
      setSaving(false);
    }
  };

  const sizesForColor = product.variants.filter((v) => v.colorHex === colorHex);
  const selectedVariant = sizesForColor.find((v) => v.size === cartSize) ?? null;
  const fullPlacementArea = activePlacement.widthIn * activePlacement.heightIn;
  const billedAreaSqIn = printArea?.areaSqIn ?? fullPlacementArea;
  const printCost = resolvePrintCost({
    baseCost: activePlacement.baseCost,
    surcharge: activePlacement.surcharge,
    areaSqIn: billedAreaSqIn,
    pricing: printPricing,
  });
  const unitPrice =
    product.basePrice +
    (selectedVariant?.priceDelta ?? 0) +
    printCost;

  const handleAddToCart = async () => {
    if (!selectedVariant) {
      toast.error("Choose a size first");
      return;
    }
    const total = layersForSide("FRONT").length + layersForSide("BACK").length;
    if (total === 0) {
      toast.error("Your design is empty — add text or artwork first");
      return;
    }

    setAdding(true);
    try {
      // Save the design first so it can be edited later from the cart/account.
      let savedId = designId;
      const thumb = previews.FRONT ?? previews.BACK ?? exportSide(activeSide, 1);
      if (isLoggedIn) {
        const saved = await saveDesign({
          designId,
          productId: product.id,
          name: `${product.name} design`,
          state: doc,
          thumbnailUrl: thumb,
        });
        if (saved.ok) savedId = saved.data.id;
      }

      // Print-ready exports for production (only sides with content)
      const printReady: Record<string, string> = {};
      STUDIO_SIDES.forEach((side) => {
        const url = exportSide(side, EXPORT_SCALE);
        if (url) printReady[side] = url;
      });

      const result = await addToCart({
        productId: product.id,
        variantId: selectedVariant.id,
        placementKey: activePlacement.key,
        side: activeSide,
        quantity: cartQty,
        designId: savedId,
        designJson: doc,
        thumbnailUrl: thumb,
      });

      if (result.ok) {
        setCartOpen(false);
        toast.success("Design added to cart", {
          action: { label: "View cart", onClick: () => router.push("/cart") },
        });
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add to cart");
    } finally {
      setAdding(false);
    }
  };

  /* Render helpers ----------------------------------------------------------------- */
  const renderLayer = (layer: DesignLayerState) => {
    const common = {
      id: layer.id,
      ref: (node: Konva.Node | null) => {
        nodeRefs.current[layer.id] = node;
      },
      x: layer.x,
      y: layer.y,
      rotation: layer.angle,
      opacity: layer.opacity,
      draggable: true,
      onPointerDown: () => setSelectedId(layer.id),
      onDragMove: (e: Konva.KonvaEventObject<DragEvent>) => handleDragMove(e, layer),
      onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => handleDragEnd(e, layer),
      onTransformEnd: (e: Konva.KonvaEventObject<Event>) => handleTransformEnd(e, layer),
    };

    if (layer.type === "TEXT") {
      const fontStyle =
        `${layer.fontWeight === "bold" ? "bold" : "normal"}${layer.fontStyle === "italic" ? " italic" : ""}`.trim();
      return (
        <KText
          key={layer.id}
          {...common}
          text={layer.text}
          fontFamily={layer.fontFamily}
          fontSize={layer.fontSize}
          fontStyle={fontStyle}
          align={layer.textAlign}
          letterSpacing={layer.letterSpacing}
          lineHeight={layer.lineHeight}
          fill={layer.fill}
          width={layer.width}
          offsetX={layer.width / 2}
          offsetY={(layer.height ?? 40) / 2}
          wrap="word"
        />
      );
    }

    if (layer.type === "IMAGE") {
      const img = images[layer.id];
      if (!img) return null;
      return (
        <KImage
          key={layer.id}
          {...common}
          image={img}
          width={layer.width}
          height={layer.height}
          offsetX={layer.width / 2}
          offsetY={layer.height / 2}
        />
      );
    }

    const clip = CLIPART.find((c) => c.key === layer.clipartKey);
    if (!clip) return null;
    return (
      <KPath
        key={layer.id}
        {...common}
        data={clip.path}
        fill={layer.fill ?? "#FF3B30"}
        fillRule={clip.fillRule ?? "nonzero"}
        scaleX={layer.width / 100}
        scaleY={layer.height / 100}
        offsetX={50}
        offsetY={50}
      />
    );
  };

  const totalLayers = layersForSide("FRONT").length + layersForSide("BACK").length;

  return (
    <div className="h-[calc(100vh-0px)] flex flex-col bg-[#08080a]">
      {/* Top bar */}
      <header className="h-16 flex-shrink-0 flex items-center justify-between gap-space-sm px-space-md border-b border-white/[0.08] bg-[#0a0a0d]/80 backdrop-blur-xl">
        <div className="flex items-center gap-space-sm min-w-0">
          <Link
            href={`/products/${product.slug}`}
            className="w-9 h-9 rounded-full bg-white/[0.05] border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/[0.1] transition-all"
            aria-label="Back to product"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div className="min-w-0">
            <p className="font-label-lg text-label-lg text-white truncate">{product.name}</p>
            <p className="font-label-technical text-[9px] uppercase tracking-widest text-white/40 truncate">
              {activePlacement.label} · {activePlacement.widthIn}&quot; × {activePlacement.heightIn}&quot; · {canvas.width}×
              {canvas.height}px @ {PX_PER_INCH}ppi
            </p>
          </div>
        </div>

        <div className="flex items-center gap-space-xs">
          {/* Phone: drawer toggles (panels are slide-overs below lg) */}
          <button
            type="button"
            onClick={() => {
              setRightOpen(false);
              setLeftOpen((v) => !v);
            }}
            aria-expanded={leftOpen}
            aria-label={leftOpen ? "Close tools panel" : "Open tools panel"}
            className="lg:hidden w-9 h-9 rounded-full bg-white/[0.05] border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/[0.1] transition-all"
          >
            {leftOpen ? <X className="size-4" /> : <SlidersHorizontal className="size-4" />}
          </button>

          {/* Side switch */}
          <div className="flex items-center rounded-full bg-white/[0.05] border border-white/10 p-0.5">
            {STUDIO_SIDES.map((side) => (
              <button
                key={side}
                type="button"
                onClick={() => setActiveSide(side)}
                aria-pressed={activeSide === side}
                className={cn(
                  "relative px-3 sm:px-4 h-9 rounded-full font-label-md text-label-md transition-all",
                  activeSide === side ? "bg-white/[0.14] text-white" : "text-white/50 hover:text-white",
                )}
              >
                {side}
                {(doc[side]?.layers?.length ?? 0) > 0 ? (
                  <span className="absolute top-1 right-1.5 w-1.5 h-1.5 rounded-full bg-[#FF0D7B]" />
                ) : null}
              </button>
            ))}
          </div>

          {/* Undo/redo stay available on phones; zoom group is desktop-only */}
          <div className="flex items-center rounded-full bg-white/[0.05] border border-white/10 p-0.5">
            <BarBtn label="Undo" disabled={!canUndo} onClick={undo}><Undo2 className="size-4" /></BarBtn>
            <BarBtn label="Redo" disabled={!canRedo} onClick={redo}><Redo2 className="size-4" /></BarBtn>
            <span className="hidden sm:inline w-px h-5 bg-white/10" />
            <span className="hidden sm:flex items-center">
              <BarBtn label="Zoom out" onClick={() => setZoom((z) => Math.max(0.25, z / 1.15))}><ZoomOut className="size-4" /></BarBtn>
              <span className="px-1 font-label-technical text-[10px] text-white/60 tabular-nums w-10 text-center">
                {Math.round(zoom * 100)}%
              </span>
              <BarBtn label="Zoom in" onClick={() => setZoom((z) => Math.min(4, z * 1.15))}><ZoomIn className="size-4" /></BarBtn>
              <BarBtn label="Reset view" onClick={() => setZoom(1)}><Maximize2 className="size-4" /></BarBtn>
            </span>
          </div>

          <Button variant="glass" size="sm" onClick={handleSave} disabled={saving || totalLayers === 0} className="max-sm:px-3">
            <Save className="size-4" /> <span className="hidden sm:inline">{saving ? "Saving…" : "Save design"}</span>
          </Button>
          <Button size="sm" onClick={() => setCartOpen(true)} disabled={totalLayers === 0} className="max-sm:px-3">
            <ShoppingCart className="size-4" /> <span className="hidden sm:inline">Add to cart</span>
          </Button>

          <button
            type="button"
            onClick={() => {
              setLeftOpen(false);
              setRightOpen((v) => !v);
            }}
            aria-expanded={rightOpen}
            aria-label={rightOpen ? "Close preview panel" : "Open preview panel"}
            className="lg:hidden w-9 h-9 rounded-full bg-white/[0.05] border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/[0.1] transition-all"
          >
            {rightOpen ? <X className="size-4" /> : <PanelRight className="size-4" />}
          </button>
        </div>
      </header>

      <div className="flex-1 flex min-h-0">
        {/* Left panel: inline on desktop, drawer on phones */}
        <LeftPanel
          tab={tab}
          onTab={setTab}
          onAddText={addText}
          onUploadImage={handleUpload}
          onAddClipart={addClipart}
          uploading={uploading}
          layers={layers}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onReorder={reorder}
          onDuplicate={duplicate}
          onDelete={removeLayer}
          side={activeSide}
          placements={sidePlacements}
          activePlacementKey={activePlacement.key}
          onPlacementChange={(key) => setPlacementKeys((prev) => ({ ...prev, [activeSide]: key }))}
          className={leftOpen ? "max-lg:translate-x-0" : "max-lg:-translate-x-[110%]"}
        />

        {/* Canvas */}
        <main
          className="flex-1 relative overflow-hidden flex items-center justify-center"
          style={{
            background:
              "radial-gradient(circle at 30% 20%, rgba(128,38,242,0.08), transparent 45%), radial-gradient(circle at 80% 80%, rgba(255,13,123,0.08), transparent 45%), #0b0b0e",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedId(null);
          }}
        >
          <div className="relative shadow-[0_24px_80px_rgba(0,0,0,0.6)] rounded-lg overflow-hidden">
            <Stage
              ref={stageRef}
              width={Math.max(200, canvas.width * zoom)}
              height={Math.max(200, canvas.height * zoom)}
              scaleX={zoom}
              scaleY={zoom}
              draggable
              onDragStart={() => setSelectedId(null)}
              onWheel={handleWheel}
              onMouseDown={(e) => {
                if (e.target === e.target.getStage()) setSelectedId(null);
              }}
            >
              <KLayer>
                <Rect
                  ref={guideRectRef}
                  width={canvas.width}
                  height={canvas.height}
                  fill="rgba(255,255,255,0.03)"
                  stroke="#FF0D7B"
                  strokeWidth={1}
                  dash={[6, 4]}
                  listening={false}
                />
                {STUDIO_SIDES.map((side) => (
                  <Group
                    key={side}
                    ref={(node) => {
                      groupRefs.current[side] = node;
                    }}
                    visible={side === activeSide}
                    listening={side === activeSide}
                  >
                    {layersForSide(side).map(renderLayer)}
                  </Group>
                ))}

                {guides.v ? (
                  <Line
                    points={[canvas.width / 2, -20, canvas.width / 2, canvas.height + 20]}
                    stroke="#00E0F2"
                    strokeWidth={1}
                    dash={[4, 4]}
                    listening={false}
                  />
                ) : null}
                {guides.h ? (
                  <Line
                    points={[-20, canvas.height / 2, canvas.width + 20, canvas.height / 2]}
                    stroke="#00E0F2"
                    strokeWidth={1}
                    dash={[4, 4]}
                    listening={false}
                  />
                ) : null}

                <Transformer
                  ref={transformerRef}
                  rotateEnabled
                  keepRatio={selected?.type !== "TEXT"}
                  enabledAnchors={[
                    "top-left",
                    "top-right",
                    "bottom-left",
                    "bottom-right",
                    "middle-left",
                    "middle-right",
                    "top-center",
                    "bottom-center",
                  ]}
                  anchorSize={10}
                  anchorCornerRadius={5}
                  anchorFill="#FF0D7B"
                  anchorStroke="#ffffff"
                  borderStroke="#FF0D7B"
                  borderDash={[4, 4]}
                  rotateAnchorOffset={26}
                  boundBoxFunc={(oldBox, newBox) => {
                    if (newBox.width < 12 || newBox.height < 12) return oldBox;
                    return newBox;
                  }}
                />
              </KLayer>
            </Stage>
          </div>

          {/* Canvas HUD */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-space-xs backdrop-blur-xl bg-black/60 border border-white/10 px-space-md py-space-xs rounded-full">
            <span className="font-label-technical text-label-technical text-[#FF0D7B] font-bold">PRINT AREA:</span>
            <span className="font-label-technical text-label-technical text-white uppercase tracking-widest">
              {activePlacement.label} · {activePlacement.widthIn}&quot; × {activePlacement.heightIn}&quot;
              {printArea ? ` · used ${printArea.widthIn}″ × ${printArea.heightIn}″` : ""}
            </span>
          </div>
        </main>

        {/* Right panel: inline on desktop, drawer on phones */}
        <aside
          className={cn(
            "w-[320px] flex-shrink-0 border-l border-white/[0.08] bg-[#0c0c0f]/80 flex flex-col overflow-y-auto hide-scrollbar",
            "max-lg:fixed max-lg:top-16 max-lg:bottom-0 max-lg:right-0 max-lg:z-40 max-lg:w-[86vw] max-lg:max-w-[320px]",
            "max-lg:transition-transform max-lg:duration-300 max-lg:ease-out max-lg:shadow-[0_24px_60px_rgba(0,0,0,0.7)]",
            rightOpen ? "max-lg:translate-x-0" : "max-lg:translate-x-[110%]",
          )}
        >
          {/* Live mockup preview */}
          <div className="p-space-sm border-b border-white/[0.06]">
            <span className="label-tech">Live product preview</span>
            <div className="glass-panel-sm p-space-sm">
              <GarmentMockup
                type={product.categorySlug as never}
                color={colorHex}
                className="h-56 w-full"
                overlay={
                  <div className="w-full h-full relative">
                    {previews[activeSide] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={previews[activeSide]!}
                        alt={`${activeSide} design preview`}
                        className="w-full h-full object-contain"
                        draggable={false}
                      />
                    ) : null}
                  </div>
                }
                overlayBox={{
                  topPct: activePlacement.topPct,
                  leftPct: activePlacement.leftPct,
                  widthPct: (activePlacement.widthIn / 20) * 100,
                  heightPct: (activePlacement.heightIn / 26) * 100,
                }}
              />

              <div className="flex flex-wrap gap-1 mt-space-xs justify-center">
                {product.colors.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    title={c.name}
                    aria-label={`Preview colour ${c.name}`}
                    aria-pressed={colorHex === c.hex}
                    onClick={() => {
                      setColorHex(c.hex);
                      setColorName(c.name);
                    }}
                    className={cn(
                      "w-7 h-7 rounded-full border-2 transition-all",
                      colorHex === c.hex ? "border-[#FF3B30] scale-110" : "border-white/20 hover:border-white/50",
                    )}
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>
              <p className="text-center font-label-technical text-[9px] uppercase tracking-widest text-white/40 mt-1">
                {colorName}
              </p>
            </div>
          </div>

          {/* Quick price */}
          <div className="px-space-sm py-space-xs border-b border-white/[0.06] flex items-start justify-between gap-space-sm">
            <span className="flex flex-col">
              <span className="font-label-technical text-label-technical uppercase tracking-widest text-white/50">
                Est. per piece
              </span>
              <span className="font-headline-md text-headline-md font-bold text-white">{formatINR(unitPrice)}</span>
              <span className="font-label-technical text-[9px] text-white/40 mt-0.5">
                {printArea
                  ? `${printArea.widthIn}″ × ${printArea.heightIn}″ printed`
                  : `Full ${activePlacement.widthIn}″ × ${activePlacement.heightIn}″ placement`}
              </span>
            </span>
            <span className="font-label-technical text-[9px] text-white/40 text-right leading-4">
              Blank {formatINR(product.basePrice)}
              <br />
              Print {formatINR(printCost)}
              <br />
              {printPricing.ratePerSqIn > 0 ? (
                <span className={billedAreaSqIn * printPricing.ratePerSqIn < printPricing.minimum ? "text-[#FF8C26]" : "text-[#7ef0a8]"}>
                  {billedAreaSqIn.toFixed(1)} in² @ ₹{printPricing.ratePerSqIn.toFixed(2)}/in²
                  {billedAreaSqIn * printPricing.ratePerSqIn < printPricing.minimum
                    ? ` · min ₹${printPricing.minimum}`
                    : ""}
                </span>
              ) : (
                <span>{activePlacement.label} · flat rate</span>
              )}
            </span>
          </div>

          <PropertiesPanel
            layer={selected}
            onChange={(patch) => selected && updateLayer(selected.id, patch, false)}
            onCommit={() => selected && updateLayer(selected.id, {}, true)}
            onReplaceImage={() => replaceRef.current?.click()}
            priceHint={null}
          />

          <div className="p-space-sm mt-auto border-t border-white/[0.06]">
            <p className="font-body-sm text-body-sm text-white/40">
              Designs are stored as JSON so you can reopen and edit them any time from{" "}
              <Link href="/account?tab=designs" className="text-[#00E0F2] hover:underline">
                your account
              </Link>
              .
            </p>
          </div>
        </aside>

        {/* Phone: scrim behind whichever drawer is open */}
        {leftOpen || rightOpen ? (
          <button
            type="button"
            aria-label="Close panel"
            className="lg:hidden fixed inset-0 top-16 z-30 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              setLeftOpen(false);
              setRightOpen(false);
            }}
          />
        ) : null}
      </div>

      {/* Hidden inputs */}
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUpload(file);
          e.target.value = "";
        }}
      />
      <input
        ref={replaceRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && selected) {
            handleUpload(file);
          }
          e.target.value = "";
        }}
      />

      {/* Add-to-cart dialog */}
      <Dialog open={cartOpen} onOpenChange={setCartOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add your design to cart</DialogTitle>
            <DialogDescription>
              Pick the garment colour and size. Quantity discounts apply automatically from 10 pieces.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-space-md mt-space-sm">
            <div>
              <span className="label-tech">Colour · {colorName}</span>
              <div className="flex flex-wrap gap-space-xs">
                {product.colors.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    aria-label={c.name}
                    aria-pressed={colorHex === c.hex}
                    onClick={() => {
                      setColorHex(c.hex);
                      setColorName(c.name);
                      setCartSize(null);
                    }}
                    className={cn(
                      "w-9 h-9 rounded-full border-2 transition-all",
                      colorHex === c.hex ? "border-[#FF3B30] scale-110" : "border-white/20 hover:border-white/50",
                    )}
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>
            </div>

            <div>
              <span className="label-tech">Size</span>
              <div className="flex flex-wrap gap-space-xs">
                {sizesForColor.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    disabled={v.stock <= 0}
                    onClick={() => setCartSize(v.size)}
                    aria-pressed={cartSize === v.size}
                    className={cn(
                      "min-w-12 h-11 px-3 rounded-2xl font-label-lg text-label-lg border transition-all",
                      cartSize === v.size
                        ? "bg-white/[0.14] border-white/30 text-white"
                        : "bg-white/[0.04] border-white/10 text-white/70 hover:border-white/30",
                      v.stock <= 0 && "opacity-30 line-through cursor-not-allowed",
                    )}
                  >
                    {v.size}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="label-tech mb-0">Quantity</span>
              <div className="flex items-center gap-space-xs">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  onClick={() => setCartQty((q) => Math.max(1, q - 1))}
                  className="w-9 h-9 rounded-full bg-white/[0.06] border border-white/10 text-white hover:bg-white/[0.12]"
                >
                  −
                </button>
                <span className="w-10 text-center font-label-lg text-label-lg text-white tabular-nums">{cartQty}</span>
                <button
                  type="button"
                  aria-label="Increase quantity"
                  onClick={() => setCartQty((q) => Math.min(500, q + 1))}
                  className="w-9 h-9 rounded-full bg-white/[0.06] border border-white/10 text-white hover:bg-white/[0.12]"
                >
                  +
                </button>
              </div>
            </div>

            <div className="glass-panel-sm p-space-sm flex items-center justify-between">
              <span className="font-label-technical text-label-technical uppercase tracking-widest text-white/50">
                Estimated total
              </span>
              <span className="font-headline-lg text-headline-lg font-bold text-white">
                {formatINR(unitPrice * cartQty)}
              </span>
            </div>

            <div className="flex items-center justify-between font-label-technical text-[9px] uppercase tracking-widest text-white/40">
              <span>
                Print {formatINR(printCost)} / piece
                {printArea ? ` · ${printArea.areaSqIn.toFixed(1)} in²` : ""}
              </span>
              <span>
                {printPricing.ratePerSqIn > 0 ? `₹${printPricing.ratePerSqIn.toFixed(2)}/in² · min ₹${printPricing.minimum}` : "Flat placement rate"}
              </span>
            </div>

            {totalLayers === 0 ? (
              <p className="flex items-center gap-space-xs font-body-sm text-body-sm text-[#FF8C26]">
                <AlertTriangle className="size-4" /> Add text or artwork before checkout.
              </p>
            ) : null}

            <Button onClick={handleAddToCart} disabled={adding || !selectedVariant || totalLayers === 0} className="h-12">
              <Check className="size-4" /> {adding ? "Adding…" : "Add to cart"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BarBtn({
  children,
  label,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="w-9 h-9 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/[0.1] transition-all disabled:opacity-30 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}
