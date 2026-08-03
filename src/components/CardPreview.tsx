import React, { useRef, useState, useEffect } from "react";
import { Card } from "../types";
import { ATTRIBUTES, FRAME_TYPES } from "../data";
import {
  Upload,
  HelpCircle,
  RefreshCw,
  Sparkles,
  ShieldAlert,
  Plus,
  Copy,
  Save,
  Trash2,
  Download,
  Share2,
  Loader2,
} from "lucide-react";

interface CardPreviewProps {
  card: Card;
  onChangeCard: (updated: Partial<Card>) => void;
  onExport: () => void;
  isExporting: boolean;
  stageId?: string;
  key?: React.Key;
  onNewCard?: () => void;
  onSaveCard?: () => void;
  onDeleteCard?: (id: string) => void;
  onDuplicateCard?: (card: Card) => void;
  onOpenShareModal?: () => void;
  isSaving?: boolean;
}

export default function CardPreview({
  card,
  onChangeCard,
  onExport,
  isExporting,
  stageId,
  onNewCard,
  onSaveCard,
  onDeleteCard,
  onDuplicateCard,
  onOpenShareModal,
  isSaving = false,
}: CardPreviewProps) {
  const artFrameRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isOverFrame, setIsOverFrame] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");

  const renderInlineEditable = (
    fieldName: string,
    value: string,
    placeholder: string,
    className: string,
    isTextArea = false,
    customUpdater?: (val: string) => void
  ) => {
    const isEditing = editingField === fieldName;

    if (isEditing) {
      if (isTextArea) {
        return (
          <textarea
            autoFocus
            value={editValue}
            onChange={(e) => {
              setEditValue(e.target.value);
              if (customUpdater) {
                customUpdater(e.target.value);
              } else {
                onChangeCard({ [fieldName]: e.target.value });
              }
            }}
            onBlur={() => setEditingField(null)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setEditingField(null);
              }
            }}
            placeholder={placeholder}
            className="w-full bg-black/90 text-white rounded-lg border border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 p-2 font-semibold text-xs min-h-[60px] resize-none text-slate-100 placeholder-slate-500"
            onClick={(e) => e.stopPropagation()}
          />
        );
      } else {
        return (
          <input
            autoFocus
            type="text"
            value={editValue}
            onChange={(e) => {
              setEditValue(e.target.value);
              if (customUpdater) {
                customUpdater(e.target.value);
              } else {
                onChangeCard({ [fieldName]: e.target.value });
              }
            }}
            onBlur={() => setEditingField(null)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setEditingField(null);
              } else if (e.key === "Escape") {
                setEditingField(null);
              }
            }}
            placeholder={placeholder}
            className="bg-black/90 text-white rounded px-2 py-0.5 border border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold max-w-full text-slate-100 placeholder-slate-500"
            onClick={(e) => e.stopPropagation()}
          />
        );
      }
    }

    return (
      <div
        onClick={(e) => {
          e.stopPropagation();
          setEditingField(fieldName);
          setEditValue(value || "");
        }}
        className={`cursor-text group/inline relative hover:bg-blue-500/10 px-1 py-0.5 rounded border border-dashed border-transparent hover:border-blue-500/40 transition-all ${className}`}
        title="Tap to edit directly on card"
      >
        <span>{value || placeholder}</span>
        <span className="absolute -top-3.5 -right-1 hidden group-hover/inline:inline-flex bg-blue-600 text-[8px] text-white px-1 py-0.5 rounded shadow-lg font-sans font-extrabold uppercase tracking-wider z-20 pointer-events-none">
          ✏️ Tap
        </span>
      </div>
    );
  };

  const TYPE_OPTIONS = [
    { label: "Pillar", value: "Pillar" },
    { label: "Rune", value: "Rune" },
    { label: "Shield", value: "Shield" },
    { label: "Conjuring", value: "Conjuring" },
    { label: "Casting", value: "Casting" },
  ];

  const RARITY_OPTIONS = [
    { label: "Common", value: "Common" },
    { label: "Uncommon", value: "Uncommon" },
    { label: "Rare", value: "Rare" },
    { label: "Epic", value: "Epic" },
    { label: "Legendary", value: "Legendary" },
  ];

  const ATTRIBUTE_OPTIONS = [
    { label: "Earth Attribute", value: "Earth" },
    { label: "Water Attribute", value: "Water" },
    { label: "Wind Attribute", value: "Wind" },
    { label: "Fire Attribute", value: "Fire" },
    { label: "Life Attribute", value: "Life" },
    { label: "Death Attribute", value: "Death" },
    { label: "Time Attribute", value: "Time" },
    { label: "Space Attribute", value: "Space" },
    { label: "No Attribute", value: "" },
  ];

  const FRAME_TYPE_OPTIONS = [
    { label: "Earth Frame", value: "Earth" },
    { label: "Water Frame", value: "Water" },
    { label: "Wind Frame", value: "Wind" },
    { label: "Fire Frame", value: "Fire" },
    { label: "Life Frame", value: "Life" },
    { label: "Death Frame", value: "Death" },
    { label: "Time Frame", value: "Time" },
    { label: "Space Frame", value: "Space" },
  ];

  const FRAME_STYLE_OPTIONS = [
    { label: "Standard Style", value: "Standard" },
    { label: "Metal Style", value: "Metal" },
    { label: "Crystal Style", value: "Crystal" },
    { label: "Void Style", value: "Void" },
    { label: "Chroma Style", value: "Chroma" },
    { label: "Ancient Style", value: "Ancient" },
  ];

  const renderInlineSelect = (
    fieldName: string,
    value: string,
    options: { label: string; value: string }[],
    className: string,
    placeholder = "Select Option"
  ) => {
    const isEditing = editingField === fieldName;

    if (isEditing) {
      return (
        <select
          autoFocus
          value={value}
          onChange={(e) => {
            onChangeCard({ [fieldName]: e.target.value });
            setEditingField(null);
          }}
          onBlur={() => setEditingField(null)}
          className="bg-slate-900 text-white text-[11px] rounded border border-blue-500 px-1 py-0.5 font-bold focus:outline-none focus:ring-1 focus:ring-blue-500 z-50 cursor-pointer max-w-full"
          onClick={(e) => e.stopPropagation()}
        >
          <option value="" className="bg-slate-900 text-slate-400 font-semibold">
            -- {placeholder} --
          </option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-slate-900 text-white font-semibold">
              {opt.label}
            </option>
          ))}
        </select>
      );
    }

    const currentLabel = options.find((o) => o.value === value)?.label || placeholder;

    return (
      <div
        onClick={(e) => {
          e.stopPropagation();
          setEditingField(fieldName);
        }}
        className={`cursor-pointer group/inline select-none relative hover:bg-blue-500/20 px-1 py-0.5 rounded border border-dashed border-transparent hover:border-blue-500/40 transition-all ${className}`}
        title="Tap to select option"
      >
        <span>{currentLabel}</span>
        <span className="absolute -top-3.5 -right-1 hidden group-hover/inline:inline-flex bg-blue-600 text-[8px] text-white px-1 py-0.5 rounded shadow-lg font-sans font-extrabold uppercase tracking-wider z-20 pointer-events-none">
          ⚙️ Change
        </span>
      </div>
    );
  };

  const stageWrapperRef = useRef<HTMLDivElement>(null);
  const [stageScale, setStageScale] = useState(1);

  useEffect(() => {
    if (!stageWrapperRef.current) return;
    const updateScale = () => {
      if (stageWrapperRef.current) {
        const availableWidth = stageWrapperRef.current.getBoundingClientRect().width;
        if (availableWidth > 0 && availableWidth < 416) {
          const scale = (availableWidth - 8) / 400;
          setStageScale(Math.max(0.60, scale));
        } else {
          setStageScale(1);
        }
      }
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(stageWrapperRef.current);
    return () => observer.disconnect();
  }, []);

  // Sync internal state with props
  useEffect(() => {
    setDragOffset({ x: card.artX, y: card.artY });
  }, [card.artX, card.artY]);

  // Handle Drag-and-Drop file upload
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOverFrame(true);
  };

  const handleDragLeave = () => {
    setIsOverFrame(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOverFrame(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        onChangeCard({
          artUrl: event.target.result as string,
          artScale: 1.0,
          artX: 0,
          artY: 0,
          artRotation: 0,
        });
      }
    };
    reader.readAsDataURL(file);
  };

  // Image Drag-to-Position on Canvas
  const handleArtMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!card.artUrl) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleArtMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    const newX = dragOffset.x + dx;
    const newY = dragOffset.y + dy;
    setDragStart({ x: e.clientX, y: e.clientY });
    setDragOffset({ x: newX, y: newY });
    onChangeCard({ artX: newX, artY: newY });
  };

  const handleArtMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (!card.artUrl) return;
    e.preventDefault();
    const zoomIntensity = 0.05;
    const newScale = Math.max(0.1, Math.min(5.0, card.artScale - e.deltaY * zoomIntensity * 0.01));
    onChangeCard({ artScale: Number(newScale.toFixed(2)) });
  };

  // Helper to determine Card Background Style based on frameType (Earth, Water, Wind, Fire, Life, Death, Time, Space)
  const getCardBackgroundClass = () => {
    switch (card.frameType) {
      case "Earth":
        return "bg-gradient-to-b from-[#022c22] via-[#059669] to-[#022c22] text-white";
      case "Water":
        return "bg-gradient-to-b from-[#172554] via-[#2563eb] to-[#172554] text-white";
      case "Wind":
        return "bg-gradient-to-b from-[#083344] via-[#0d9488] to-[#083344] text-white";
      case "Fire":
        return "bg-gradient-to-b from-[#450a0a] via-[#dc2626] to-[#450a0a] text-white";
      case "Life":
        return "bg-gradient-to-b from-[#422006] via-[#d97706] to-[#422006] text-white";
      case "Death":
        return "bg-gradient-to-b from-[#1e1b4b] via-[#581c87] to-[#1e1b4b] text-white";
      case "Time":
        return "bg-gradient-to-b from-[#310612] via-[#be123c] to-[#310612] text-white";
      case "Space":
        return "bg-gradient-to-b from-[#0f172a] via-[#4f46e5] to-[#0f172a] text-white";
      default:
        return "bg-gradient-to-b from-[#1e293b] via-[#334155] to-[#1e293b] text-white";
    }
  };

  const getFrameStyleConfig = () => {
    const style = card.frameStyle || "Standard";
    
    // Core color helper to get elemental base border
    const getBaseBorderColor = () => {
      switch (card.frameType) {
        case "Earth": return "border-[#10b981]";
        case "Water": return "border-[#3b82f6]";
        case "Wind": return "border-[#06b6d4]";
        case "Fire": return "border-[#f97316]";
        case "Life": return "border-[#facc15]";
        case "Death": return "border-[#a855f7]";
        case "Time": return "border-[#f43f5e]";
        case "Space": return "border-[#6366f1]";
        default: return "border-slate-500";
      }
    };

    switch (style) {
      case "Metal":
        return {
          stageBorder: "border-[#64748b] shadow-[0_0_20px_rgba(100,116,139,0.5)]",
          headerBg: "bg-slate-900/80 border-slate-700 text-slate-100 shadow-[inset_0_1px_2px_rgba(255,255,255,0.1)]",
          descBg: "bg-slate-950/75 border-slate-700",
          panelBorder: "border-slate-700",
          flourish: "border-slate-700",
          headerLabel: "text-slate-300 font-bold",
          borderOverlay: "absolute inset-1 border-[1.5px] border-slate-400/30 rounded-[18px] pointer-events-none z-10",
        };
      case "Crystal":
        return {
          stageBorder: "border-[#38bdf8] shadow-[0_0_25px_rgba(56,189,248,0.6),inset_0_0_12px_rgba(56,189,248,0.4)]",
          headerBg: "bg-cyan-950/40 backdrop-blur-md border-cyan-400/30 text-white shadow-[0_4px_12px_rgba(56,189,248,0.15)]",
          descBg: "bg-cyan-950/60 backdrop-blur-md border-cyan-400/20",
          panelBorder: "border-cyan-400/30",
          flourish: "border-cyan-300/20",
          headerLabel: "text-cyan-200",
          borderOverlay: "absolute inset-1 border-[2px] border-cyan-300/30 rounded-[18px] pointer-events-none z-10 animate-pulse",
        };
      case "Void":
        return {
          stageBorder: "border-[#a855f7] shadow-[0_0_30px_rgba(168,85,247,0.7)] bg-[#090514]",
          headerBg: "bg-[#090514]/90 border-purple-500/40 text-purple-200",
          descBg: "bg-black/80 border-purple-500/20",
          panelBorder: "border-purple-500/20",
          flourish: "border-purple-500/20",
          headerLabel: "text-purple-300",
          borderOverlay: "absolute inset-1 border border-purple-400/30 rounded-[18px] pointer-events-none z-10",
        };
      case "Chroma":
        return {
          stageBorder: "border-transparent bg-gradient-to-r from-red-500 via-green-500 to-blue-500 shadow-[0_0_20px_rgba(239,68,68,0.4)]",
          headerBg: "bg-rose-950/50 backdrop-blur-md border-rose-500/30 text-rose-100",
          descBg: "bg-rose-950/65 border-rose-500/20",
          panelBorder: "border-rose-500/20",
          flourish: "border-rose-500/20",
          headerLabel: "text-rose-300",
          borderOverlay: "absolute inset-1 border-2 border-dashed border-rose-500/30 rounded-[18px] pointer-events-none z-10",
        };
      case "Ancient":
        return {
          stageBorder: "border-[#b45309] shadow-[0_0_20px_rgba(180,83,9,0.5)]",
          headerBg: "bg-[#451a03]/80 border-[#d97706]/40 text-[#fef3c7]",
          descBg: "bg-[#1c0d02]/95 border-[#d97706]/20",
          panelBorder: "border-[#d97706]/20",
          flourish: "border-[#d97706]/20",
          headerLabel: "text-[#fbbf24] font-serif",
          borderOverlay: "absolute inset-1 border-2 border-[#fbbf24]/30 rounded-[18px] pointer-events-none z-10",
        };
      case "Standard":
      default:
        return {
          stageBorder: `${getBaseBorderColor()} shadow-xl`,
          headerBg: "bg-black/40 backdrop-blur-sm border-white/5 text-white",
          descBg: "bg-black/60 backdrop-blur-md border-white/10",
          panelBorder: "border-white/10",
          flourish: "border-white/5",
          headerLabel: "text-slate-200",
          borderOverlay: "absolute inset-1 border border-white/10 rounded-[18px] pointer-events-none z-10",
        };
    }
  };

  const frameConfig = getFrameStyleConfig();

  // Retrieve Attribute Label
  const getAttributeBadge = () => {
    const attr = ATTRIBUTES.find((a) => a.value === card.attribute);
    return attr || null;
  };

  // Determine Card Title Style by Rarity
  const getTitleStyle = () => {
    switch (card.rarity) {
      case "Rare":
        return "text-slate-200 drop-shadow-[0_1.5px_0px_rgba(30,41,59,1)]";
      case "Epic":
        return "bg-gradient-to-r from-purple-400 via-fuchsia-300 to-pink-400 bg-clip-text text-transparent drop-shadow-[0_1.5px_1px_rgba(0,0,0,0.8)]";
      case "Legendary":
        return "bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 bg-clip-text text-transparent drop-shadow-[1px_1.5px_1.5px_rgba(0,0,0,0.9)] font-black";
      default:
        return "text-white";
    }
  };

  return (
    <div id="card-preview-container" className="flex flex-col items-center select-none w-full">
      {/* Quick Action Control Bar for Full Card Control */}
      {!isExporting && (
        <div className="w-full max-w-[420px] mb-4 bg-[#0F1115] border border-[#334155] rounded-xl p-2 flex items-center justify-between gap-1 shadow-lg">
          {/* New Card */}
          {onNewCard && (
            <button
              onClick={onNewCard}
              className="px-2.5 py-1.5 bg-[#161B22] hover:bg-[#1E293B] text-blue-400 hover:text-blue-300 border border-[#334155] rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
              title="Create a new card template (Ctrl+N)"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New</span>
            </button>
          )}

          {/* Duplicate Card */}
          {onDuplicateCard && (
            <button
              onClick={() => onDuplicateCard(card)}
              className="px-2.5 py-1.5 bg-[#161B22] hover:bg-[#1E293B] text-slate-300 hover:text-white border border-[#334155] rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
              title="Clone / Duplicate this card"
            >
              <Copy className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Clone</span>
            </button>
          )}

          {/* Save Card */}
          {onSaveCard && (
            <button
              disabled={isSaving}
              onClick={onSaveCard}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-[#1E293B] text-white font-extrabold rounded-lg text-[11px] flex items-center gap-1 transition-colors cursor-pointer shadow-sm shadow-blue-500/10"
              title="Save card changes to collection (Ctrl+S)"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Save</span>
            </button>
          )}

          {/* Export PNG */}
          <button
            onClick={onExport}
            className="px-2.5 py-1.5 bg-[#161B22] hover:bg-[#1E293B] text-emerald-400 hover:text-emerald-300 border border-[#334155] rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
            title="Download high-resolution 300 DPI PNG"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>

          {/* Share Modal */}
          {onOpenShareModal && (
            <button
              onClick={onOpenShareModal}
              className="px-2.5 py-1.5 bg-[#161B22] hover:bg-[#1E293B] text-indigo-400 hover:text-indigo-300 border border-[#334155] rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
              title="Share card via link, image clipboard, or JSON (Ctrl+Shift+S)"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Share</span>
            </button>
          )}

          {/* Delete Card */}
          {onDeleteCard && (
            <button
              onClick={() => {
                if (window.confirm(`Are you sure you want to delete "${card.name || "this card"}"?`)) {
                  onDeleteCard(card.id);
                }
              }}
              className="p-1.5 bg-[#161B22] hover:bg-red-950/40 text-slate-400 hover:text-red-400 border border-[#334155] hover:border-red-900/40 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
              title="Delete this card"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Zoom / Info Instructions bar */}
      <div className="flex items-center justify-between w-full max-w-[430px] px-2 mb-3 text-xs text-slate-400">
        <div className="flex items-center gap-1.5">
          <HelpCircle className="w-3.5 h-3.5 text-blue-400" />
          <span>Scroll to Zoom art • Drag to Reposition</span>
        </div>
        <button
          onClick={() => onChangeCard({ artScale: 1, artX: 0, artY: 0, artRotation: 0 })}
          className="flex items-center gap-1 hover:text-blue-400 transition-colors bg-[#0F1115] border border-[#334155] rounded px-2 py-0.5 cursor-pointer text-xs"
          title="Reset Art Transform"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Reset</span>
        </button>
      </div>

      {/* The Printable Trading Card Stage Container (Auto-scales on mobile viewports) */}
      <div
        ref={stageWrapperRef}
        className="w-full max-w-[410px] flex justify-center items-center overflow-hidden transition-all my-1"
        style={{
          height: isExporting ? "580px" : `${Math.round(580 * stageScale)}px`,
        }}
      >
        <div
          style={{
            transform: isExporting ? "none" : `scale(${stageScale})`,
            transformOrigin: "top center",
          }}
        >
          <div
            id={stageId || "card-stage"}
            ref={cardRef}
            className={`w-[400px] h-[580px] rounded-[24px] p-4 ${isExporting ? "pt-4" : "pt-10"} flex flex-col justify-between border-[8px] relative transition-all duration-300 overflow-hidden ${getCardBackgroundClass()} ${frameConfig.stageBorder}`}
            style={{
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.8)",
            }}
          >
        {/* Absolute floating Frame Type & Border Style Selector */}
        {!isExporting && (
          <div data-html2canvas-ignore="true" className="absolute top-2 left-1/2 -translate-x-1/2 bg-black/85 backdrop-blur-md border border-white/10 rounded-full px-3 py-1 flex items-center gap-2 text-[9px] font-bold text-slate-300 z-30 opacity-60 hover:opacity-100 transition-opacity whitespace-nowrap shadow-md">
            <span className="flex items-center gap-1">
              🌀 Frame:
              {renderInlineSelect("frameType", card.frameType || "Earth", FRAME_TYPE_OPTIONS, "text-blue-400 font-extrabold hover:text-blue-300")}
            </span>
            <span className="text-white/20">|</span>
            <span className="flex items-center gap-1">
              ✨ Border:
              {renderInlineSelect("frameStyle", card.frameStyle || "Standard", FRAME_STYLE_OPTIONS, "text-indigo-400 font-extrabold hover:text-indigo-300")}
            </span>
          </div>
        )}

        {/* Fine Border Line Overlay */}
        {frameConfig.borderOverlay ? (
          <div dangerouslySetInnerHTML={{ __html: "" }} className="hidden" />
        ) : null}
        <div className="absolute inset-1 border border-white/10 rounded-[18px] pointer-events-none z-10" />
        
        {/* Custom Frame Border Overlay */}
        {card.frameStyle && card.frameStyle !== "Standard" && (
          <div className={frameConfig.borderOverlay} />
        )}

        {/* TOP ROW: Name, Cost & Attribute Tag */}
        <div 
          id="card-header" 
          className={`flex justify-between items-center px-3 py-2 backdrop-blur-sm rounded-xl border shadow-inner z-10 ${frameConfig.headerBg} ${frameConfig.panelBorder}`}
        >
          {renderInlineEditable(
            "name",
            card.name || "",
            "Untitled Card",
            `text-xl font-extrabold max-w-[220px] leading-none ${getTitleStyle()}`
          )}

          {/* Dynamic Badges Block */}
          <div className="flex items-center gap-1.5">
            {/* Cost Badge */}
            {renderInlineEditable(
              "cost",
              card.cost || "",
              "Cost",
              "px-2.5 py-1 bg-black/60 border border-white/10 rounded-lg text-[10px] font-black uppercase tracking-wider text-slate-100 shadow-md inline-block"
            )}

            {/* Attribute/Element Emblem */}
            <div className="flex items-center">
              {renderInlineSelect(
                "attribute",
                card.attribute || "",
                ATTRIBUTE_OPTIONS,
                "px-2 py-0.5 bg-black/50 border border-white/10 rounded-lg text-[9px] font-bold text-slate-300 inline-block uppercase tracking-wider",
                "Attribute"
              )}
            </div>
          </div>
        </div>

        {/* MAIN ART FRAME */}
        <div
          id="card-art-frame"
          ref={artFrameRef}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`w-[340px] mx-auto border-[3px] bg-[#0F1115] relative overflow-hidden flex items-center justify-center transition-all duration-300 cursor-grab ${frameConfig.panelBorder} ${
            isDragging ? "cursor-grabbing border-blue-500" : ""
          } ${isOverFrame ? "bg-[#1E293B] border-blue-500" : ""}`}
          style={{
            height: `${card.artHeight !== undefined ? card.artHeight : 240}px`,
            borderRadius: `${card.artBorderRadius !== undefined ? card.artBorderRadius : 12}px`,
          }}
        >
          {card.artUrl ? (
            <img
              src={card.artUrl}
              alt="Custom card art"
              referrerPolicy="no-referrer"
              className="absolute pointer-events-none select-none max-w-none origin-center"
              style={{
                transform: `translate(${card.artX}px, ${card.artY}px) scale(${card.artScale}) rotate(${card.artRotation}deg)`,
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
              onMouseDown={handleArtMouseDown}
              onMouseMove={handleArtMouseMove}
              onMouseUp={handleArtMouseUp}
              onMouseLeave={handleArtMouseUp}
              onWheel={handleWheel}
            />
          ) : null}

          {/* Active drag handler mask on the frame for smooth capture */}
          {card.artUrl && (
            <div
              className="absolute inset-0 z-10"
              onMouseDown={handleArtMouseDown}
              onMouseMove={handleArtMouseMove}
              onMouseUp={handleArtMouseUp}
              onMouseLeave={handleArtMouseUp}
              onWheel={handleWheel}
            />
          )}

          {!card.artUrl && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center gap-2 p-4 text-center text-slate-400 hover:text-blue-400 transition-colors cursor-pointer w-full h-full"
            >
              <Upload className="w-8 h-8 stroke-[1.5] text-blue-500 animate-pulse" />
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-200">Upload Card Artwork</span>
                <span className="text-[10px] text-slate-500">Drag & drop image, or browse</span>
              </div>
            </div>
          )}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />
        </div>

        {/* BOTTOM METADATA / TEXT / STATS BLOCK */}
        <div className="flex-1 flex flex-col justify-between z-10 relative mt-2 space-y-2 w-full">
          
          {/* DESCRIPTION BOX - Frosted Glass Layout */}
          <div
            id="card-description-box"
            className={`w-[350px] flex-1 min-h-[120px] mx-auto p-3 flex flex-col justify-between rounded-xl shadow-xl overflow-hidden text-slate-100 border ${frameConfig.descBg} ${frameConfig.panelBorder}`}
          >
            {/* Typeline and Rarity */}
            {card.showSubtype !== false && (
              <div id="card-typeline" className="text-[11px] font-bold tracking-wide text-blue-400 border-b border-white/5 pb-1 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  {renderInlineSelect(
                    "type",
                    card.type || "",
                    TYPE_OPTIONS,
                    "font-bold text-blue-400 text-[11px] hover:text-blue-300",
                    "Type"
                  )}
                  <span className="opacity-50 text-slate-500 mx-0.5">—</span>
                  {renderInlineEditable(
                    "monsterType",
                    card.monsterType || "",
                    "Species / Subtype",
                    "inline-block font-bold text-blue-400 text-[11px]"
                  )}
                </div>
                {renderInlineSelect(
                  "rarity",
                  card.rarity || "",
                  RARITY_OPTIONS,
                  "text-[9px] uppercase tracking-wider font-extrabold text-amber-400 hover:text-amber-300",
                  "Rarity"
                )}
              </div>
            )}

            {/* Description/Effect Text */}
            <div
              id="card-effect-text"
              className="text-[11px] font-normal leading-relaxed overflow-y-auto pr-0.5 flex-1 font-sans tracking-wide whitespace-pre-wrap select-text text-slate-300 py-1.5"
            >
              {renderInlineEditable(
                "cardText",
                card.cardText || "",
                "Enter card description or effects here...",
                "w-full text-[11px] leading-relaxed text-slate-300 font-sans tracking-wide font-normal",
                true
              )}

              {/* Dynamic Extra Custom Text Boxes rendered inside the scroll region */}
              {card.customTextBoxes && card.customTextBoxes.length > 0 && (
                <div className="mt-2 space-y-1.5 pt-2 border-t border-white/10">
                  {card.customTextBoxes.map((box) => (
                    <div key={box.id} className="text-[10px] leading-relaxed bg-black/40 p-2 rounded border border-white/5 space-y-1">
                      {renderInlineEditable(
                        `box_label_${box.id}`,
                        box.label,
                        "LABEL",
                        "font-extrabold text-blue-400 uppercase text-[9px] tracking-wider mb-0.5",
                        false,
                        (newLabel) => {
                          const updatedBoxes = (card.customTextBoxes || []).map((b) =>
                            b.id === box.id ? { ...b, label: newLabel } : b
                          );
                          onChangeCard({ customTextBoxes: updatedBoxes });
                        }
                      )}
                      {renderInlineEditable(
                        `box_text_${box.id}`,
                        box.text,
                        "Content...",
                        "text-slate-200 text-[10px]",
                        true,
                        (newText) => {
                          const updatedBoxes = (card.customTextBoxes || []).map((b) =>
                            b.id === box.id ? { ...b, text: newText } : b
                          );
                          onChangeCard({ customTextBoxes: updatedBoxes });
                        }
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Optional Flavor Text */}
            {card.showFlavorText !== false && (
              <div
                id="card-flavor-text"
                className="text-[10px] italic text-slate-400 border-t border-white/5 pt-1.5"
              >
                {renderInlineEditable(
                  "flavorText",
                  card.flavorText || "",
                  "Double-click/Tap to add flavor text...",
                  "italic text-slate-400 text-[10px] w-full block"
                )}
              </div>
            )}
          </div>

          {/* FULL-WIDTH STATS BOX DIRECTLY UNDERNEATH THE TEXT BOX */}
          <div
            id="card-stat-box"
            className={`w-[350px] mx-auto rounded-xl p-2.5 shadow-xl border flex items-center justify-around ${frameConfig.descBg} ${frameConfig.panelBorder} backdrop-blur-md transition-all`}
          >
            {/* ATTACK / STAT 1 BLOCK */}
            <div className="flex-1 flex items-center justify-center gap-2 border-r border-white/15 px-3 py-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-rose-400 bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 rounded shadow-sm">
                {renderInlineEditable(
                  "statLabel1",
                  card.statLabel1 || "ATK",
                  "Stat 1",
                  "text-[10px] font-black uppercase text-rose-400 tracking-wider"
                )}
              </span>
              <span className="text-base font-black text-white font-mono tracking-tight drop-shadow">
                {renderInlineEditable(
                  "atk",
                  card.atk !== undefined && card.atk !== "" ? card.atk : "0",
                  "ATK",
                  "text-base font-black text-white font-mono"
                )}
              </span>
            </div>

            {/* HP / STAT 2 BLOCK */}
            <div className="flex-1 flex items-center justify-center gap-2 px-3 py-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded shadow-sm">
                {renderInlineEditable(
                  "statLabel2",
                  card.statLabel2 || "HP",
                  "Stat 2",
                  "text-[10px] font-black uppercase text-emerald-400 tracking-wider"
                )}
              </span>
              <span className="text-base font-black text-white font-mono tracking-tight drop-shadow">
                {renderInlineEditable(
                  "def",
                  card.def !== undefined && card.def !== "" ? card.def : "0",
                  "HP",
                  "text-base font-black text-white font-mono"
                )}
              </span>
            </div>
          </div>

        </div>
      </div>
    </div>
  </div>

      {/* Export / Download controls */}
      <button
        id="btn-export-card"
        onClick={onExport}
        disabled={isExporting}
        className="mt-5 w-full max-w-[400px] py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-[#1E293B] disabled:text-slate-500 text-white font-bold rounded-xl shadow-lg hover:shadow-blue-500/10 transition-all duration-200 flex items-center justify-center gap-2 border border-blue-400/20 cursor-pointer text-sm"
      >
        {isExporting ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Exporting High Resolution Card...</span>
          </>
        ) : (
          <>
            <Upload className="w-4 h-4 rotate-180" />
            <span>Download High-Res PNG</span>
          </>
        )}
      </button>
    </div>
  );
}
