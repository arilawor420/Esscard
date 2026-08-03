import { Card, CardSet } from "../types";

/**
 * Creates a new Google Spreadsheet for a Card Set
 */
export async function createSetSpreadsheet(
  token: string,
  setName: string
): Promise<{ id: string; url: string }> {
  const response = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: {
        title: `Trading Card Maker - Set: ${setName}`,
      },
      sheets: [
        {
          properties: {
            title: "Cards",
          },
        },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to create Google Sheet: ${errText}`);
  }

  const data = await response.json();
  const spreadsheetId = data.spreadsheetId;
  const spreadsheetUrl = data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;

  // Initialize the Headers
  await initializeSheetHeaders(token, spreadsheetId);

  return { id: spreadsheetId, url: spreadsheetUrl };
}

/**
 * Initializes header columns in the Cards sheet
 */
async function initializeSheetHeaders(token: string, spreadsheetId: string) {
  const headers = [
    "Card ID",
    "Name",
    "Type",
    "Sub-Type",
    "Attribute",
    "Level/Rank/Link",
    "Monster/Spell Type",
    "ATK",
    "DEF",
    "Text / Description",
    "Rarity",
    "Creator",
    "Edition",
    "Set Code",
    "Serial Number",
    "Art URL",
    "Sync Time",
  ];

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Cards!A1:Q1?valueInputOption=USER_ENTERED`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        values: [headers],
      }),
    }
  );

  if (!response.ok) {
    console.error("Failed to set sheet headers:", await response.text());
  }
}

/**
 * Syncs multiple cards to a spreadsheet (overwriting/re-populating)
 */
export async function syncSetToSpreadsheet(
  token: string,
  spreadsheetId: string,
  cards: Card[]
): Promise<boolean> {
  // First clear the existing values under the headers
  const clearRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Cards!A2:Q1000:clear`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!clearRes.ok) {
    console.error("Failed to clear sheet rows before sync:", await clearRes.text());
  }

  if (cards.length === 0) return true;

  // Build the rows
  const rows = cards.map((card) => {
    let lvlRank = "";
    if (card.frameType === "Link") {
      lvlRank = `LINK-${card.linkRating}`;
    } else if (card.frameType === "Xyz") {
      lvlRank = `Rank ${card.rank}`;
    } else {
      lvlRank = `★${card.level}`;
    }

    const fullArtUrl = card.artUrl.startsWith("http")
      ? card.artUrl
      : window.location.origin + card.artUrl;

    return [
      card.id,
      card.name,
      card.type,
      card.frameType,
      card.attribute,
      lvlRank,
      card.monsterType,
      card.atk,
      card.def,
      card.cardText,
      card.rarity,
      card.creator,
      card.edition,
      card.setNumber,
      card.serialNumber,
      fullArtUrl,
      new Date().toISOString(),
    ];
  });

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Cards!A2?valueInputOption=USER_ENTERED`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        values: rows,
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to sync cards: ${errText}`);
  }

  return true;
}

/**
 * Appends or updates a single card submission in the spreadsheet
 */
export async function appendCardToSpreadsheet(
  token: string,
  spreadsheetId: string,
  card: Card
): Promise<boolean> {
  // Check if sheet needs headers first by trying to read A1:Q1
  try {
    const readHeadersRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Cards!A1:Q1`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (readHeadersRes.ok) {
      const data = await readHeadersRes.json();
      if (!data.values || data.values.length === 0) {
        await initializeSheetHeaders(token, spreadsheetId);
      }
    }
  } catch (err) {
    console.error("Error checking headers, will attempt to write", err);
  }

  // To prevent duplicates, we read current Cards and look for Card ID
  let existingRowIndex = -1;
  try {
    const readRowsRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Cards!A:A`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (readRowsRes.ok) {
      const data = await readRowsRes.json();
      if (data.values) {
        // Find if this card ID exists (A is 1-indexed, so index + 1 is the row)
        existingRowIndex = data.values.findIndex((row: string[]) => row[0] === card.id);
      }
    }
  } catch (err) {
    console.error("Error reading column A for dupe check, will append", err);
  }

  let lvlRank = "";
  if (card.frameType === "Link") {
    lvlRank = `LINK-${card.linkRating}`;
  } else if (card.frameType === "Xyz") {
    lvlRank = `Rank ${card.rank}`;
  } else {
    lvlRank = `★${card.level}`;
  }

  const fullArtUrl = card.artUrl.startsWith("http")
    ? card.artUrl
    : window.location.origin + card.artUrl;

  const row = [
    card.id,
    card.name,
    card.type,
    card.frameType,
    card.attribute,
    lvlRank,
    card.monsterType,
    card.atk,
    card.def,
    card.cardText,
    card.rarity,
    card.creator,
    card.edition,
    card.setNumber,
    card.serialNumber,
    fullArtUrl,
    new Date().toISOString(),
  ];

  if (existingRowIndex > 0) {
    // Update existing row (index is 0-based, so row number is index + 1)
    const rowNum = existingRowIndex + 1;
    const updateRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Cards!A${rowNum}:Q${rowNum}?valueInputOption=USER_ENTERED`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          values: [row],
        }),
      }
    );
    return updateRes.ok;
  } else {
    // Append new row
    const appendRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Cards!A:Q:append?valueInputOption=USER_ENTERED`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          values: [row],
        }),
      }
    );
    return appendRes.ok;
  }
}
