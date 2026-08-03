import express from "express";
import path from "path";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Ensure storage folders exist
const DATA_DIR = path.join(process.cwd(), "data");
const IMAGES_DIR = path.join(DATA_DIR, "images");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

// Database JSON path
const DB_PATH = path.join(DATA_DIR, "db.json");

// Helper to read database
function readDB() {
  if (!fs.existsSync(DB_PATH)) {
    // Seed with empty arrays
    const defaultDB = { cards: [], sets: [] };
    fs.writeFileSync(DB_PATH, JSON.stringify(defaultDB, null, 2));
    return defaultDB;
  }
  try {
    const content = fs.readFileSync(DB_PATH, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    console.error("Failed to read db.json:", error);
    return { cards: [], sets: [] };
  }
}

// Helper to write database
function writeDB(data: any) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Failed to write db.json:", error);
  }
}

// Lazy Gemini AI initialization
let aiClient: GoogleGenAI | null = null;
function getGeminiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      throw new Error("GEMINI_API_KEY environment variable is not configured. Please add it via the Settings menu.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Express middlewares
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Serve saved generated images with permissive CORS for high-resolution canvas export!
app.use("/data/images", (req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
}, express.static(IMAGES_DIR));

// --- API ROUTES ---

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// AI Image Generation Endpoint
app.post("/api/gemini/generate-image", async (req, res) => {
  try {
    const { prompt, aspectRatio, forceLite = false } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required." });
    }

    const ai = getGeminiClient();

    // Use gemini-3.1-flash-lite-image by default, or upgrade to gemini-3.1-flash-image if requested
    // Note: Since gemini-3.1-flash-image is paid, we can let user use either depending on preference.
    const selectedModel = forceLite ? "gemini-3.1-flash-lite-image" : "gemini-3.1-flash-image";

    console.log(`Generating image using model: ${selectedModel} with prompt: "${prompt}" and aspect ratio: ${aspectRatio}`);

    const response = await ai.models.generateContent({
      model: selectedModel,
      contents: {
        parts: [
          {
            text: prompt,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio || "1:1",
          imageSize: "1K", // High resolution
        },
      },
    });

    const parts = response.candidates?.[0]?.content?.parts;
    let base64Image = "";
    let mimeType = "image/png";

    if (parts) {
      for (const part of parts) {
        if (part.inlineData) {
          base64Image = part.inlineData.data;
          if (part.inlineData.mimeType) {
            mimeType = part.inlineData.mimeType;
          }
          break;
        }
      }
    }

    if (!base64Image) {
      return res.status(500).json({ error: "No image was returned by the AI model. Try a different prompt." });
    }

    // Save image to local disk so it is served on the same origin (prevents canvas export CORS errors)
    const imageId = `art_${Date.now()}_${Math.round(Math.random() * 1000)}`;
    const extension = mimeType.split("/")[1] || "png";
    const filename = `${imageId}.${extension}`;
    const filePath = path.join(IMAGES_DIR, filename);

    fs.writeFileSync(filePath, Buffer.from(base64Image, "base64"));

    // Return the relative URL so it's loaded from the same origin
    const relativeUrl = `/data/images/${filename}`;
    res.json({ url: relativeUrl, filename });
  } catch (error: any) {
    console.error("Image generation error:", error);
    res.status(500).json({ error: error.message || "Failed to generate image." });
  }
});

// Proxy route for CORS-free external images (just in case they use random internet URLs)
app.get("/api/proxy-image", async (req, res) => {
  const { url } = req.query;
  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "URL is required" });
  }

  try {
    const imageRes = await fetch(url);
    if (!imageRes.ok) {
      throw new Error(`Failed to fetch original image: ${imageRes.statusText}`);
    }

    const arrayBuffer = await imageRes.arrayBuffer();
    const contentType = imageRes.headers.get("content-type") || "image/png";

    res.header("Content-Type", contentType);
    res.header("Access-Control-Allow-Origin", "*");
    res.send(Buffer.from(arrayBuffer));
  } catch (error: any) {
    console.error("Proxy image error:", error);
    res.status(500).json({ error: error.message || "Failed to proxy image." });
  }
});

// Cards Database Endpoints
app.get("/api/cards", (req, res) => {
  const db = readDB();
  res.json(db);
});

// Save or Update card
app.post("/api/cards", (req, res) => {
  try {
    const card = req.body;
    if (!card.id) {
      return res.status(400).json({ error: "Card must have an ID." });
    }

    const db = readDB();
    const existingIndex = db.cards.findIndex((c: any) => c.id === card.id);

    if (existingIndex > -1) {
      db.cards[existingIndex] = { ...db.cards[existingIndex], ...card, updatedAt: new Date().toISOString() };
    } else {
      db.cards.push({ ...card, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }

    writeDB(db);
    res.json({ success: true, card });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to save card." });
  }
});

// Delete Card
app.delete("/api/cards/:id", (req, res) => {
  try {
    const { id } = req.params;
    const db = readDB();
    db.cards = db.cards.filter((c: any) => c.id !== id);
    writeDB(db);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to delete card." });
  }
});

// Save or Update Set
app.post("/api/sets", (req, res) => {
  try {
    const set = req.body;
    if (!set.id) {
      return res.status(400).json({ error: "Set must have an ID." });
    }

    const db = readDB();
    const existingIndex = db.sets.findIndex((s: any) => s.id === set.id);

    if (existingIndex > -1) {
      db.sets[existingIndex] = { ...db.sets[existingIndex], ...set, updatedAt: new Date().toISOString() };
    } else {
      db.sets.push({ ...set, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }

    writeDB(db);
    res.json({ success: true, set });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to save set." });
  }
});

// Delete Set
app.delete("/api/sets/:id", (req, res) => {
  try {
    const { id } = req.params;
    const db = readDB();
    db.sets = db.sets.filter((s: any) => s.id !== id);
    // Also remove card references or update cards that belong to this set
    db.cards = db.cards.map((c: any) => c.setId === id ? { ...c, setId: "" } : c);
    writeDB(db);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to delete set." });
  }
});

// Start server and handle Vite middleware
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
