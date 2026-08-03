import React, { useState, useEffect } from "react";
import { Card, CardSet, FrameType, AttributeType } from "../types";
import {
  CARD_TYPES,
  FRAME_TYPES,
  ATTRIBUTES,
  GENRES,
  RARITIES,
  EDITIONS,
} from "../data";
import {
  Sparkles,
  Save,
  Link2,
  FolderPlus,
  RefreshCw,
  LogOut,
  FileSpreadsheet,
  ShieldCheck,
  Eye,
  Dice5,
} from "lucide-react";
import { googleSignIn, logout } from "../lib/firebase";
import { createSetSpreadsheet, syncSetToSpreadsheet } from "../lib/sheets";
import { User } from "firebase/auth";

interface ControlPanelProps {
  card: Card;
  onChangeCard: (updated: Partial<Card>) => void;
  onSaveCard: () => void;
  onNewCard: () => void;
  activeSetId: string;
  onSetActiveSetId: (id: string) => void;
  sets: CardSet[];
  onCreateSet: (name: string, desc: string) => Promise<CardSet | undefined>;
  user: User | null;
  setUser: (user: User | null) => void;
  token: string | null;
  setToken: (token: string | null) => void;
  isSaving: boolean;
}

const CREATIVE_MESSAGES = [
  "Summoning the cosmic brush...",
  "Drafting mystical illustrations...",
  "Infusing elemental mana into art...",
  "Channelling ancient magic circles...",
  "Polishing the card's high-res details...",
];

