import { Card, CardSet } from "./types";

export const CARD_TYPES = ["Pillar", "Rune", "Shield", "Conjuring", "Casting"] as const;

export const FRAME_TYPES = [
  { value: "Earth", label: "Earth Essence (Emerald Green)" },
  { value: "Water", label: "Water Essence (Deep Ocean Blue)" },
  { value: "Wind", label: "Wind Essence (Vibrant Sky Blue)" },
  { value: "Fire", label: "Fire Essence (Elemental Crimson Flame)" },
  { value: "Life", label: "Life Essence (Prismatic Gold)" },
  { value: "Death", label: "Death Essence (Abyssal Purple Shadow)" },
  { value: "Time", label: "Time Essence (Retro Magenta/Rose)" },
  { value: "Space", label: "Space Essence (Metallic Indigo/Cosmic)" },
];

export const ATTRIBUTES = [
  { value: "Earth", label: "Earth (🍃)", color: "text-emerald-500 bg-emerald-50/10 border-emerald-500/20" },
  { value: "Water", label: "Water (💧)", color: "text-blue-500 bg-blue-50/10 border-blue-500/20" },
  { value: "Wind", label: "Wind (⚡)", color: "text-cyan-500 bg-cyan-50/10 border-cyan-500/20" },
  { value: "Fire", label: "Fire (🔥)", color: "text-red-500 bg-red-50/10 border-red-500/20" },
  { value: "Life", label: "Life (✨)", color: "text-yellow-500 bg-yellow-50/10 border-yellow-500/20" },
  { value: "Death", label: "Death (💀)", color: "text-purple-500 bg-purple-50/10 border-purple-500/20" },
  { value: "Time", label: "Time (⏳)", color: "text-pink-500 bg-pink-50/10 border-pink-500/20" },
  { value: "Space", label: "Space (🌌)", color: "text-indigo-500 bg-indigo-50/10 border-indigo-500/20" },
];

export const GENRES = [
  { value: "fantasy", label: "Fantasy / RPG Game" },
  { value: "scifi", label: "Sci-Fi / Cosmic" },
  { value: "custom", label: "Fully Customized Template" },
];

export const RARITIES = [
  { value: "Common", label: "Common", textColor: "text-slate-300 font-normal" },
  { value: "Uncommon", label: "Uncommon (Silver Foil)", textColor: "text-slate-200 font-semibold" },
  { value: "Rare", label: "Rare (Reflective Ice)", textColor: "text-blue-400 font-bold" },
  { value: "Epic", label: "Epic (Purple Holographic)", textColor: "text-purple-400 font-extrabold" },
  { value: "Legendary", label: "Legendary (Prismatic Gold)", textColor: "text-yellow-400 font-black" },
];

export const EDITIONS = ["1st Print", "Limited Edition", "Promo", "Standard Edition"] as const;

export const INITIAL_SETS: CardSet[] = [
  {
    id: "set-legendary",
    name: "Essence of Creation",
    description: "A magical card collection themed around Pillars, Runes, Shields, Conjurings, and Castings.",
    autoSync: false,
  },
];

export const INITIAL_CARDS: Card[] = [
  {
    id: "card-1",
    name: "Ignis Primus",
    type: "Conjuring",
    frameType: "Fire",
    attribute: "Fire",
    level: 5,
    genre: "fantasy",
    cost: "3 Fire Essence",
    monsterType: "Conjuring - Fire Elemental",
    cardText: "Summon: Deal 2 Fire damage to all opposing Shields.\n\nWhile this Conjuring is active, all your Fire Castings cost 1 less Essence.",
    flavorText: "\"The flame is the beginning and the end of all matter.\"",
    atk: "6",
    def: "5",
    statLabel1: "ATK",
    statLabel2: "HP",
    setId: "set-legendary",
    setNumber: "ESS-EN001",
    rarity: "Legendary",
    creator: "Vesper Sparrow",
    edition: "1st Print",
    serialNumber: "84729105",
    artUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80",
    artScale: 1.0,
    artX: 0,
    artY: 0,
    artRotation: 0,
  },
  {
    id: "card-2",
    name: "Chronos Gate",
    type: "Pillar",
    frameType: "Time",
    attribute: "Time",
    level: 4,
    genre: "fantasy",
    cost: "4 Time Essence",
    monsterType: "Pillar - Time Mechanism",
    cardText: "At the end of your turn, you may draw an additional card.\n\nSacrifice Chronos Gate: Undo the last action taken during your turn.",
    flavorText: "\"Time is a circle, not a line. We are merely travelers upon its circumference.\"",
    atk: "",
    def: "",
    statLabel1: "ATK",
    statLabel2: "HP",
    setId: "set-legendary",
    setNumber: "ESS-EN042",
    rarity: "Rare",
    creator: "Nova Nexus Art",
    edition: "Standard Edition",
    serialNumber: "19283746",
    artUrl: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=600&q=80",
    artScale: 1.1,
    artX: 0,
    artY: 0,
    artRotation: 0,
  },
];
