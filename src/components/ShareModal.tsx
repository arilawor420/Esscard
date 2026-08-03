import React, { useState } from "react";
import { Card } from "../types";
import {
  Share2,
  Copy,
  Check,
  Download,
  Link,
  Code,
  Image as ImageIcon,
  X,
  ExternalLink,
} from "lucide-react";
import * as htmlToImage from "html-to-image";

interface ShareModalProps {
  card: Card;
  isOpen: boolean;
  onClose: () => void;
  onExportPNG: () => void;
}

export default function ShareModal({
  card,
  isOpen,
  onClose,
  onExportPNG,
}: ShareModalProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);
  const [isCapturingImage, setIsCapturingImage] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  if (!isOpen) return null;

  // Generate shareable URL with encoded card payload
  const getShareableUrl = () => {
    try {
      const payload = JSON.stringify(card);
      const encoded = btoa(encodeURIComponent(payload));
      const url = new URL(window.location.href);
      url.searchParams.set("card", encoded);
      return url.toString();
    } catch {
      return window.location.href;
    }
  };

  const handleCopyLink = async () => {
    const url = getShareableUrl();
    await navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setStatusMessage("Share link copied to clipboard!");
    setTimeout(() => {
      setCopiedLink(false);
      setStatusMessage("");
    }, 3000);
  };

  const handleCopyJSON = async () => {
    const jsonStr = JSON.stringify(card, null, 2);
    await navigator.clipboard.writeText(jsonStr);
    setCopiedJson(true);
    setStatusMessage("Card JSON schema copied to clipboard!");
    setTimeout(() => {
      setCopiedJson(false);
      setStatusMessage("");
    }, 3000);
  };

  const handleCopyImageToClipboard = async () => {
    const cardEl = document.getElementById("card-stage");
    if (!cardEl) {
      alert("Card canvas preview element not found.");
      return;
    }

    setIsCapturingImage(true);
    try {
      const dataUrl = await htmlToImage.toPng(cardEl, {
        pixelRatio: 2,
        cacheBust: true,
      });

      const res = await fetch(dataUrl);
      const blob = await res.blob();

      if (navigator.clipboard && typeof ClipboardItem !== "undefined") {
        await navigator.clipboard.write([
          new ClipboardItem({
            [blob.type]: blob,
          }),
        ]);
        setCopiedImage(true);
        setStatusMessage("Card image copied to clipboard! Ready to paste.");
        setTimeout(() => {
          setCopiedImage(false);
          setStatusMessage("");
        }, 3000);
      } else {
        alert("Direct image clipboard copying is not supported on this browser. Use Export PNG instead.");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to copy image to clipboard.");
    } finally {
      setIsCapturingImage(false);
    }
  };

  const handleNativeShare = async () => {
    const shareUrl = getShareableUrl();
    const shareTitle = `Trading Card: ${card.name || "Untitled Card"}`;
    const shareText = `Check out this trading card design for "${card.name || "Custom Card"}"!`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
      } catch (err) {
        // User cancelled or share failed
        console.log("Native share dismissed", err);
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0F1115]/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#161B22] border border-[#334155] rounded-2xl max-w-lg w-full p-6 shadow-2xl text-[#E2E8F0] space-y-5 relative animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#334155] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Share & Export Card</h3>
              <p className="text-xs text-slate-400">
                "{card.name || "Untitled Card"}" • {card.type || "Custom"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-[#1E293B] text-slate-400 hover:text-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Toast Notification */}
        {statusMessage && (
          <div className="bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs px-3.5 py-2 rounded-xl flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold">{statusMessage}</span>
          </div>
        )}

        {/* Action Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Export PNG */}
          <button
            onClick={() => {
              onExportPNG();
              onClose();
            }}
            className="p-4 bg-[#0F1115] hover:bg-[#1E293B] border border-[#334155] hover:border-blue-500/50 rounded-xl text-left transition-all flex flex-col justify-between gap-3 group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <span className="block text-xs font-bold text-slate-200">Download PNG</span>
              <span className="text-[10px] text-slate-400">300 DPI High-Res Image</span>
            </div>
          </button>

          {/* Copy Image to Clipboard */}
          <button
            disabled={isCapturingImage}
            onClick={handleCopyImageToClipboard}
            className="p-4 bg-[#0F1115] hover:bg-[#1E293B] border border-[#334155] hover:border-emerald-500/50 rounded-xl text-left transition-all flex flex-col justify-between gap-3 group cursor-pointer disabled:opacity-50"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
              {copiedImage ? <Check className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
            </div>
            <div>
              <span className="block text-xs font-bold text-slate-200">Copy Card Image</span>
              <span className="text-[10px] text-slate-400">Paste directly into apps</span>
            </div>
          </button>

          {/* Copy Shareable Link */}
          <button
            onClick={handleCopyLink}
            className="p-4 bg-[#0F1115] hover:bg-[#1E293B] border border-[#334155] hover:border-indigo-500/50 rounded-xl text-left transition-all flex flex-col justify-between gap-3 group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
              {copiedLink ? <Check className="w-4 h-4" /> : <Link className="w-4 h-4" />}
            </div>
            <div>
              <span className="block text-xs font-bold text-slate-200">Copy Share Link</span>
              <span className="text-[10px] text-slate-400">URL with card design data</span>
            </div>
          </button>

          {/* Copy JSON schema */}
          <button
            onClick={handleCopyJSON}
            className="p-4 bg-[#0F1115] hover:bg-[#1E293B] border border-[#334155] hover:border-amber-500/50 rounded-xl text-left transition-all flex flex-col justify-between gap-3 group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
              {copiedJson ? <Check className="w-4 h-4" /> : <Code className="w-4 h-4" />}
            </div>
            <div>
              <span className="block text-xs font-bold text-slate-200">Copy Card JSON</span>
              <span className="text-[10px] text-slate-400">Export raw data specification</span>
            </div>
          </button>
        </div>

        {/* Native Web Share Drawer Button */}
        {"share" in navigator && (
          <button
            onClick={handleNativeShare}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md shadow-blue-500/10"
          >
            <Share2 className="w-4 h-4" />
            <span>Open System Share Menu</span>
          </button>
        )}

        {/* Direct Link Preview Bar */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Shareable URL Link
          </label>
          <div className="flex items-center gap-2 bg-[#0F1115] p-2 rounded-xl border border-[#334155]">
            <input
              type="text"
              readOnly
              value={getShareableUrl()}
              className="bg-transparent text-xs text-slate-400 flex-1 outline-none px-2 font-mono truncate"
            />
            <button
              onClick={handleCopyLink}
              className="px-3 py-1.5 bg-[#1E293B] hover:bg-[#334155] text-blue-400 text-xs font-bold rounded-lg border border-[#334155] transition-colors flex items-center gap-1 cursor-pointer shrink-0"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? "Copied" : "Copy"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