export default function ControlPanel({
  card,
  onChangeCard,
  onSaveCard,
  onNewCard,
  activeSetId,
  onSetActiveSetId,
  sets,
  onCreateSet,
  user,
  setUser,
  token,
  setToken,
  isSaving,
}: ControlPanelProps) {
  const [activeTab, setActiveTab] = useState<"identity" | "stats" | "meta" | "ai" | "sync">("identity");

  // AI Art Generation States
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiRatio, setAiRatio] = useState("1:1");
  const [isGeneratingArt, setIsGeneratingArt] = useState(false);
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);
  const [aiError, setAiError] = useState("");

  // Set Creation States
  const [isCreatingSet, setIsCreatingSet] = useState(false);
  const [newSetName, setNewSetName] = useState("");
  const [newSetDesc, setNewSetDesc] = useState("");

  // Google Sheets integration States
  const [isConnectingSheet, setIsConnectingSheet] = useState(false);
  const [sheetStatus, setSheetStatus] = useState("");

  // Cycle reassuring loading messages during image generation
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isGeneratingArt) {
      interval = setInterval(() => {
        setLoadingMsgIndex((prev) => (prev + 1) % CREATIVE_MESSAGES.length);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isGeneratingArt]);

  // Set initial default prompt draft based on card attributes and style
  const handleAutoDraftPrompt = () => {
    if (!card.name) {
      setAiError("Please set a card name first to draft a prompt.");
      return;
    }
    setAiError("");

    let designStyle = "highly detailed, vivid colors, digital painting, fantasy game card art, masterpiece";
    if (card.frameType === "Cosmic") {
      designStyle = "cyberpunk retro sci-fi space art, deep dark starfield galaxy background, neon glowing lines, synthwave futuristic digital art";
    } else if (card.frameType === "Metal") {
      designStyle = "industrial sci-fi mecha style, metallic plating, steel highlights, highly detailed blueprint aesthetic, dramatic high contrast lighting";
    } else if (card.frameType === "Fire") {
      designStyle = "magical volcanic flame sorcery, blazing molten lava, deep red glowing background, epic high fantasy illustration";
    } else if (card.frameType === "Water") {
      designStyle = "beautiful underwater crystal ocean scenery, deep blue water waves, floating bubbles, serene digital fantasy painting";
    } else if (card.frameType === "Nature") {
      designStyle = "enchanted ancient forest, sunbeams breaking through massive green leaves, glowing wild nature energy, mystical RPG art";
    } else if (card.frameType === "Void") {
      designStyle = "abyssal shadow purple void, cosmic dark vortex, neon glowing magic runes, ethereal wizard sorcery illustration";
    }

    const basePrompt = `A premium professional trading card illustration of "${card.name}" (${card.monsterType || "Entity"}). Scene description: ${card.cardText || "glowing fantasy scenery"}. Artistic style: ${designStyle}`;
    setAiPrompt(basePrompt);
  };

  const handleGenerateAIArt = async () => {
    if (!aiPrompt) {
      setAiError("Please enter a text prompt for the artwork.");
      return;
    }

    setIsGeneratingArt(true);
    setLoadingMsgIndex(0);
    setAiError("");

    try {
      const response = await fetch("/api/gemini/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: aiPrompt,
          aspectRatio: aiRatio,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to generate image.");
      }

      onChangeCard({ artUrl: data.url, artScale: 1.0, artX: 0, artY: 0, artRotation: 0 });
    } catch (err: any) {
      console.error(err);
      setAiError(err.message || "Something went wrong generating art.");
    } finally {
      setIsGeneratingArt(false);
    }
  };

  // Google Sheets Authentication & Connection Handler
  const handleGoogleSignIn = async () => {
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
      }
    } catch (err) {
      console.error("Sign in failed:", err);
    }
  };

  const handleGoogleSignOut = async () => {
    try {
      await logout();
      setUser(null);
      setToken(null);
    } catch (err) {
      console.error("Sign out failed:", err);
    }
  };

  const handleCreateAndLinkSheet = async () => {
    if (!token) return;
    const currentSet = sets.find((s) => s.id === activeSetId);
    if (!currentSet) {
      alert("Please select or create a card set first.");
      return;
    }

    setIsConnectingSheet(true);
    setSheetStatus("Creating new Google Spreadsheet...");

    try {
      const result = await createSetSpreadsheet(token, currentSet.name);

      // Update current card set in backend
      currentSet.sheetId = result.id;
      currentSet.sheetUrl = result.url;
      currentSet.sheetName = `Trading Card Maker - Set: ${currentSet.name}`;

      const res = await fetch("/api/sets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(currentSet),
      });

      if (!res.ok) {
        throw new Error("Failed to save connected sheet to backend database.");
      }

      setSheetStatus("Google Sheet linked successfully!");
      alert(`Linked! Sheet created:\n"${currentSet.sheetName}"`);
    } catch (err: any) {
      console.error(err);
      setSheetStatus(`Error linking sheet: ${err.message}`);
    } finally {
      setIsConnectingSheet(false);
    }
  };

  const handleForceSyncSet = async () => {
    if (!token) return;
    const currentSet = sets.find((s) => s.id === activeSetId);
    if (!currentSet || !currentSet.sheetId) {
      alert("No Google Sheet linked for this set.");
      return;
    }

    setIsConnectingSheet(true);
    setSheetStatus("Syncing entire card collection...");

    try {
      // Fetch all cards for this set
      const response = await fetch("/api/cards");
      const db = await response.json();
      const setCards = db.cards.filter((c: Card) => c.setId === activeSetId);

      await syncSetToSpreadsheet(token, currentSet.sheetId, setCards);
      setSheetStatus("All cards synced successfully!");
      alert(`Success! Synced ${setCards.length} cards to "${currentSet.sheetName}".`);
    } catch (err: any) {
      console.error(err);
      setSheetStatus(`Error during full sync: ${err.message}`);
    } finally {
      setIsConnectingSheet(false);
    }
  };

  const handleCreateNewSet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSetName.trim()) return;
    const createdSet = await onCreateSet(newSetName, newSetDesc);
    if (createdSet) {
      setNewSetName("");
      setNewSetDesc("");
      setIsCreatingSet(false);
    }
  };

  const activeSet = sets.find((s) => s.id === activeSetId);

  // Auto update stats labels on card type selection for quick layout ease
  const handleCardTypeChange = (newType: string) => {
    let defaultFrame = "Space";
    let defaultAttr = "Earth";
    let defaultLabel1 = "ATK";
    let defaultLabel2 = "HP";
    let subtypePreset = "Generic Sub-type";
    let costStr = "2 Earth Essence";

    if (newType === "Conjuring") {
      defaultFrame = "Fire";
      defaultAttr = "Fire";
      defaultLabel1 = "ATK";
      defaultLabel2 = "HP";
      subtypePreset = "Conjuring - Fire Elemental";
      costStr = "3 Fire Essence";
    } else if (newType === "Pillar") {
      defaultFrame = "Earth";
      defaultAttr = "Earth";
      defaultLabel1 = "ATK";
      defaultLabel2 = "HP";
      subtypePreset = "Pillar - Earth Spire";
      costStr = "2 Earth Essence";
    } else if (newType === "Rune") {
      defaultFrame = "Death";
      defaultAttr = "Death";
      defaultLabel1 = "ATK";
      defaultLabel2 = "HP";
      subtypePreset = "Rune - Dark Glyph";
      costStr = "1 Death Essence";
    } else if (newType === "Shield") {
      defaultFrame = "Water";
      defaultAttr = "Water";
      defaultLabel1 = "ATK";
      defaultLabel2 = "HP";
      subtypePreset = "Shield - Frost Barrier";
      costStr = "2 Water Essence";
    } else if (newType === "Casting") {
      defaultFrame = "Wind";
      defaultAttr = "Wind";
      defaultLabel1 = "ATK";
      defaultLabel2 = "HP";
      subtypePreset = "Casting - Gale Blast";
      costStr = "1 Wind Essence";
    }

    onChangeCard({
      type: newType,
      frameType: defaultFrame,
      attribute: defaultAttr,
      statLabel1: defaultLabel1,
      statLabel2: defaultLabel2,
      monsterType: subtypePreset,
      cost: costStr,
    });
  };

  const handleQuickGenreSelect = (genreValue: string) => {
    let frame: FrameType = "Space";
    let label1 = "ATK";
    let label2 = "HP";
    let costStr = "3 Fire Essence";
    let typeline = "Conjuring - Fire Elemental";

    if (genreValue === "fantasy") {
      frame = "Fire";
      label1 = "ATK";
      label2 = "HP";
      costStr = "3 Fire Essence";
      typeline = "Conjuring - Flame Sentinel";
    } else if (genreValue === "scifi") {
      frame = "Space";
      label1 = "ATK";
      label2 = "HP";
      costStr = "2 Space Essence";
      typeline = "Shield - Starlight Ward";
    } else if (genreValue === "custom") {
      frame = "Time";
      label1 = "ATK";
      label2 = "HP";
      costStr = "1 Time Essence";
      typeline = "Rune - Chrono Sigil";
    }

    onChangeCard({
      genre: genreValue,
      frameType: frame,
      statLabel1: label1,
      statLabel2: label2,
      cost: costStr,
      monsterType: typeline,
    });
  };

  return (
    <div id="control-panel-card" className="bg-[#161B22] border border-[#334155] rounded-2xl shadow-2xl p-6 flex flex-col h-full text-[#E2E8F0]">
      {/* Tab Navigation header */}
      <div className="flex border-b border-[#334155] mb-6 overflow-x-auto gap-1">
        {(["identity", "stats", "meta", "template", "ai", "sync"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all whitespace-nowrap capitalize cursor-pointer ${
              activeTab === tab
                ? "border-blue-500 text-blue-400 bg-[#0F1115]/40"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            {tab === "ai" ? "🤖 AI Image" : tab === "sync" ? "🟢 Sheets Sync" : tab === "identity" ? "📁 Identity" : tab === "stats" ? "📊 Stats & Text" : tab === "template" ? "🎨 Custom Template" : "🏷️ Meta"}
          </button>
        ))}
      </div>

      {/* ACTIVE TAB CONTENT */}
      <div className="flex-1 overflow-y-auto pr-1 min-h-[380px] max-h-[480px]">
        {/* IDENTITY TAB */}
        {activeTab === "identity" && (
          <div className="space-y-5">
            {/* Set Selection */}
            <div className="flex items-end gap-3 bg-[#0F1115]/40 p-4 rounded-xl border border-[#334155]">
              <div className="flex-1">
                <label className="block text-xs font-bold text-blue-400 uppercase tracking-wider mb-1.5">
                  Target Card Set
                </label>
                <select
                  value={activeSetId}
                  onChange={(e) => onSetActiveSetId(e.target.value)}
                  className="w-full bg-[#0F1115] border border-[#334155] rounded-lg p-2.5 text-sm font-semibold focus:outline-none focus:border-blue-500 text-slate-100"
                >
                  <option value="" className="bg-[#161B22]">-- Select Set --</option>
                  {sets.map((s) => (
                    <option key={s.id} value={s.id} className="bg-[#161B22]">
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => setIsCreatingSet(true)}
                className="p-2.5 bg-[#1E293B] border border-[#334155] hover:bg-[#334155] rounded-lg text-blue-400 transition-colors cursor-pointer"
                title="Create New Card Set"
              >
                <FolderPlus className="w-5 h-5" />
              </button>
            </div>

            {/* Set Creation expand */}
            {isCreatingSet && (
              <form onSubmit={handleCreateNewSet} className="bg-[#0F1115]/50 p-4 rounded-xl border border-dashed border-[#334155] space-y-3">
                <h3 className="text-sm font-bold text-blue-400">Create New Collection Set</h3>
                <div>
                  <input
                    type="text"
                    required
                    placeholder="Set Name (e.g., Champions Odyssey)"
                    value={newSetName}
                    onChange={(e) => setNewSetName(e.target.value)}
                    className="w-full bg-[#0F1115] border border-[#334155] rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <textarea
                    placeholder="Set description..."
                    rows={2}
                    value={newSetDesc}
                    onChange={(e) => setNewSetDesc(e.target.value)}
                    className="w-full bg-[#0F1115] border border-[#334155] rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 resize-none"
                  />
                </div>
                <div className="flex justify-end gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setIsCreatingSet(false)}
                    className="px-3 py-1.5 bg-[#1E293B] border border-[#334155] rounded hover:bg-[#334155] text-slate-400 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-blue-600 text-white rounded font-bold hover:bg-blue-500 cursor-pointer"
                  >
                    Create Set
                  </button>
                </div>
              </form>
            )}

            {/* Card Genre / Preset Auto-configurer */}
            <div className="bg-[#0F1115]/20 p-3.5 rounded-xl border border-[#334155]/60 space-y-2">
              <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                ⚡ Quick Genre Preset Sync
              </span>
              <div className="grid grid-cols-2 gap-2">
                {GENRES.map((g) => (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => handleQuickGenreSelect(g.value)}
                    className={`py-1.5 px-2.5 text-xs font-semibold rounded-lg border transition-all text-left truncate flex items-center justify-between cursor-pointer ${
                      card.genre === g.value
                        ? "bg-blue-500/10 border-blue-500 text-blue-400 font-bold"
                        : "bg-[#0F1115]/30 border-[#334155] text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <span>{g.label.split(" / ")[0]}</span>
                    <Sparkles className="w-3 h-3 text-blue-500 opacity-60" />
                  </button>
                ))}
              </div>
            </div>

            {/* Card Name */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Card Name
              </label>
              <input
                type="text"
                value={card.name}
                onChange={(e) => onChangeCard({ name: e.target.value })}
                className="w-full bg-[#0F1115] border border-[#334155] rounded-xl p-3 text-sm font-bold text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 shadow-inner"
                placeholder="e.g. Ignis Primus"
              />
            </div>

            {/* Card Type Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Card Type
              </label>
              <div className="grid grid-cols-3 gap-2">
                {CARD_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleCardTypeChange(type)}
                    className={`py-2 px-1 text-xs font-bold border-2 rounded-xl transition-all cursor-pointer truncate ${
                      card.type === type
                        ? "bg-blue-500/10 border-blue-500 text-blue-400"
                        : "bg-[#0F1115]/40 border-[#334155] text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Frame Type / Style selection */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Visual Frame Theme (Artwork Border)
              </label>
              <select
                value={card.frameType}
                onChange={(e) => onChangeCard({ frameType: e.target.value })}
                className="w-full bg-[#0F1115] border border-[#334155] rounded-xl p-3 text-sm focus:outline-none focus:border-blue-500 text-slate-200 font-semibold"
              >
                {FRAME_TYPES.map((f) => (
                  <option key={f.value} value={f.value} className="bg-[#161B22]">
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Elements / Tags */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Card Essence
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {ATTRIBUTES.map((attr) => (
                  <button
                    key={attr.value}
                    type="button"
                    onClick={() => onChangeCard({ attribute: attr.value })}
                    className={`py-2 px-1 text-[10px] font-black border rounded-lg transition-all text-center leading-none cursor-pointer truncate ${
                      card.attribute === attr.value
                        ? "bg-blue-500/15 border-blue-500 text-blue-400 shadow-md"
                        : "bg-[#0F1115]/40 border-[#334155] text-slate-400 hover:text-slate-300"
                    }`}
                  >
                    {attr.label.split(" (")[0]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STATS & TEXT TAB */}
        {activeTab === "stats" && (
          <div className="space-y-5">
            {/* Card Essence Cost block */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Card Essence Cost
              </label>
              <input
                type="text"
                value={card.cost || ""}
                onChange={(e) => onChangeCard({ cost: e.target.value })}
                placeholder="e.g. 3 Fire Essence"
                className="w-full bg-[#0F1115] border border-[#334155] rounded-xl p-3 text-sm focus:outline-none focus:border-blue-500 text-slate-100 font-semibold"
              />
            </div>

            {/* Custom Subtype / Typeline */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Card Typeline / Species Label
              </label>
              <input
                type="text"
                value={card.monsterType}
                onChange={(e) => onChangeCard({ monsterType: e.target.value })}
                placeholder="e.g. Creature - Sorcerer, Unit - Spaceship"
                className="w-full bg-[#0F1115] border border-[#334155] rounded-xl p-3 text-sm focus:outline-none focus:border-blue-500 text-slate-100 font-semibold"
              />
            </div>

            {/* Customizable Stats Block */}
            {card.type === "Conjuring" ? (
              <div className="bg-[#0F1115]/30 p-4 rounded-xl border border-[#334155] space-y-4">
                <span className="block text-xs font-bold text-blue-400 uppercase tracking-wider">
                  📊 Combat Metrics (Conjuring Only)
                </span>
                <div className="grid grid-cols-2 gap-4">
                  {/* Stat 1 */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Label 1</label>
                      <button
                        type="button"
                        onClick={() => onChangeCard({ statLabel1: "ATK" })}
                        className="text-[9px] text-blue-400 font-semibold hover:underline"
                      >
                        ATK
                      </button>
                    </div>
                    <input
                      type="text"
                      maxLength={10}
                      placeholder="e.g. ATK"
                      value={card.statLabel1 || "ATK"}
                      onChange={(e) => onChangeCard({ statLabel1: e.target.value.toUpperCase() })}
                      className="w-full bg-[#0F1115] border border-[#334155] rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-bold"
                    />
                    <input
                      type="text"
                      placeholder="ATK Value (e.g. 6)"
                      value={card.atk}
                      onChange={(e) => onChangeCard({ atk: e.target.value })}
                      className="w-full bg-[#0F1115] border border-[#334155] rounded-lg p-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>

                  {/* Stat 2 */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Label 2</label>
                      <button
                        type="button"
                        onClick={() => onChangeCard({ statLabel2: "HP" })}
                        className="text-[9px] text-blue-400 font-semibold hover:underline"
                      >
                        HP
                      </button>
                    </div>
                    <input
                      type="text"
                      maxLength={10}
                      placeholder="e.g. HP"
                      value={card.statLabel2 || "HP"}
                      onChange={(e) => onChangeCard({ statLabel2: e.target.value.toUpperCase() })}
                      className="w-full bg-[#0F1115] border border-[#334155] rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-bold"
                    />
                    <input
                      type="text"
                      placeholder="HP Value (e.g. 5)"
                      value={card.def}
                      onChange={(e) => onChangeCard({ def: e.target.value })}
                      className="w-full bg-[#0F1115] border border-[#334155] rounded-lg p-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-[#0F1115]/10 p-4 rounded-xl border border-dashed border-[#334155] text-center text-xs text-slate-400">
                <span className="block font-bold text-amber-500/80 mb-1">🛡️ No Combat Stats</span>
                Only <strong>Conjuring</strong> card types possess ATK and HP stats. This card is a <strong>{card.type}</strong>.
              </div>
            )}

            {/* Description Text */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Card Description / Effect Text
              </label>
              <textarea
                rows={4}
                value={card.cardText}
                onChange={(e) => onChangeCard({ cardText: e.target.value })}
                className="w-full bg-[#0F1115] border border-[#334155] rounded-xl p-3 text-sm focus:outline-none focus:border-blue-500 resize-none font-sans leading-relaxed text-slate-100"
                placeholder="Enter abilities, rules, effect text here..."
              />
            </div>

            {/* Lore/Flavor Text */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Flavor / Lore Text (Italics)
              </label>
              <textarea
                rows={2}
                value={card.flavorText || ""}
                onChange={(e) => onChangeCard({ flavorText: e.target.value })}
                className="w-full bg-[#0F1115] border border-[#334155] rounded-xl p-3 text-sm focus:outline-none focus:border-blue-500 resize-none font-serif italic leading-relaxed text-slate-300"
                placeholder="Enter lore background or quote details..."
              />
            </div>
          </div>
        )}

        {/* METADATA TAB */}
        {activeTab === "meta" && (
          <div className="space-y-4">
            {/* Card Rarity */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Card Rarity Theme
              </label>
              <select
                value={card.rarity}
                onChange={(e) => onChangeCard({ rarity: e.target.value })}
                className="w-full bg-[#0F1115] border border-[#334155] rounded-xl p-3 text-sm focus:outline-none focus:border-blue-500 text-slate-200"
              >
                {RARITIES.map((r) => (
                  <option key={r.value} value={r.value} className="bg-[#161B22]">
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Set Code/ID */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Set Code / Card Number
              </label>
              <input
                type="text"
                value={card.setNumber}
                onChange={(e) => onChangeCard({ setNumber: e.target.value })}
                className="w-full bg-[#0F1115] border border-[#334155] rounded-xl p-3 text-sm focus:outline-none focus:border-blue-500 text-slate-100 font-mono"
                placeholder="e.g. ODYS-EN001"
              />
            </div>

            {/* Creator / Illustrator */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Card Illustrator / Copyright Owner
              </label>
              <input
                type="text"
                value={card.creator}
                onChange={(e) => onChangeCard({ creator: e.target.value })}
                className="w-full bg-[#0F1115] border border-[#334155] rounded-xl p-3 text-sm focus:outline-none focus:border-blue-500 text-slate-100"
                placeholder="e.g. Nova Nexus Art"
              />
            </div>

            {/* Serial Code & Edition */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Card Print Edition
                </label>
                <select
                  value={card.edition}
                  onChange={(e) => onChangeCard({ edition: e.target.value })}
                  className="w-full bg-[#0F1115] border border-[#334155] rounded-xl p-3 text-sm focus:outline-none focus:border-blue-500 text-slate-200 font-semibold"
                >
                  {EDITIONS.map((ed) => (
                    <option key={ed} value={ed} className="bg-[#161B22]">
                      {ed}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Identification ID Code
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={10}
                    value={card.serialNumber}
                    onChange={(e) => onChangeCard({ serialNumber: e.target.value })}
                    className="flex-1 bg-[#0F1115] border border-[#334155] rounded-xl p-3 text-sm focus:outline-none focus:border-blue-500 text-slate-100 font-mono"
                    placeholder="00000000"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      onChangeCard({
                        serialNumber: Math.floor(10000000 + Math.random() * 90000000).toString(),
                      })
                    }
                    className="px-3 bg-[#1E293B] border border-[#334155] rounded-xl hover:bg-[#334155] text-xs font-bold text-slate-200 cursor-pointer flex items-center gap-1"
                  >
                    <Dice5 className="w-3.5 h-3.5 text-blue-400" />
                    <span>Gen</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CUSTOM TEMPLATE BUILDER TAB */}
        {activeTab === "template" && (
          <div className="space-y-5">
            <div className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/20 rounded-xl p-4 flex gap-3 text-blue-300">
              <Sparkles className="w-5 h-5 shrink-0 mt-0.5 text-blue-400 animate-pulse" />
              <div className="text-xs space-y-1">
                <span className="font-bold block text-blue-400">Card Template Designer</span>
                <p className="text-slate-300 leading-relaxed">
                  Tailor the card border styles, tweak picture frame proportions, toggle layout elements, or add dynamic custom boxes to design your ultimate trading card blueprint.
                </p>
              </div>
            </div>

            {/* Frame Style Preset Select */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Frame Style Preset
              </label>
              <select
                value={card.frameStyle || "Standard"}
                onChange={(e) => onChangeCard({ frameStyle: e.target.value as any })}
                className="w-full bg-[#0F1115] border border-[#334155] rounded-xl p-3 text-sm focus:outline-none focus:border-blue-500 text-slate-100 font-semibold"
              >
                <option value="Standard">Standard (Elemental Colored Glow)</option>
                <option value="Metal">Metal (Polished Steel Armor)</option>
                <option value="Crystal">Crystal (Translucent Prismatic Glow)</option>
                <option value="Void">Void (Deep Abyssal Purple Shadow)</option>
                <option value="Chroma">Chroma (Shifting Cyber Neon)</option>
                <option value="Ancient">Ancient (Gold-Rimmed Parchment)</option>
              </select>
            </div>

            {/* Art Frame adjustments block */}
            <div className="bg-[#0F1115]/30 p-4 rounded-xl border border-[#334155] space-y-4">
              <span className="block text-[11px] font-bold text-blue-400 uppercase tracking-wider">
                🖼️ Artwork Frame Proportion Adjustments
              </span>

              {/* Height Slider */}
              <div>
                <div className="flex justify-between items-center text-xs text-slate-400 mb-1.5 font-semibold">
                  <span>Frame Height</span>
                  <span className="text-blue-400 font-mono">{(card.artHeight !== undefined ? card.artHeight : 240)}px</span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="300"
                  step="10"
                  value={card.artHeight !== undefined ? card.artHeight : 240}
                  onChange={(e) => onChangeCard({ artHeight: parseInt(e.target.value) })}
                  className="w-full accent-blue-500 h-2 bg-[#0F1115] rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Roundness Radius Slider */}
              <div>
                <div className="flex justify-between items-center text-xs text-slate-400 mb-1.5 font-semibold">
                  <span>Frame Border Roundness</span>
                  <span className="text-blue-400 font-mono">{(card.artBorderRadius !== undefined ? card.artBorderRadius : 12)}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="24"
                  step="2"
                  value={card.artBorderRadius !== undefined ? card.artBorderRadius : 12}
                  onChange={(e) => onChangeCard({ artBorderRadius: parseInt(e.target.value) })}
                  className="w-full accent-blue-500 h-2 bg-[#0F1115] rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>

            {/* Template Block Layout Toggles */}
            <div className="bg-[#0F1115]/30 p-4 rounded-xl border border-[#334155] space-y-3">
              <span className="block text-[11px] font-bold text-blue-400 uppercase tracking-wider">
                🛠️ Toggle Layout Elements (Add/Remove)
              </span>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={card.showSubtype !== false}
                    onChange={(e) => onChangeCard({ showSubtype: e.target.checked })}
                    className="rounded bg-[#0F1115] border-[#334155] text-blue-500 focus:ring-0 w-4 h-4 cursor-pointer"
                  />
                  <span className="text-xs text-slate-300">Subtype / Typeline</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={card.showFlavorText !== false}
                    onChange={(e) => onChangeCard({ showFlavorText: e.target.checked })}
                    className="rounded bg-[#0F1115] border-[#334155] text-blue-500 focus:ring-0 w-4 h-4 cursor-pointer"
                  />
                  <span className="text-xs text-slate-300">Flavor Text Box</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={card.showCreatorBlock !== false}
                    onChange={(e) => onChangeCard({ showCreatorBlock: e.target.checked })}
                    className="rounded bg-[#0F1115] border-[#334155] text-blue-500 focus:ring-0 w-4 h-4 cursor-pointer"
                  />
                  <span className="text-xs text-slate-300">Illustrator Block</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={card.showSerialNumber !== false}
                    onChange={(e) => onChangeCard({ showSerialNumber: e.target.checked })}
                    className="rounded bg-[#0F1115] border-[#334155] text-blue-500 focus:ring-0 w-4 h-4 cursor-pointer"
                  />
                  <span className="text-xs text-slate-300">Serial & Set Block</span>
                </label>
              </div>
            </div>

            {/* Dynamic Custom Added Text Boxes */}
            <div className="bg-[#0F1115]/30 p-4 rounded-xl border border-[#334155] space-y-4">
              <div className="flex justify-between items-center">
                <span className="block text-[11px] font-bold text-blue-400 uppercase tracking-wider">
                  📝 Custom Rule Text Boxes
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const currentBoxes = card.customTextBoxes || [];
                    const newBox = {
                      id: `box_${Date.now()}`,
                      label: "EFFECT",
                      text: "Add custom effects, battlecries, keywords, or special requirements here..."
                    };
                    onChangeCard({ customTextBoxes: [...currentBoxes, newBox] });
                  }}
                  className="px-2 py-1 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-400 text-xs rounded font-bold cursor-pointer transition-colors"
                >
                  + Add Text Box
                </button>
              </div>

              {(card.customTextBoxes && card.customTextBoxes.length > 0) ? (
                <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                  {card.customTextBoxes.map((box, index) => (
                    <div key={box.id} className="p-3 bg-black/40 rounded-lg border border-[#334155] space-y-2 relative">
                      <button
                        type="button"
                        onClick={() => {
                          const currentBoxes = card.customTextBoxes || [];
                          onChangeCard({
                            customTextBoxes: currentBoxes.filter((b) => b.id !== box.id)
                          });
                        }}
                        className="absolute top-2 right-2 text-red-400 hover:text-red-300 font-bold text-xs cursor-pointer p-1"
                        title="Remove custom text box"
                      >
                        ✕ Remove
                      </button>
                      
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                          Box Label {index + 1}
                        </label>
                        <input
                          type="text"
                          value={box.label}
                          onChange={(e) => {
                            const currentBoxes = card.customTextBoxes || [];
                            onChangeCard({
                              customTextBoxes: currentBoxes.map((b) =>
                                b.id === box.id ? { ...b, label: e.target.value } : b
                              )
                            });
                          }}
                          placeholder="e.g. ULTIMATE"
                          className="w-full bg-[#0F1115] border border-[#334155] rounded px-2 py-1 text-xs text-slate-100 focus:outline-none focus:border-blue-500 font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                          Box Content
                        </label>
                        <textarea
                          rows={2}
                          value={box.text}
                          onChange={(e) => {
                            const currentBoxes = card.customTextBoxes || [];
                            onChangeCard({
                              customTextBoxes: currentBoxes.map((b) =>
                                b.id === box.id ? { ...b, text: e.target.value } : b
                              )
                            });
                          }}
                          placeholder="Enter rules description..."
                          className="w-full bg-[#0F1115] border border-[#334155] rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-blue-500 resize-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 bg-black/10 border border-dashed border-[#334155] rounded-xl text-xs text-slate-500">
                  No custom text boxes added yet. Click "+ Add Text Box" to add customized rules, lore panels, or keywords.
                </div>
              )}
            </div>
          </div>
        )}

        {/* AI IMAGE TAB */}
        {activeTab === "ai" && (
          <div className="space-y-4">
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex gap-3 text-blue-300">
              <Sparkles className="w-5 h-5 shrink-0 mt-0.5 text-blue-400" />
              <div className="text-xs space-y-1">
                <span className="font-bold block text-blue-400">AI Card Art Summoner</span>
                <p className="text-slate-300 leading-relaxed">
                  Craft high-resolution character artwork using <strong>Gemini</strong>. It scans your card attributes
                  automatically to compile amazing illustrative assets.
                </p>
              </div>
            </div>

            {/* Prompt input */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Art Prompt Description
                </label>
                <button
                  type="button"
                  onClick={handleAutoDraftPrompt}
                  className="text-xs text-blue-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  ✨ Auto-Draft from Card Details
                </button>
              </div>
              <textarea
                rows={4}
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                className="w-full bg-[#0F1115] border border-[#334155] rounded-xl p-3 text-xs focus:outline-none focus:border-blue-500 resize-none text-slate-100"
                placeholder="Describe your scene... e.g. A roaring fire dragon breathing flames, epic game card art, glowing volcanic cave background"
              />
            </div>

            {/* Art Config - Aspect ratio selector */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Aspect Ratio
                </label>
                <select
                  value={aiRatio}
                  onChange={(e) => setAiRatio(e.target.value)}
                  className="w-full bg-[#0F1115] border border-[#334155] rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="1:1" className="bg-[#161B22]">1:1 (Square)</option>
                  <option value="3:4" className="bg-[#161B22]">3:4 (Portrait)</option>
                  <option value="4:3" className="bg-[#161B22]">4:3 (Landscape)</option>
                </select>
              </div>
              <div className="col-span-2 flex items-end">
                <button
                  type="button"
                  disabled={isGeneratingArt}
                  onClick={handleGenerateAIArt}
                  className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 disabled:from-[#1E293B] disabled:to-[#1E293B] text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-xs border border-blue-500/10 cursor-pointer disabled:cursor-not-allowed"
                >
                  {isGeneratingArt ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Generating Art...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Summon Card Illustration</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Error display */}
            {aiError && <div className="text-xs text-red-400 bg-red-950/20 border border-red-900 rounded-lg p-3">{aiError}</div>}

            {/* Reassuring creative loading screen */}
            {isGeneratingArt && (
              <div className="bg-[#0F1115]/40 p-5 rounded-xl border border-[#334155] flex flex-col items-center justify-center text-center gap-3 animate-pulse">
                <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-300">{CREATIVE_MESSAGES[loadingMsgIndex]}</span>
                  <p className="text-[10px] text-slate-500 leading-normal">
                    This will take a few seconds. The artwork is compiled on our cloud container.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* GOOGLE SHEETS TAB */}
        {activeTab === "sync" && (
          <div className="space-y-4">
            <div className="bg-[#107c41]/10 border border-[#107c41]/20 rounded-xl p-4 flex gap-3 text-[#107c41]">
              <FileSpreadsheet className="w-5 h-5 shrink-0 mt-0.5 text-emerald-500" />
              <div className="text-xs space-y-1">
                <span className="font-bold block text-emerald-400">Google Sheets Set Sync</span>
                <p className="text-slate-300 leading-relaxed">
                  Export and sync your card submissions directly to a connected spreadsheet in real time. Great for
                  game developers, writers, or managing collection lists!
                </p>
              </div>
            </div>

            {/* Auth / Account State */}
            {!user ? (
              <div className="bg-[#0F1115]/40 p-5 rounded-xl border border-[#334155] flex flex-col items-center justify-center text-center gap-4">
                <ShieldCheck className="w-10 h-10 text-slate-500" />
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-300">Authorize Workspace Integration</span>
                  <p className="text-[10px] text-slate-500 max-w-[280px]">
                    To sync card sets, please authorize connection to Google Drive and Sheets with permission.
                  </p>
                </div>
                <button
                  onClick={handleGoogleSignIn}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-950 font-bold rounded-xl text-xs shadow transition-all flex items-center gap-2 cursor-pointer"
                >
                  <img
                    src="https://www.google.com/favicon.ico"
                    className="w-4 h-4"
                    alt="Google Logo"
                  />
                  <span>Sign in with Google</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4 bg-[#0F1115]/30 p-4 rounded-xl border border-[#334155]">
                <div className="flex items-center justify-between border-b border-[#334155] pb-3">
                  <div className="flex items-center gap-2">
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        className="w-6 h-6 rounded-full"
                        alt={user.displayName || ""}
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                        {user.displayName?.[0] || "U"}
                      </div>
                    )}
                    <div className="text-[10px] leading-tight">
                      <span className="font-bold text-slate-200 block">{user.displayName || "Connected User"}</span>
                      <span className="text-slate-500">{user.email}</span>
                    </div>
                  </div>
                  <button
                    onClick={handleGoogleSignOut}
                    className="p-1.5 hover:bg-[#1E293B] rounded text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                    title="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>

                {/* Sheet Connection controls */}
                {activeSet ? (
                  <div className="space-y-3">
                    <div className="text-xs space-y-1">
                      <span className="text-[10px] text-slate-400 uppercase font-black block">Active Set Connection</span>
                      <span className="font-bold text-blue-400">{activeSet.name}</span>
                    </div>

                    {activeSet.sheetId ? (
                      <div className="space-y-3">
                        <div className="bg-[#0F1115]/40 p-3 rounded border border-emerald-500/10 text-xs space-y-1.5">
                          <div className="flex items-center justify-between text-slate-300">
                            <span className="font-semibold truncate max-w-[220px] text-slate-200">{activeSet.sheetName}</span>
                            <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/40 px-1.5 py-0.5 rounded">Linked</span>
                          </div>
                          <a
                            href={activeSet.sheetUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-400 hover:underline flex items-center gap-1 font-bold pt-1"
                          >
                            <Eye className="w-3.5 h-3.5 text-blue-400" />
                            <span>Open linked Google Sheet</span>
                          </a>
                        </div>

                        {/* Force Sync Option */}
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={isConnectingSheet}
                            onClick={handleForceSyncSet}
                            className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white font-bold rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${isConnectingSheet ? "animate-spin" : ""}`} />
                            <span>Force Sync Collection</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          This card set is not linked to Google Sheets. Create a dedicated sheet to track your designs
                          automatically.
                        </p>
                        <button
                          type="button"
                          disabled={isConnectingSheet}
                          onClick={handleCreateAndLinkSheet}
                          className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white font-bold rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                        >
                          <Link2 className="w-4 h-4" />
                          <span>Create & Link Spreadsheet</span>
                        </button>
                      </div>
                    )}

                    {/* Auto Sync Toggle */}
                    <div className="flex items-center justify-between bg-[#0F1115]/20 p-2.5 rounded border border-[#334155] text-xs">
                      <span className="text-slate-300 font-medium">Auto-sync modifications in real-time</span>
                      <input
                        type="checkbox"
                        checked={activeSet.autoSync}
                        onChange={async (e) => {
                          activeSet.autoSync = e.target.checked;
                          // Save set update
                          await fetch("/api/sets", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(activeSet),
                          });
                          // Re-render
                          onChangeCard({});
                        }}
                        className="w-4 h-4 accent-blue-500 rounded border-[#334155] cursor-pointer"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 text-center py-4">
                    Please select or create a card set in the Identity tab to link it to Sheets.
                  </div>
                )}

                {/* Linking status display */}
                {sheetStatus && (
                  <div className="text-[10px] text-slate-300 bg-[#0F1115] px-2.5 py-1.5 rounded border border-[#334155] flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
                    <span>{sheetStatus}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* FOOTER SAVE TRIGGER */}
      <div className="border-t border-[#334155] pt-5 mt-4 flex items-center gap-3">
        <button
          onClick={onNewCard}
          type="button"
          className="px-4 py-3 bg-[#1E293B] hover:bg-[#334155] border border-[#475569] hover:border-blue-500/50 text-blue-400 font-bold rounded-xl shadow transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer text-sm"
          title="Start designing a new card"
        >
          <Sparkles className="w-4 h-4 text-blue-400 animate-pulse" />
          <span>New Card</span>
        </button>

        <button
          onClick={onSaveCard}
          disabled={isSaving}
          className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-[#1E293B] disabled:text-slate-500 text-white font-bold rounded-xl shadow transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed text-sm"
        >
          {isSaving ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Saving Card...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Save Card to Active Set</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
