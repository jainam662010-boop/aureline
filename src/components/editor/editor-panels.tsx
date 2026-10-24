"use client";

import * as React from "react";
import {
  Type,
  ImageUp,
  Shapes,
  Layers as LayersIcon,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  AlertTriangle,
} from "lucide-react";
import { cn, formatINR } from "@/lib/utils";
import { CLIPART, EDITOR_FONTS } from "@/lib/constants";
import type { DesignLayerState } from "@/lib/editor-types";
import { isLowRes, layerDpi, type PlacementInfo } from "@/components/editor/editor-utils";

const SWATCHES = [
  "#FFFFFF", "#000000", "#FF3B30", "#FF0D7B", "#8026F2", "#00E0F2",
  "#FF8C26", "#FFD400", "#22c55e", "#3B424C", "#E6DEC8", "#6E2233",
];

export type LeftTab = "tools" | "clipart" | "layers";

export interface LeftPanelProps {
  tab: LeftTab;
  onTab: (tab: LeftTab) => void;
  onAddText: () => void;
  onUploadImage: (file: File) => void;
  onAddClipart: (key: string) => void;
  uploading: boolean;
  layers: DesignLayerState[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onReorder: (id: string, dir: -1 | 1) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  side: "FRONT" | "BACK";
  placements: PlacementInfo[];
  activePlacementKey: string;
  onPlacementChange: (key: string) => void;
  /** Responsive positioning: inline panel on desktop, off-canvas drawer on phones. */
  className?: string;
}

export function LeftPanel(props: LeftPanelProps) {
  const fileRef = React.useRef<HTMLInputElement>(null);

  return (
    <aside
      className={cn(
        "w-[300px] flex-shrink-0 glass-panel border-r border-white/[0.08] rounded-none flex flex-col overflow-hidden bg-[#0c0c0f]/80",
        /* Phones: slide-over drawer above the canvas */
        "max-lg:fixed max-lg:top-16 max-lg:bottom-0 max-lg:left-0 max-lg:z-40 max-lg:w-[86vw] max-lg:max-w-[320px]",
        "max-lg:transition-transform max-lg:duration-300 max-lg:ease-out max-lg:shadow-[0_24px_60px_rgba(0,0,0,0.7)]",
        props.className,
      )}
    >
      {/* Placement selector */}
      <div className="p-space-sm border-b border-white/[0.06]">
        <span className="label-tech">Print area · {props.side}</span>
        <div className="flex flex-wrap gap-1">
          {props.placements.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => props.onPlacementChange(p.key)}
              aria-pressed={props.activePlacementKey === p.key}
              className={cn(
                "px-3 py-1.5 rounded-full font-label-md text-label-md border transition-all",
                props.activePlacementKey === p.key
                  ? "bg-white/[0.14] border-white/30 text-white"
                  : "bg-white/[0.04] border-white/10 text-white/60 hover:text-white hover:border-white/30",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-3 gap-1 p-space-xs border-b border-white/[0.06]">
        {([
          { key: "tools", label: "Add", icon: Type },
          { key: "clipart", label: "Clipart", icon: Shapes },
          { key: "layers", label: "Layers", icon: LayersIcon },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => props.onTab(key)}
            aria-pressed={props.tab === key}
            className={cn(
              "flex flex-col items-center gap-1 py-2 rounded-xl font-label-md text-label-md transition-all",
              props.tab === key ? "bg-white/[0.12] text-white" : "text-white/50 hover:text-white hover:bg-white/[0.05]",
            )}
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto hide-scrollbar p-space-sm">
        {props.tab === "tools" ? (
          <div className="flex flex-col gap-space-sm">
            <button type="button" onClick={props.onAddText} className="glass-panel-sm p-space-md flex items-center gap-space-sm hover:border-[#FF0D7B]/50 transition-all text-left">
              <span className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#FF3B30] to-[#FF0D7B] flex items-center justify-center text-white">
                <Type className="size-5" />
              </span>
              <span className="flex flex-col">
                <span className="font-label-lg text-label-lg text-white">Add text</span>
                <span className="font-body-sm text-body-sm text-white/50">Fonts, colours, curve-free layout</span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={props.uploading}
              className="glass-panel-sm p-space-md flex items-center gap-space-sm hover:border-[#8026F2]/50 transition-all text-left disabled:opacity-50"
            >
              <span className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#8026F2] to-[#00E0F2] flex items-center justify-center text-white">
                <ImageUp className="size-5" />
              </span>
              <span className="flex flex-col">
                <span className="font-label-lg text-label-lg text-white">
                  {props.uploading ? "Uploading…" : "Upload image"}
                </span>
                <span className="font-body-sm text-body-sm text-white/50">PNG, JPG, WEBP, SVG · max 10 MB</span>
              </span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) props.onUploadImage(file);
                e.target.value = "";
              }}
            />

            <p className="font-body-sm text-body-sm text-white/40 px-1">
              Tip: drag to move, corner handles to resize, and the rotate handle on top to spin. Hold <b>Ctrl</b> +
              scroll to zoom.
            </p>
          </div>
        ) : null}

        {props.tab === "clipart" ? (
          <div className="grid grid-cols-3 gap-space-xs">
            {CLIPART.map((clip) => (
              <button
                key={clip.key}
                type="button"
                onClick={() => props.onAddClipart(clip.key)}
                title={clip.label}
                aria-label={`Add clipart: ${clip.label}`}
                className="aspect-square rounded-xl bg-white/[0.04] border border-white/10 hover:border-[#FF0D7B]/60 hover:bg-white/[0.08] transition-all flex items-center justify-center p-2"
              >
                <svg viewBox="0 0 100 100" className="w-full h-full text-white/80" fill="currentColor" aria-hidden>
                  <path d={clip.path} fillRule={clip.fillRule ?? "nonzero"} />
                </svg>
              </button>
            ))}
          </div>
        ) : null}

        {props.tab === "layers" ? (
          <div className="flex flex-col gap-space-xs">
            {props.layers.length === 0 ? (
              <p className="font-body-sm text-body-sm text-white/40 px-1">
                No elements on the {props.side.toLowerCase()} yet. Add text, upload artwork or drop some clipart.
              </p>
            ) : (
              [...props.layers].reverse().map((layer) => (
                <div
                  key={layer.id}
                  className={cn(
                    "flex items-center gap-space-xs p-space-xs rounded-xl border transition-all cursor-pointer",
                    props.selectedId === layer.id
                      ? "border-[#FF0D7B]/60 bg-white/[0.08]"
                      : "border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06]",
                  )}
                  onClick={() => props.onSelect(layer.id)}
                >
                  <span className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center text-[10px] font-bold text-white/80 flex-shrink-0">
                    {layer.type === "TEXT" ? "T" : layer.type === "IMAGE" ? "IMG" : "★"}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="font-label-md text-label-md text-white truncate block">
                      {layer.type === "TEXT" ? (layer.text || "Text").slice(0, 22) : layer.type === "IMAGE" ? "Uploaded art" : "Clipart"}
                    </span>
                    {layer.type === "IMAGE" && isLowRes(layer) ? (
                      <span className="flex items-center gap-1 font-label-technical text-[9px] text-[#FF8C26]">
                        <AlertTriangle className="size-3" /> {layerDpi(layer)} DPI
                      </span>
                    ) : null}
                  </span>
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    <IconBtn label="Move up" onClick={() => props.onReorder(layer.id, 1)}><ChevronUp className="size-3.5" /></IconBtn>
                    <IconBtn label="Move down" onClick={() => props.onReorder(layer.id, -1)}><ChevronDown className="size-3.5" /></IconBtn>
                    <IconBtn label="Duplicate" onClick={() => props.onDuplicate(layer.id)}><Copy className="size-3.5" /></IconBtn>
                    <IconBtn label="Delete" danger onClick={() => props.onDelete(layer.id)}><Trash2 className="size-3.5" /></IconBtn>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : null}
      </div>
    </aside>
  );
}

function IconBtn({
  children,
  label,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "w-7 h-7 rounded-lg flex items-center justify-center transition-colors",
        danger ? "text-[#ff9d95] hover:bg-[#93000a]/40" : "text-white/60 hover:bg-white/10 hover:text-white",
      )}
    >
      {children}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Properties panel                                                            */
/* -------------------------------------------------------------------------- */

export interface PropertiesPanelProps {
  layer: DesignLayerState | null;
  onChange: (patch: Partial<DesignLayerState>) => void;
  onCommit: () => void;
  onReplaceImage: () => void;
  priceHint: { base: number; print: number; unit: number } | null;
}

export function PropertiesPanel({ layer, onChange, onCommit, onReplaceImage, priceHint }: PropertiesPanelProps) {
  if (!layer) {
    return (
      <div className="p-space-md border-t border-white/[0.06]">
        {priceHint ? (
          <div className="glass-panel-sm p-space-sm flex items-center justify-between">
            <span className="flex flex-col">
              <span className="font-label-technical text-label-technical uppercase tracking-widest text-white/50">
                Live price · 1 pc
              </span>
              <span className="font-headline-md text-headline-md font-bold text-white">{formatINR(priceHint.unit)}</span>
            </span>
            <span className="font-label-technical text-[9px] text-white/40 text-right leading-4">
              Blank {formatINR(priceHint.base)}
              <br />
              Print {formatINR(priceHint.print)}
            </span>
          </div>
        ) : null}
        <p className="font-body-sm text-body-sm text-white/40 mt-space-sm text-center">
          Select an element on the canvas to edit its properties.
        </p>
      </div>
    );
  }

  const dpi = layerDpi(layer);

  return (
    <div className="p-space-sm border-t border-white/[0.06] flex flex-col gap-space-sm max-h-[42vh] overflow-y-auto hide-scrollbar">
      {layer.type === "IMAGE" && dpi !== null && dpi < 150 ? (
        <div className="flex items-start gap-space-xs rounded-xl border border-[#FF8C26]/40 bg-[#FF8C26]/10 p-space-sm">
          <AlertTriangle className="size-4 text-[#FF8C26] flex-shrink-0 mt-0.5" />
          <p className="font-body-sm text-body-sm text-[#FFC084]">
            Low resolution ({dpi} DPI at print size). Upload a larger file for crisp 300 DPI output — currently
            recommended max width {(layer.width / 30).toFixed(1)}&quot;.
          </p>
        </div>
      ) : null}

      {layer.type === "TEXT" ? (
        <>
          <TextAreaField
            label="Text"
            value={layer.text ?? ""}
            onChange={(v) => onChange({ text: v })}
            onCommit={onCommit}
          />
          <div className="grid grid-cols-2 gap-space-xs">
            <SelectField
              label="Font"
              value={layer.fontFamily ?? "Inter"}
              options={EDITOR_FONTS.map((f) => ({ value: f.value, label: f.label }))}
              onChange={(v) => {
                onChange({ fontFamily: v });
                onCommit();
              }}
            />
            <NumberField
              label="Size"
              value={layer.fontSize ?? 32}
              min={6}
              max={400}
              onChange={(v) => onChange({ fontSize: v })}
              onCommit={onCommit}
            />
          </div>

          <div className="flex items-center gap-space-xs">
            <ToggleBtn
              active={layer.fontWeight === "bold"}
              label="Bold"
              onClick={() => {
                onChange({ fontWeight: layer.fontWeight === "bold" ? "normal" : "bold" });
                onCommit();
              }}
            >
              <Bold className="size-4" />
            </ToggleBtn>
            <ToggleBtn
              active={layer.fontStyle === "italic"}
              label="Italic"
              onClick={() => {
                onChange({ fontStyle: layer.fontStyle === "italic" ? "normal" : "italic" });
                onCommit();
              }}
            >
              <Italic className="size-4" />
            </ToggleBtn>
            <div className="flex items-center rounded-full bg-white/[0.05] border border-white/10 p-0.5">
              {([
                { value: "left", icon: AlignLeft },
                { value: "center", icon: AlignCenter },
                { value: "right", icon: AlignRight },
              ] as const).map(({ value, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  aria-label={`Align ${value}`}
                  aria-pressed={layer.textAlign === value}
                  onClick={() => {
                    onChange({ textAlign: value });
                    onCommit();
                  }}
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                    layer.textAlign === value ? "bg-white/[0.15] text-white" : "text-white/50 hover:text-white",
                  )}
                >
                  <Icon className="size-4" />
                </button>
              ))}
            </div>
          </div>

          <RangeField
            label={`Letter spacing · ${layer.letterSpacing ?? 0}`}
            value={layer.letterSpacing ?? 0}
            min={-8}
            max={40}
            step={1}
            onChange={(v) => onChange({ letterSpacing: v })}
            onCommit={onCommit}
          />
        </>
      ) : null}

      {layer.type === "CLIPART" ? (
        <ColorField label="Fill colour" value={layer.fill ?? "#FF3B30"} onChange={(v) => onChange({ fill: v })} onCommit={onCommit} />
      ) : null}

      {layer.type === "IMAGE" ? (
        <div className="flex items-center gap-space-xs">
          <button type="button" onClick={onReplaceImage} className="btn-outline flex-1 h-10 text-label-md">
            <ImageUp className="size-4" /> Replace image
          </button>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-space-xs">
        {layer.type === "TEXT" ? (
          <ColorField label="Colour" value={layer.fill ?? "#FFFFFF"} onChange={(v) => onChange({ fill: v })} onCommit={onCommit} />
        ) : null}
        <NumberField
          label="Rotate °"
          value={Math.round(layer.angle)}
          min={-180}
          max={180}
          onChange={(v) => onChange({ angle: v })}
          onCommit={onCommit}
        />
      </div>

      <RangeField
        label={`Opacity · ${Math.round(layer.opacity * 100)}%`}
        value={layer.opacity}
        min={0.1}
        max={1}
        step={0.05}
        onChange={(v) => onChange({ opacity: v })}
        onCommit={onCommit}
      />
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="label-tech mb-1">{children}</span>;
}

function TextAreaField({
  label,
  value,
  onChange,
  onCommit,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onCommit: () => void;
}) {
  return (
    <label className="block">
      <FieldLabel>{label}</FieldLabel>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onCommit}
        rows={2}
        className="w-full rounded-xl border border-white/[0.12] bg-white/[0.04] px-3 py-2 text-body-md text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#FF3B30] resize-none"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <FieldLabel>{label}</FieldLabel>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-10 rounded-xl border border-white/[0.12] bg-white/[0.04] px-3 text-body-md text-white focus:outline-none focus:ring-2 focus:ring-[#FF3B30] [&>option]:bg-[#131315]"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
  onCommit,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  onCommit: () => void;
  min: number;
  max: number;
}) {
  return (
    <label className="block">
      <FieldLabel>{label}</FieldLabel>
      <input
        type="number"
        value={Number.isFinite(value) ? value : 0}
        min={min}
        max={max}
        onChange={(e) => onChange(Math.min(max, Math.max(min, Number(e.target.value) || 0)))}
        onBlur={onCommit}
        className="w-full h-10 rounded-xl border border-white/[0.12] bg-white/[0.04] px-3 text-body-md text-white focus:outline-none focus:ring-2 focus:ring-[#FF3B30]"
      />
    </label>
  );
}

function RangeField({
  label,
  value,
  onChange,
  onCommit,
  min,
  max,
  step,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  onCommit: () => void;
  min: number;
  max: number;
  step: number;
}) {
  return (
    <label className="block">
      <FieldLabel>{label}</FieldLabel>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        onPointerUp={onCommit}
        className="w-full accent-[#FF3B30]"
      />
    </label>
  );
}

function ColorField({ label, value, onChange, onCommit }: { label: string; value: string; onChange: (v: string) => void; onCommit: () => void }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex flex-wrap items-center gap-1.5">
        {SWATCHES.map((swatch) => (
          <button
            key={swatch}
            type="button"
            aria-label={`Colour ${swatch}`}
            aria-pressed={value.toUpperCase() === swatch}
            onClick={() => {
              onChange(swatch);
              onCommit();
            }}
            className={cn(
              "w-6 h-6 rounded-full border-2 transition-all",
              value.toUpperCase() === swatch ? "border-[#FF3B30] scale-110" : "border-white/20 hover:border-white/60",
            )}
            style={{ backgroundColor: swatch }}
          />
        ))}
        <label className="w-6 h-6 rounded-full border-2 border-white/30 overflow-hidden relative cursor-pointer" title="Custom colour">
          <span
            className="absolute inset-0"
            style={{ background: "conic-gradient(#ff3b30,#ffd400,#22c55e,#00e0f2,#8026f2,#ff0d7b,#ff3b30)" }}
          />
          <input
            type="color"
            value={value}
            onChange={(e) => {
              onChange(e.target.value.toUpperCase());
            }}
            onBlur={onCommit}
            className="absolute inset-0 opacity-0 cursor-pointer"
            aria-label="Custom colour picker"
          />
        </label>
      </div>
    </div>
  );
}

function ToggleBtn({
  children,
  active,
  onClick,
  label,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "w-10 h-10 rounded-full border flex items-center justify-center transition-all",
        active ? "bg-white/[0.15] border-white/30 text-white" : "bg-white/[0.05] border-white/10 text-white/60 hover:text-white",
      )}
    >
      {children}
    </button>
  );
}
