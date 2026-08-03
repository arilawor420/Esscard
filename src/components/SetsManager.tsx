import React, { useState } from "react";
import { Card, CardSet } from "../types";
import { Trash2, Edit2, Download, Search, Sparkles, FolderLock, PlusCircle, Printer, FileArchive, Loader2, Copy } from "lucide-react";

interface SetsManagerProps {
  cards: Card[];
  sets: CardSet[];
  activeSetId: string;
  onSetActiveSetId: (id: string) => void;
  onLoadCard: (card: Card) => void;
  onDeleteCard: (id: string) => void;
  onDeleteSet: (id: string) => void;
  onCreateSet: (name: string, desc: string) => Promise<CardSet | undefined>;
  onBatchExportZip?: (setId: string) => void;
  onBatchExportPrint?: (setId: string) => void;
  onDuplicateCard?: (card: Card) => void;
  isBatchExportingZip?: boolean;
  isBatchExportingPrint?: boolean;
}

export default function SetsManager({
  cards,
  sets,
  activeSetId,
  onSetActiveSetId,
  onLoadCard,
  onDeleteCard,
  onDeleteSet,
  onCreateSet,
  onBatchExportZip,
  onBatchExportPrint,
  onDuplicateCard,
  isBatchExportingZip = false,
  isBatchExportingPrint = false,
}: SetsManagerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreatingSet, setIsCreatingSet] = useState(false);
  const [newSetName, setNewSetName] = useState("");
  const [newSetDesc, setNewSetDesc] = useState("");

  const activeSet = sets.find((s) => s.id === activeSetId);

  // Filter cards by selected set and search query
  const filteredCards = cards.filter((card) => {
    const matchesSet = activeSetId ? card.setId === activeSetId : true;
    const matchesSearch = searchTerm
      ? card.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        card.monsterType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        card.cardText.toLowerCase().includes(searchTerm.toLowerCase())
      : true;
    return matchesSet && matchesSearch;
  });

  const handleCreateSetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSetName.trim()) return;
    const created = await onCreateSet(newSetName, newSetDesc);
    if (created) {
      setNewSetName("");
      setNewSetDesc("");
      setIsCreatingSet(false);
    }
  };

  const handleExportSetJSON = () => {
    if (!activeSet) return;
    const setCards = cards.filter((c) => c.setId === activeSetId);
    const dataStr = JSON.stringify({ set: activeSet, cards: setCards }, null, 2);
    const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);

    const exportFileDefaultName = `set-${activeSet.name.toLowerCase().replace(/\s+/g, "-")}.json`;

    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", exportFileDefaultName);
    linkElement.click();
  };

  const handleDeleteSetConfirm = () => {
    if (!activeSet) return;
    const confirmed = window.confirm(
      `Are you sure you want to delete the set "${activeSet.name}"? All cards in this set will be unlinked (but not deleted). This cannot be undone.`
    );
    if (confirmed) {
      onDeleteSet(activeSetId);
    }
  };

  const handleDeleteCardConfirm = (e: React.MouseEvent, cardId: string, cardName: string) => {
    e.stopPropagation(); // Avoid loading the card when clicking delete
    const confirmed = window.confirm(`Are you sure you want to permanently delete the card "${cardName}"? This action cannot be undone.`);
    if (confirmed) {
      onDeleteCard(cardId);
    }
  };

  // Helper to determine Card Thumbnail Background - High Density Premium Look
  const getThumbBorderColor = (frameType: string) => {
    switch (frameType) {
      case "Earth":
        return "border-emerald-600/50 bg-[#0d261e]/60 text-emerald-100 hover:border-emerald-500";
      case "Water":
        return "border-blue-600/50 bg-[#0c1626]/60 text-blue-100 hover:border-blue-500";
      case "Wind":
        return "border-cyan-600/50 bg-[#07242b]/60 text-cyan-100 hover:border-cyan-500";
      case "Fire":
        return "border-red-600/50 bg-[#2d1212]/60 text-red-100 hover:border-red-500";
      case "Life":
        return "border-yellow-600/50 bg-[#2d2214]/60 text-yellow-100 hover:border-yellow-500";
      case "Death":
        return "border-purple-600/50 bg-[#201530]/60 text-purple-100 hover:border-purple-500";
      case "Time":
        return "border-rose-600/50 bg-[#2b0f1a]/60 text-rose-100 hover:border-rose-500";
      case "Space":
        return "border-indigo-600/50 bg-[#14152e]/60 text-indigo-100 hover:border-[#6366f1]";
      default:
        return "border-[#334155] bg-[#1E293B]/60 text-slate-100 hover:border-blue-500";
    }
  };

  return (
    <div id="sets-manager-container" className="bg-[#161B22] border border-[#334155] rounded-2xl p-6 shadow-xl text-slate-100 space-y-6">
      {/* Set Header Management */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#334155] pb-5">
        <div>
          <h2 className="text-lg font-bold text-blue-400 flex items-center gap-2">
            <FolderLock className="w-5 h-5 text-blue-400" />
            <span>Saved Card Sets Database</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            Manage your card collections, search saved drafts, and backup your creations.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {activeSet && (
            <>
              {onBatchExportZip && (
                <button
                  disabled={isBatchExportingZip || cards.filter((c) => c.setId === activeSetId).length === 0}
                  onClick={() => onBatchExportZip(activeSetId)}
                  className="px-3 py-2 bg-indigo-950/40 hover:bg-indigo-900/40 disabled:bg-[#1E293B]/40 border border-indigo-900/40 disabled:border-[#334155] text-indigo-300 disabled:text-slate-500 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed transition-colors"
                  title="Download all cards in this set as high-res PNG ZIP"
                >
                  {isBatchExportingZip ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <FileArchive className="w-3.5 h-3.5" />
                  )}
                  <span>Export ZIP</span>
                </button>
              )}
              {onBatchExportPrint && (
                <button
                  disabled={isBatchExportingPrint || cards.filter((c) => c.setId === activeSetId).length === 0}
                  onClick={() => onBatchExportPrint(activeSetId)}
                  className="px-3 py-2 bg-emerald-950/40 hover:bg-emerald-900/40 disabled:bg-[#1E293B]/40 border border-emerald-900/40 disabled:border-[#334155] text-emerald-300 disabled:text-slate-500 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed transition-colors"
                  title="Print standard 2.5 x 3.5 inch cards in 3x3 sheets"
                >
                  {isBatchExportingPrint ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Printer className="w-3.5 h-3.5" />
                  )}
                  <span>Print 3x3 Grid</span>
                </button>
              )}
              <button
                onClick={handleExportSetJSON}
                className="px-3 py-2 bg-[#1E293B] hover:bg-[#334155] rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-[#334155] text-slate-200 cursor-pointer transition-colors"
                title="Backup Set as JSON File"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Backup JSON</span>
              </button>
              <button
                onClick={handleDeleteSetConfirm}
                className="px-3 py-2 bg-red-950/20 hover:bg-red-950/40 border border-red-900/30 rounded-lg text-xs font-semibold text-red-400 flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Delete Set"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Set</span>
              </button>
            </>
          )}

          <button
            onClick={() => setIsCreatingSet(!isCreatingSet)}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow-md"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>New Set</span>
          </button>
        </div>
      </div>

      {/* New Set Form */}
      {isCreatingSet && (
        <form onSubmit={handleCreateSetSubmit} className="bg-[#0F1115]/50 p-5 rounded-xl border border-dashed border-[#334155] space-y-4">
          <h3 className="text-sm font-bold text-blue-400">Create New Collection Set</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Set Name</label>
              <input
                type="text"
                required
                value={newSetName}
                onChange={(e) => setNewSetName(e.target.value)}
                placeholder="e.g. Champions Odyssey"
                className="w-full bg-[#0F1115] border border-[#334155] rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500 text-slate-100"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Set Description</label>
              <input
                type="text"
                value={newSetDesc}
                onChange={(e) => setNewSetDesc(e.target.value)}
                placeholder="e.g. Custom collectible card set..."
                className="w-full bg-[#0F1115] border border-[#334155] rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500 text-slate-100"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 text-xs pt-1">
            <button
              type="button"
              onClick={() => setIsCreatingSet(false)}
              className="px-4 py-2 bg-[#1E293B] border border-[#334155] rounded-lg hover:bg-[#334155] text-slate-400 cursor-pointer"
            >
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-500 cursor-pointer">
              Create Set
            </button>
          </div>
        </form>
      )}

      {/* Set Selector & Search bar */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="w-full md:w-1/3">
          <select
            value={activeSetId}
            onChange={(e) => onSetActiveSetId(e.target.value)}
            className="w-full bg-[#0F1115] border border-[#334155] rounded-xl p-3 text-sm focus:outline-none focus:border-blue-500 font-semibold text-slate-200"
          >
            <option value="" className="bg-[#161B22]">All Saved Card Sets ({sets.length})</option>
            {sets.map((s) => (
              <option key={s.id} value={s.id} className="bg-[#161B22]">
                {s.name} ({cards.filter((c) => c.setId === s.id).length} cards)
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-[50%] translate-y-[-50%] w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search cards in this collection..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#0F1115] border border-[#334155] rounded-xl py-3 pl-10 pr-4 text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 text-slate-100"
          />
        </div>
      </div>

      {/* Cards List Grid */}
      {filteredCards.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 pt-2">
          {filteredCards.map((card) => (
            <div
              key={card.id}
              onClick={() => onLoadCard(card)}
              className={`border-2 rounded-xl p-3 cursor-pointer hover:shadow-lg transition-all flex flex-col justify-between h-[210px] group ${getThumbBorderColor(
                card.frameType
              )}`}
            >
              <div className="space-y-1.5">
                <div className="flex items-start justify-between">
                  <h4 className="font-extrabold text-sm truncate max-w-[110px] leading-snug group-hover:text-blue-400 transition-colors">
                    {card.name}
                  </h4>
                  <span className="text-[9px] font-black uppercase tracking-tighter opacity-80 px-1 py-[1px] rounded bg-[#0F1115]/80 border border-[#334155] text-slate-300">
                    {card.attribute !== "NONE" ? card.attribute : card.type}
                  </span>
                </div>

                {/* Level / Rating info */}
                {card.level > 0 && (
                  <div className="text-[10px] text-slate-400 font-bold">
                    ★ {card.level}
                  </div>
                )}
              </div>

              {/* Artwork thumbnail frame */}
              <div className="w-full h-20 bg-[#0F1115] border border-[#334155]/60 rounded overflow-hidden relative flex items-center justify-center my-1.5">
                {card.artUrl ? (
                  <img
                    src={card.artUrl}
                    alt={card.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                    style={{
                      transform: `translate(${card.artX * 0.25}px, ${card.artY * 0.25}px) scale(${card.artScale}) rotate(${card.artRotation}deg)`,
                    }}
                  />
                ) : (
                  <Sparkles className="w-5 h-5 text-slate-700" />
                )}
              </div>

              {/* Bottom stats and delete trigger */}
              <div className="flex items-center justify-between text-[11px] font-mono leading-none pt-1">
                <div className="font-semibold text-slate-400 text-[10px] truncate max-w-[120px]">
                  {card.type === "Conjuring" && (card.atk || card.def) ? (
                    <span>
                      {card.atk || "0"}/{card.def || "0"}
                    </span>
                  ) : (
                    <span className="italic truncate block">{card.monsterType}</span>
                  )}
                </div>

                <div className="flex gap-1">
                  {onDuplicateCard && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDuplicateCard(card);
                      }}
                      className="p-1 hover:bg-emerald-500/15 hover:text-emerald-400 rounded text-slate-400 cursor-pointer transition-colors"
                      title="Duplicate/Clone Card"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onLoadCard(card);
                    }}
                    className="p-1 hover:bg-blue-500/15 hover:text-blue-400 rounded text-slate-400 cursor-pointer transition-colors"
                    title="Load/Edit Card"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => handleDeleteCardConfirm(e, card.id, card.name)}
                    className="p-1 hover:bg-red-500/15 hover:text-red-400 rounded text-slate-400 cursor-pointer transition-colors"
                    title="Delete Card"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-10 bg-[#0F1115]/30 rounded-xl border border-dashed border-[#334155] flex flex-col items-center justify-center gap-2.5">
          <Sparkles className="w-8 h-8 text-slate-700" />
          <div className="text-xs text-slate-400">
            {searchTerm ? "No matching cards found for this query." : "No cards in this collection set yet."}
          </div>
        </div>
      )}
    </div>
  );
}
