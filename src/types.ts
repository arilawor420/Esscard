export type CardType = "Pillar" | "Rune" | "Shield" | "Conjuring" | "Casting";

export type FrameType =
  | "Earth"
  | "Water"
  | "Wind"
  | "Fire"
  | "Life"
  | "Death"
  | "Time"
  | "Space";

export type AttributeType = "Earth" | "Water" | "Wind" | "Fire" | "Life" | "Death" | "Time" | "Space";

export interface Card {
  id: string;
  name: string;
  type: CardType | string;
  frameType: FrameType | string;
  attribute: AttributeType | string;
  level: number; // Star count (0-5) or level
  genre?: string; // 'fantasy' | 'scifi' | 'sports' | 'custom'
  cost?: string; // e.g. "3", "2 Mana", "50 Credit"
  flavorText?: string; // Flavor text italic at bottom
  monsterType: string; // Subtype / Typeline (e.g., "Dragon Warrior" or "Rookie Guard")
  cardText: string;
  atk: string; // Stat 1 value (e.g., "5", "3000", "99")
  def: string; // Stat 2 value (e.g., "4", "2500", "85")
  statLabel1?: string; // Custom Label for Stat 1 (e.g. "ATK", "PWR", "SPD")
  statLabel2?: string; // Custom Label for Stat 2 (e.g. "DEF", "HP", "STA")
  setId: string; // Associated set
  setNumber: string; // e.g., "BASE-EN001"
  rarity: string; // e.g., "Common", "Rare", "Legendary"
  creator: string; // e.g., "Illustrator Name"
  edition: string; // e.g., "1st Edition", "Promo"
  serialNumber: string; // 8-digit identification code
  artUrl: string; // Card image URL
  artScale: number; // scale factor
  artX: number; // translation X
  artY: number; // translation Y
  artRotation: number; // rotation in degrees
  // Custom frame template variables
  frameStyle?: "Standard" | "Metal" | "Crystal" | "Void" | "Chroma" | "Ancient";
  artHeight?: number; // range: 100 to 300
  artBorderRadius?: number; // range: 0 to 24
  showFlavorText?: boolean;
  showSubtype?: boolean;
  showCreatorBlock?: boolean;
  showSerialNumber?: boolean;
  customTextBoxes?: Array<{ id: string; label: string; text: string }>;
  // Optional / backward compatibility fields to satisfy TS compilation for existing code
  rank?: number;
  linkRating?: number;
  linkArrows?: string[];
  pendulumEnabled?: boolean;
  pendulumScaleLeft?: number;
  pendulumScaleRight?: number;
  pendulumText?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CardSet {
  id: string;
  name: string;
  description: string;
  sheetId?: string; // Connected spreadsheet ID
  sheetUrl?: string; // Connected spreadsheet URL
  sheetName?: string; // e.g., "My Custom Set"
  autoSync: boolean;
  createdAt?: string;
  updatedAt?: string;
}
