import React, { useState, useEffect } from "react";
import CardPreview from "./components/CardPreview";
import ControlPanel from "./components/ControlPanel";
import SetsManager from "./components/SetsManager";
import ShareModal from "./components/ShareModal";
import { Card, CardSet } from "./types";
import { INITIAL_CARDS, INITIAL_SETS } from "./data";
import { initAuth } from "./lib/firebase";
import { appendCardToSpreadsheet } from "./lib/sheets";
import { User } from "firebase/auth";
import * as htmlToImage from "html-to-image";
import { Sparkles, Library, FileSpreadsheet, Heart, Printer, Share2 } from "lucide-react";
import JSZip from "jszip";

export default function App() {
  // DB Sync State
  const [cards, setCards] = useState<Card[]>([]);
  const [sets, setSets] = useState<CardSet[]>([]);
  const [activeSetId, setActiveSetId] = useState("");

  // Editor State
  const [activeCard, setActiveCard] = useState<Card>(INITIAL_CARDS[0]);

  // Auth / Sheet Sync state
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // UX Actions State
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [dbStatus, setDbStatus] = useState("");

  // Batch Export & Print States
  const [isBatchExportingZip, setIsBatchExportingZip] = useState(false);
  const [isBatchExportingPrint, setIsBatchExportingPrint] = useState(false);
  const [batchExportCards, setBatchExportCards] = useState<Card[]>([]);
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
  const [printPreviewCards, setPrintPreviewCards] = useState<Card[]>([]);

  // 1. Fetch DB on mount
  useEffect(() => {
    async function loadData() {
      try {
        setDbStatus("Loading collections database...");
        const res = await fetch("/api/cards");
        if (!res.ok) throw new Error("Failed to load local container database.");

        const db = await res.json();

        // Seed with defaults if DB is completely empty
        let loadedCards = db.cards || [];
        let loadedSets = db.sets || [];

        if (loadedSets.length === 0) {
          loadedSets = [...INITIAL_SETS];
          // Seed sets in backend
          for (const s of loadedSets) {
            await fetch("/api/sets", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(s),
            });
          }
        }

        if (loadedCards.length === 0) {
          loadedCards = [...INITIAL_CARDS];
          // Seed cards in backend
          for (const c of loadedCards) {
            await fetch("/api/cards", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(c),
            });
          }
        }

        setCards(loadedCards);
        setSets(loadedSets);

        // Auto select first set
        if (loadedSets.length > 0) {
          setActiveSetId(loadedSets[0].id);
        }

        // Set first loaded card in editor or parse shared URL payload
        const searchParams = new URLSearchParams(window.location.search);
        const sharedCardParam = searchParams.get("card");
        let loadedFromParam = false;
        if (sharedCardParam) {
          try {
            const jsonStr = decodeURIComponent(atob(sharedCardParam));
            const sharedCard = JSON.parse(jsonStr);
            if (sharedCard && sharedCard.name) {
              setActiveCard(sharedCard);
              if (sharedCard.setId) setActiveSetId(sharedCard.setId);
              loadedFromParam = true;
              setDbStatus("Loaded card design from share URL link!");
            }
          } catch (e) {
            console.error("Failed to parse shared card URL payload:", e);
          }
        }

        if (!loadedFromParam && loadedCards.length > 0) {
          setActiveCard(loadedCards[0]);
        }

        if (!loadedFromParam) {
          setDbStatus("");
        }
      } catch (err) {
        console.error("Failed to load DB, falling back to local defaults", err);
        setCards([...INITIAL_CARDS]);
        setSets([...INITIAL_SETS]);
        setActiveSetId(INITIAL_SETS[0].id);
        setDbStatus("Database offline. Loaded transient fallback.");
      }
    }

    loadData();

    // Initialize Google OAuth Token state listener
    initAuth(
      (currentUser, accessToken) => {
        setUser(currentUser);
        setToken(accessToken);
      },
      () => {
        // Not signed in or token expired
        setUser(null);
        setToken(null);
      }
    );
  }, []);

  // Update card helper
  const handleChangeCard = (updated: Partial<Card>) => {
    setActiveCard((prev) => ({ ...prev, ...updated }));
  };

  // Card Set creation helper
  const handleCreateSet = async (name: string, desc: string): Promise<CardSet | undefined> => {
    const newSet: CardSet = {
      id: `set_${Date.now()}`,
      name,
      description: desc,
      autoSync: false,
    };

    try {
      const res = await fetch("/api/sets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSet),
      });

      if (!res.ok) throw new Error("Failed to save set to backend.");

      setSets((prev) => [...prev, newSet]);
      setActiveSetId(newSet.id);
      return newSet;
    } catch (err) {
      console.error(err);
      alert("Error saving card set to database.");
      return undefined;
    }
  };

  // Save card trigger
  const handleSaveCard = async () => {
    setIsSaving(true);
    const targetSetId = activeSetId || (sets.length > 0 ? sets[0].id : "");

    const cardToSave = {
      ...activeCard,
      setId: targetSetId,
    };

    try {
      const res = await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cardToSave),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save card.");

      // Refresh local card array
      setCards((prev) => {
        const idx = prev.findIndex((c) => c.id === cardToSave.id);
        if (idx > -1) {
          const next = [...prev];
          next[idx] = cardToSave;
          return next;
        }
        return [...prev, cardToSave];
      });

      // Handle real-time Google Sheet synchronization
      const currentSet = sets.find((s) => s.id === targetSetId);
      if (currentSet && currentSet.sheetId && currentSet.autoSync && token) {
        console.log("Real-time syncing submission to Google Sheet:", currentSet.sheetName);
        const syncSuccess = await appendCardToSpreadsheet(token, currentSet.sheetId, cardToSave);
        if (syncSuccess) {
          console.log("Card synched to Sheet successfully.");
        } else {
          console.error("Failed to sync card to sheet.");
        }
      }

      alert(`"${cardToSave.name}" saved successfully to database!`);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to save card.");
    } finally {
      setIsSaving(false);
    }
  };

  // Start a new card design from scratch
  const handleNewCard = () => {
    const targetSetId = activeSetId || (sets.length > 0 ? sets[0].id : "");
    setActiveCard({
      id: `card_${Date.now()}`,
      name: "",
      type: "Conjuring",
      frameType: "Fire",
      attribute: "Fire",
      level: 1,
      genre: "fantasy",
      cost: "1 Fire Essence",
      monsterType: "Conjuring - Fire Elemental",
      cardText: "Enter text description for card abilities...",
      flavorText: "An ancient realm awaits.",
      atk: "1000",
      def: "1000",
      statLabel1: "ATK",
      statLabel2: "HP",
      setId: targetSetId,
      setNumber: "",
      rarity: "Common",
      creator: "",
      edition: "1st Edition",
      serialNumber: "",
      artUrl: "",
      artScale: 1.0,
      artX: 0,
      artY: 0,
      artRotation: 0,
      frameStyle: "Standard",
      artHeight: 180,
      artBorderRadius: 8,
      showFlavorText: true,
      showSubtype: true,
      showCreatorBlock: true,
      showSerialNumber: true,
      customTextBoxes: [],
    });
  };

  // Duplicate / Clone card trigger
  const handleDuplicateCard = async (targetCard: Card) => {
    const clonedId = `card_${Date.now()}`;
    const clonedCard: Card = {
      ...targetCard,
      id: clonedId,
      name: `${targetCard.name || "Card"} (Copy)`,
    };

    try {
      // Save directly to backend
      const res = await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clonedCard),
      });

      if (!res.ok) throw new Error("Failed to duplicate card in backend.");

      setCards((prev) => [...prev, clonedCard]);
      setActiveCard(clonedCard);
      alert(`Cloned "${targetCard.name}" as "${clonedCard.name}"!`);
    } catch (err) {
      console.error(err);
      alert("Error duplicating card.");
    }
  };

  // Keyboard Shortcuts Handler (Ctrl+S = Save, Ctrl+N = New, Ctrl+Shift+S = Share)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isEditingInput =
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          activeEl.tagName === "SELECT");

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s" && !e.shiftKey) {
        e.preventDefault();
        handleSaveCard();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s" && e.shiftKey) {
        e.preventDefault();
        setIsShareModalOpen(true);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "n" && !isEditingInput) {
        e.preventDefault();
        handleNewCard();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeCard, activeSetId, sets, token]);

  // Delete card trigger
  const handleDeleteCard = async (cardId: string) => {
    try {
      const res = await fetch(`/api/cards/${cardId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete card.");

      setCards((prev) => prev.filter((c) => c.id !== cardId));

      // Reset editor card if we just deleted the active one
      if (activeCard.id === cardId) {
        const remaining = cards.filter((c) => c.id !== cardId);
        if (remaining.length > 0) {
          setActiveCard(remaining[0]);
        } else {
          setActiveCard({
            ...INITIAL_CARDS[0],
            id: `card_${Date.now()}`,
          });
        }
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting card from database.");
    }
  };

  // Delete Set trigger
  const handleDeleteSet = async (setId: string) => {
    try {
      const res = await fetch(`/api/sets/${setId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete card set.");

      setSets((prev) => prev.filter((s) => s.id !== setId));

      // Unlink card set values in editor
      if (activeCard.setId === setId) {
        handleChangeCard({ setId: "" });
      }

      // Re-route to first set if available
      const remainingSets = sets.filter((s) => s.id !== setId);
      if (remainingSets.length > 0) {
        setActiveSetId(remainingSets[0].id);
      } else {
        setActiveSetId("");
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting card set.");
    }
  };

  // Load card from DB back into editor
  const handleLoadCard = (card: Card) => {
    setActiveCard(card);
    if (card.setId) {
      setActiveSetId(card.setId);
    }
  };

  // High Resolution Export Utility
  const handleExportCardPNG = async () => {
    const cardEl = document.getElementById("card-stage");
    if (!cardEl) {
      alert("Card layout was not found on screen.");
      return;
    }

    setIsExporting(true);

    try {
      // 1. html-to-image is extremely good at exporting high-resolution
      // By using pixelRatio: 3, we increase resolution by 300% (ideal for crisp, clear high-definition printing!)
      const dataUrl = await htmlToImage.toPng(cardEl, {
        pixelRatio: 3,
        style: {
          transform: "scale(1)",
          transformOrigin: "center",
        },
        cacheBust: true,
      });

      const cardNameSlug = (activeCard.name || "trading-card").toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const filename = `${cardNameSlug}-high-res.png`;

      const downloadLink = document.createElement("a");
      downloadLink.href = dataUrl;
      downloadLink.download = filename;
      downloadLink.click();
    } catch (error) {
      console.error("Export failed:", error);
      alert("High-resolution PNG export failed. Try again, or ensure custom upload dimensions are correct.");
    } finally {
      setIsExporting(false);
    }
  };

  // Batch ZIP Export Handler
  const handleBatchExportZip = async (setId: string) => {
    const setCards = cards.filter((c) => c.setId === setId);
    if (setCards.length === 0) {
      alert("This card set has no cards to export.");
      return;
    }

    setIsBatchExportingZip(true);
    setBatchExportCards(setCards);

    try {
      // Allow DOM to render hidden elements fully
      await new Promise((resolve) => setTimeout(resolve, 1200));

      const zip = new JSZip();
      let capturedCount = 0;

      for (const card of setCards) {
        const el = document.getElementById(`batch-card-${card.id}`);
        if (el) {
          try {
            // High quality pixelRatio: 3
            const dataUrl = await htmlToImage.toPng(el, {
              pixelRatio: 3,
              style: {
                transform: "scale(1)",
                transformOrigin: "center",
              },
              cacheBust: true,
            });

            // Convert Base64 dataUrl to Binary/Blob
            const response = await fetch(dataUrl);
            const blob = await response.blob();

            const cardNameSlug = (card.name || `card-${card.id}`)
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-");
            zip.file(`${cardNameSlug}.png`, blob);
            capturedCount++;
          } catch (err) {
            console.error(`Failed rendering card ${card.name || card.id}:`, err);
          }
        }
      }

      if (capturedCount > 0) {
        const activeSetName = sets.find((s) => s.id === setId)?.name || "set";
        const setSlug = activeSetName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        const content = await zip.generateAsync({ type: "blob" });

        const downloadLink = document.createElement("a");
        downloadLink.href = URL.createObjectURL(content);
        downloadLink.download = `${setSlug}-cards-pngs.zip`;
        downloadLink.click();
      } else {
        alert("Failed to render and capture cards. Please try again.");
      }
    } catch (err) {
      console.error("Batch ZIP export failed:", err);
      alert("An error occurred during batch export ZIP generation.");
    } finally {
      setBatchExportCards([]);
      setIsBatchExportingZip(false);
    }
  };

  // Batch Print Preview Handler
  const handleBatchExportPrint = (setId: string) => {
    const setCards = cards.filter((c) => c.setId === setId);
    if (setCards.length === 0) {
      alert("This card set has no cards to print.");
      return;
    }
    setPrintPreviewCards(setCards);
    setIsPrintPreviewOpen(true);
  };

  // Helper to chunk cards into pages of N
  const chunkCards = (cardsList: Card[], chunkSize: number) => {
    const chunks = [];
    for (let i = 0; i < cardsList.length; i += chunkSize) {
      chunks.push(cardsList.slice(i, i + chunkSize));
    }
    return chunks;
  };

  // Mobile App Navigation State
  const [mobileTab, setMobileTab] = useState<"card" | "editor" | "sets" | "sync">("card");
  const [isDesktopExpanded, setIsDesktopExpanded] = useState(false);

  const activeSet = sets.find((s) => s.id === activeSetId);

  return (
    <div className="min-h-screen bg-[#0F1115] text-[#E2E8F0] flex flex-col font-sans selection:bg-blue-500 selection:text-white relative overflow-x-hidden pb-16 lg:pb-0">
      {/* Decorative ambient visual glow */}
      <div className="absolute top-0 left-0 w-full h-[350px] bg-gradient-to-b from-blue-600/10 via-indigo-600/5 to-transparent pointer-events-none" />

      {/* IMMACULATE MOBILE / APP HEADER BAR */}
      <header className="h-14 border-b border-[#334155] bg-[#161B22]/90 backdrop-blur-md flex items-center justify-between px-3 sm:px-6 shrink-0 sticky top-0 z-40 shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center font-black text-white shadow-md shadow-blue-500/20 border border-blue-400/30">
            <span className="text-xs tracking-tighter">CCG</span>
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-extrabold tracking-tight flex items-center gap-1.5">
              <span className="font-serif text-slate-100 tracking-wide">ESSENCE</span>
              <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent font-sans font-black text-xs">CCG</span>
            </h1>
          </div>
        </div>

        {/* Set Selector Pill & Status Badges */}
        <div className="flex items-center gap-2">
          {/* Quick Active Set Selector */}
          {sets.length > 0 && (
            <button
              onClick={() => setMobileTab("sets")}
              className="hidden xs:flex items-center gap-1.5 bg-[#0F1115] hover:bg-[#1E293B] border border-[#334155] hover:border-blue-500/50 px-2.5 py-1 rounded-full text-[11px] font-bold text-slate-200 transition-colors cursor-pointer"
              title="Switch Active Card Collection Set"
            >
              <Library className="w-3.5 h-3.5 text-blue-400" />
              <span className="truncate max-w-[100px] sm:max-w-[140px]">{activeSet?.name || "All Sets"}</span>
            </button>
          )}

          {/* Desktop Mode Switcher */}
          <button
            onClick={() => setIsDesktopExpanded(!isDesktopExpanded)}
            className="hidden lg:flex items-center gap-1.5 bg-[#0F1115] hover:bg-[#1E293B] border border-[#334155] px-2.5 py-1 rounded-lg text-xs font-bold text-slate-300 transition-colors cursor-pointer"
            title="Toggle between Mobile App view and Desktop Split-Screen view"
          >
            <span>{isDesktopExpanded ? "📱 Mobile View" : "🖥️ Expanded Desktop"}</span>
          </button>

          {/* Quick Share Header Button */}
          <button
            onClick={() => setIsShareModalOpen(true)}
            className="p-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
            title="Share card design (Ctrl+Shift+S)"
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">Share</span>
          </button>
        </div>
      </header>

      {/* DB STATUS TOAST / BANNER */}
      {dbStatus && (
        <div className="bg-blue-950/40 border-b border-blue-900/40 text-blue-300 text-[11px] px-4 py-1.5 flex items-center justify-between font-semibold animate-in fade-in">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
            <span>{dbStatus}</span>
          </div>
          <button onClick={() => setDbStatus("")} className="text-slate-400 hover:text-white cursor-pointer">✕</button>
        </div>
      )}

      {/* MAIN APPLICATION CONTENT CONTAINER */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 flex flex-col gap-4">
        {/* DESKTOP EXPANDED SPLIT-SCREEN MODE */}
        {isDesktopExpanded ? (
          <div className="space-y-6">
            <div className="grid lg:grid-cols-12 gap-6 items-start">
              {/* Card Preview (Left Side) - Takes 5 cols */}
              <div className="lg:col-span-5 bg-[#161B22] border border-[#334155] p-6 rounded-2xl shadow-2xl backdrop-blur-sm self-start">
                <CardPreview
                  card={activeCard}
                  onChangeCard={handleChangeCard}
                  onExport={handleExportCardPNG}
                  isExporting={isExporting}
                  onNewCard={handleNewCard}
                  onSaveCard={handleSaveCard}
                  onDeleteCard={handleDeleteCard}
                  onDuplicateCard={handleDuplicateCard}
                  onOpenShareModal={() => setIsShareModalOpen(true)}
                  isSaving={isSaving}
                />
              </div>

              {/* Control Panels & Customizer (Right Side) - Takes 7 cols */}
              <div className="lg:col-span-7 flex flex-col gap-6">
                <ControlPanel
                  card={activeCard}
                  onChangeCard={handleChangeCard}
                  onSaveCard={handleSaveCard}
                  onNewCard={handleNewCard}
                  activeSetId={activeSetId}
                  onSetActiveSetId={setActiveSetId}
                  sets={sets}
                  onCreateSet={handleCreateSet}
                  user={user}
                  setUser={setUser}
                  token={token}
                  setToken={setToken}
                  isSaving={isSaving}
                />
              </div>
            </div>

            {/* DATABASE SETS MANAGER */}
            <SetsManager
              cards={cards}
              sets={sets}
              activeSetId={activeSetId}
              onSetActiveSetId={setActiveSetId}
              onLoadCard={handleLoadCard}
              onDeleteCard={handleDeleteCard}
              onDeleteSet={handleDeleteSet}
              onCreateSet={handleCreateSet}
              onBatchExportZip={handleBatchExportZip}
              onBatchExportPrint={handleBatchExportPrint}
              onDuplicateCard={handleDuplicateCard}
              isBatchExportingZip={isBatchExportingZip}
              isBatchExportingPrint={isBatchExportingPrint}
            />
          </div>
        ) : (
          /* MOBILE PHONE IMMACULATE VIEW MODE (Default) */
          <div className="flex-1 flex flex-col items-center max-w-2xl w-full mx-auto">
            {/* VIEW TAB 1: CARD PREVIEW & STAGE */}
            {mobileTab === "card" && (
              <div className="w-full flex flex-col items-center space-y-4 animate-in fade-in zoom-in-95 duration-150">
                <div className="w-full bg-[#161B22] border border-[#334155] p-3 sm:p-5 rounded-2xl shadow-xl flex flex-col items-center">
                  <CardPreview
                    card={activeCard}
                    onChangeCard={handleChangeCard}
                    onExport={handleExportCardPNG}
                    isExporting={isExporting}
                    onNewCard={handleNewCard}
                    onSaveCard={handleSaveCard}
                    onDeleteCard={handleDeleteCard}
                    onDuplicateCard={handleDuplicateCard}
                    onOpenShareModal={() => setIsShareModalOpen(true)}
                    isSaving={isSaving}
                  />

                  {/* Mobile Quick Switcher to Customizer */}
                  <div className="w-full max-w-[400px] mt-4 pt-3 border-t border-[#334155] flex gap-2">
                    <button
                      onClick={() => setMobileTab("editor")}
                      className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Open Card Customizer</span>
                    </button>
                    <button
                      onClick={() => setMobileTab("sets")}
                      className="px-4 py-3 bg-[#0F1115] hover:bg-[#1E293B] border border-[#334155] text-slate-300 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                      title="View Collections Database"
                    >
                      <Library className="w-4 h-4 text-blue-400" />
                      <span>Collection</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* VIEW TAB 2: EDITOR & CUSTOMIZER */}
            {mobileTab === "editor" && (
              <div className="w-full space-y-3 animate-in fade-in zoom-in-95 duration-150">
                {/* Floating Preview Shortcut */}
                <div className="bg-gradient-to-r from-blue-950/60 to-indigo-950/60 border border-blue-500/30 rounded-xl p-3 flex items-center justify-between text-xs shadow-md">
                  <div className="flex items-center gap-2 text-slate-200">
                    <span className="font-extrabold text-blue-400 truncate max-w-[160px]">
                      {activeCard.name || "Editing Card"}
                    </span>
                    <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/30 font-bold">
                      {activeCard.type}
                    </span>
                  </div>
                  <button
                    onClick={() => setMobileTab("card")}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs flex items-center gap-1 cursor-pointer transition-colors shadow"
                  >
                    <span>View Card</span>
                    <Sparkles className="w-3.5 h-3.5" />
                  </button>
                </div>

                <ControlPanel
                  card={activeCard}
                  onChangeCard={handleChangeCard}
                  onSaveCard={handleSaveCard}
                  onNewCard={handleNewCard}
                  activeSetId={activeSetId}
                  onSetActiveSetId={setActiveSetId}
                  sets={sets}
                  onCreateSet={handleCreateSet}
                  user={user}
                  setUser={setUser}
                  token={token}
                  setToken={setToken}
                  isSaving={isSaving}
                />
              </div>
            )}

            {/* VIEW TAB 3: SETS & COLLECTIONS */}
            {mobileTab === "sets" && (
              <div className="w-full animate-in fade-in zoom-in-95 duration-150">
                <SetsManager
                  cards={cards}
                  sets={sets}
                  activeSetId={activeSetId}
                  onSetActiveSetId={setActiveSetId}
                  onLoadCard={(c) => {
                    handleLoadCard(c);
                    setMobileTab("card");
                  }}
                  onDeleteCard={handleDeleteCard}
                  onDeleteSet={handleDeleteSet}
                  onCreateSet={handleCreateSet}
                  onBatchExportZip={handleBatchExportZip}
                  onBatchExportPrint={handleBatchExportPrint}
                  onDuplicateCard={handleDuplicateCard}
                  isBatchExportingZip={isBatchExportingZip}
                  isBatchExportingPrint={isBatchExportingPrint}
                />
              </div>
            )}

            {/* VIEW TAB 4: GOOGLE SHEETS SYNC */}
            {mobileTab === "sync" && (
              <div className="w-full bg-[#161B22] border border-[#334155] rounded-2xl p-5 shadow-xl text-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center gap-3 border-b border-[#334155] pb-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-emerald-400">Google Workspace & Sheets Sync</h2>
                    <p className="text-xs text-slate-400">Real-time spreadsheet backup for card sets</p>
                  </div>
                </div>

                <ControlPanel
                  card={activeCard}
                  onChangeCard={handleChangeCard}
                  onSaveCard={handleSaveCard}
                  onNewCard={handleNewCard}
                  activeSetId={activeSetId}
                  onSetActiveSetId={setActiveSetId}
                  sets={sets}
                  onCreateSet={handleCreateSet}
                  user={user}
                  setUser={setUser}
                  token={token}
                  setToken={setToken}
                  isSaving={isSaving}
                />
              </div>
            )}
          </div>
        )}
      </main>

      {/* FIXED MOBILE NAVIGATION BAR AT BOTTOM */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#161B22]/95 backdrop-blur-lg border-t border-[#334155] px-2 py-1.5 shadow-2xl flex items-center justify-around max-w-md mx-auto rounded-t-2xl sm:max-w-xl">
        {/* Card Tab */}
        <button
          onClick={() => setMobileTab("card")}
          className={`flex-1 py-2 px-1 flex flex-col items-center gap-1 rounded-xl transition-all cursor-pointer ${
            mobileTab === "card"
              ? "bg-blue-600/20 text-blue-400 font-bold border border-blue-500/30"
              : "text-slate-400 hover:text-slate-200 hover:bg-[#1E293B]/50 font-medium"
          }`}
        >
          <Sparkles className={`w-5 h-5 ${mobileTab === "card" ? "text-blue-400 animate-pulse" : ""}`} />
          <span className="text-[10px] leading-none">Card View</span>
        </button>

        {/* Editor Tab */}
        <button
          onClick={() => setMobileTab("editor")}
          className={`flex-1 py-2 px-1 flex flex-col items-center gap-1 rounded-xl transition-all cursor-pointer ${
            mobileTab === "editor"
              ? "bg-blue-600/20 text-blue-400 font-bold border border-blue-500/30"
              : "text-slate-400 hover:text-slate-200 hover:bg-[#1E293B]/50 font-medium"
          }`}
        >
          <div className="relative">
            <Sparkles className={`w-5 h-5 ${mobileTab === "editor" ? "text-blue-400" : ""}`} />
            <span className="absolute -top-1 -right-1.5 w-2 h-2 rounded-full bg-blue-500"></span>
          </div>
          <span className="text-[10px] leading-none">Customizer</span>
        </button>

        {/* Collections Tab */}
        <button
          onClick={() => setMobileTab("sets")}
          className={`flex-1 py-2 px-1 flex flex-col items-center gap-1 rounded-xl transition-all cursor-pointer relative ${
            mobileTab === "sets"
              ? "bg-blue-600/20 text-blue-400 font-bold border border-blue-500/30"
              : "text-slate-400 hover:text-slate-200 hover:bg-[#1E293B]/50 font-medium"
          }`}
        >
          <Library className={`w-5 h-5 ${mobileTab === "sets" ? "text-blue-400" : ""}`} />
          <span className="text-[10px] leading-none">Collections</span>
          {cards.length > 0 && (
            <span className="absolute top-1 right-2 bg-[#0F1115] text-blue-400 border border-blue-500/40 text-[9px] font-black px-1 rounded-full">
              {cards.length}
            </span>
          )}
        </button>

        {/* Sheets Sync Tab */}
        <button
          onClick={() => setMobileTab("sync")}
          className={`flex-1 py-2 px-1 flex flex-col items-center gap-1 rounded-xl transition-all cursor-pointer relative ${
            mobileTab === "sync"
              ? "bg-emerald-600/20 text-emerald-400 font-bold border border-emerald-500/30"
              : "text-slate-400 hover:text-slate-200 hover:bg-[#1E293B]/50 font-medium"
          }`}
        >
          <FileSpreadsheet className={`w-5 h-5 ${user ? "text-emerald-400" : ""}`} />
          <span className="text-[10px] leading-none">Sheets</span>
          {user && (
            <span className="absolute top-1.5 right-3 w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          )}
        </button>
      </nav>

      {/* SHARE MODAL OVERLAY */}
      <ShareModal
        card={activeCard}
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        onExportPNG={handleExportCardPNG}
      />

      {/* FOOTER */}
      <footer className="border-t border-[#334155] bg-[#0F1115] py-4 text-center text-xs text-slate-500 font-semibold flex flex-col items-center gap-1.5 shrink-0 mb-12 sm:mb-0">
        <div className="flex items-center gap-1">
          <span>Crafted with</span>
          <Heart className="w-3 h-3 text-red-500 fill-red-500" />
          <span>for Trading Card Creators worldwide.</span>
        </div>
        <p className="text-[10px] text-slate-600">
          This application is powered by Essence CCG, Google AI Studio, and Google Workspace.
        </p>
      </footer>

      {/* Hidden Batch Export DOM Stage */}
      {batchExportCards.length > 0 && (
        <div
          id="hidden-export-stage"
          style={{
            position: "fixed",
            left: "-9999px",
            top: "-9999px",
            zIndex: -1000,
            pointerEvents: "none",
          }}
        >
          {batchExportCards.map((c) => (
            <CardPreview
              key={c.id}
              stageId={`batch-card-${c.id}`}
              card={c}
              onChangeCard={() => {}}
              onExport={() => {}}
              isExporting={true}
            />
          ))}
        </div>
      )}

      {/* Print Ready Grid Sheets Modal Overlay */}
      {isPrintPreviewOpen && (
        <div
          id="print-modal-container"
          className="fixed inset-0 bg-[#0F1115]/95 z-50 overflow-y-auto p-4 md:p-8 flex flex-col gap-6"
        >
          {/* Controls Header Panel - Hidden when printing via css .no-print */}
          <div className="no-print bg-[#161B22] border border-[#334155] rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 max-w-5xl mx-auto w-full shadow-2xl">
            <div>
              <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                <Printer className="w-4 h-4 text-emerald-400" />
                <span>Print-and-Play Sheets Generator</span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                Rendered at exact poker trading card dimensions: <strong className="text-slate-200">2.5 inches w x 3.5 inches h</strong> (arranged on standard US Letter grids). 
                Tip: Set layout to <strong className="text-slate-200">Portrait</strong>, Margins to <strong className="text-slate-200">None</strong>, and enable <strong className="text-slate-200">Background graphics</strong> in your browser print settings.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/10 transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>Launch Print Dialog</span>
              </button>
              <button
                onClick={() => setIsPrintPreviewOpen(false)}
                className="px-4 py-2 bg-[#1E293B] hover:bg-[#334155] border border-[#334155] text-slate-300 text-xs font-bold rounded-lg cursor-pointer transition-colors"
              >
                ✕ Close Preview
              </button>
            </div>
          </div>

          {/* Sheets Container */}
          <div className="flex-1 flex flex-col items-center justify-start gap-10 py-4">
            {chunkCards(printPreviewCards, 9).map((pageCards, pageIndex) => (
              <div
                key={pageIndex}
                className="print-page bg-white p-[0.3in] rounded-2xl md:rounded-none md:shadow-2xl border border-slate-700 md:border-transparent flex flex-col justify-between"
                style={{
                  width: "8.5in",
                  height: "11in",
                  boxSizing: "border-box",
                }}
              >
                {/* 3x3 Grid Layout */}
                <div
                  className="grid grid-cols-3 gap-[0.125in] mx-auto justify-center content-center"
                  style={{
                    width: "7.75in",
                    height: "10.4in",
                  }}
                >
                  {pageCards.map((card) => (
                    <div
                      key={card.id}
                      className="relative overflow-hidden bg-zinc-950 rounded-[14px] shadow-sm border border-slate-200/50"
                      style={{
                        width: "2.5in",
                        height: "3.5in",
                        boxSizing: "border-box",
                      }}
                    >
                      {/* Scale standard 400px x 580px template card by exact 0.60 to fit standard 2.5in x 3.5in box */}
                      <div
                        style={{
                          transform: "scale(0.60)",
                          transformOrigin: "top left",
                          width: "400px",
                          height: "580px",
                        }}
                      >
                        <CardPreview
                          card={card}
                          onChangeCard={() => {}}
                          onExport={() => {}}
                          isExporting={true}
                          stageId={`print-card-${card.id}`}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Print sheet counter footer */}
                <div className="text-center text-[10px] text-slate-500 font-semibold no-print pb-1">
                  Sheet {pageIndex + 1} of {Math.ceil(printPreviewCards.length / 9)}
                </div>
              </div>
            ))}
          </div>

          {/* Interactive stylesheet rules injected directly */}
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              /* Ensure only the print container is rendered to paper */
              body > *:not(#print-modal-container) {
                display: none !important;
              }
              #root > *:not(#print-modal-container) {
                display: none !important;
              }
              #print-modal-container {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                height: auto !important;
                background: white !important;
                color: black !important;
                padding: 0 !important;
                margin: 0 !important;
                overflow: visible !important;
              }
              .no-print {
                display: none !important;
              }
              .print-page {
                background: white !important;
                border: none !important;
                box-shadow: none !important;
                width: 8.5in !important;
                height: 11in !important;
                padding: 0.3in !important;
                margin: 0 !important;
                page-break-after: always !important;
                break-after: page !important;
                display: flex !important;
                flex-direction: column !important;
                justify-content: space-between !important;
                box-sizing: border-box !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              @page {
                size: portrait;
                margin: 0;
              }
            }
          `}} />
        </div>
      )}
    </div>
  );
}
