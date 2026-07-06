import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

// Initialize the GoogleGenAI SDK lazily inside route handlers
// to handle missing environment variables gracefully.
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is required");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
};

async function startServer() {
  const app = express();
  app.use(express.json());

  // API endpoint for providing contextual AI Sudoku hints
  app.post("/api/gemini/hint", async (req, res) => {
    try {
      const ai = getGeminiClient();
      const { level, tier, selectedCell, boardState, message, chatHistory } = req.body;

      // Serene and supportive tutor instruction matching the "Zen Sudoku" rustic mood
      const systemInstruction = `You are ZenMaster, a serene, wise, and highly supportive Sudoku AI Master Tutor.
Your goal is to guide players with elegant, mindful, and educational hints.
Theme context: The game uses warm earthy tones (Gentle Sand, Warm Clay, Terracotta, Deep Forest, Dark Walnut). Keep your language aligned with this peaceful, grounding aesthetic (e.g., references to sandy paths, slow breaths, shifting clay, ancient walnut leaves, or silent growth).

Sudoku Tutorial Guidelines:
1. DO NOT simply blurt out the correct answer immediately unless the user explicitly requests direct answers or is completely stuck.
2. Guide the player step-by-step. Suggest where they can scan (e.g., "Look closely at Column 3, it is nearly complete", or "The top-left block has an interesting vacancy").
3. Use standard Sudoku strategy terms when relevant (e.g., Single Candidate, Scanning Rows/Columns, Block Elimination, Naked Pairs), but explain them in a very simple, calm, human way.
4. If the player asks about a selected cell (e.g., Row 4, Column 5), check the board state provided. Identify if they have filled it, if it's correct (matches the solution), or if it's currently empty, and provide a mindful clue pointing them to the solution.
5. If they have made a mistake in their filled cells, you can gently point it out (e.g., "Ah, there appears to be a slight ripple in the sand at Row 2, Column 4...").
6. Always remain patient, calm, and encouraging. Never be clinical or robotic.`;

      // Build chat history context
      const formattedHistory = (chatHistory || []).map((msg: any) => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.text }],
      }));

      // Summarize the current board state in a clear, text-friendly format for the model
      let boardText = "";
      if (boardState && Array.isArray(boardState)) {
        boardText = "Current Board Grid (1-9, 0 is empty):\n";
        for (let r = 0; r < 9; r++) {
          const rowVals = boardState[r].map((cell: any) => cell.value);
          boardText += `Row ${r + 1}: ${rowVals.join(" ")}\n`;
        }

        boardText += "\nSolution Board Grid:\n";
        for (let r = 0; r < 9; r++) {
          const rowVals = boardState[r].map((cell: any) => cell.solutionValue);
          boardText += `Row ${r + 1}: ${rowVals.join(" ")}\n`;
        }
      }

      let contextPrompt = `Level: ${level}
Difficulty: ${tier}
`;

      if (selectedCell && selectedCell.row !== null && selectedCell.col !== null) {
        const cellInfo = boardState ? boardState[selectedCell.row][selectedCell.col] : null;
        contextPrompt += `Currently Selected Cell: Row ${selectedCell.row + 1}, Column ${selectedCell.col + 1}
- Cell State: ${cellInfo ? (cellInfo.isGiven ? "Given Clue" : cellInfo.value === 0 ? "Empty" : `User placed ${cellInfo.value}`) : "Unknown"}
- Correct Value should be: ${cellInfo ? cellInfo.solutionValue : "Unknown"}
`;
      } else {
        contextPrompt += "Selected Cell: None (the user hasn't selected a specific cell yet).\n";
      }

      if (boardText) {
        contextPrompt += `\n${boardText}\n`;
      }

      contextPrompt += `\nUser's Message: "${message}"\n\nGenerate your response. Provide specific, helpful hints relative to the current board and selected cell. Keep response concise, elegant, and under 3-4 short paragraphs.`;

      const contents = [
        ...formattedHistory,
        { role: "user", parts: [{ text: contextPrompt }] },
      ];

      const response = await ai.models.generateContent({
        model: "gemini-flash-latest",
        contents,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });

      res.json({ text: response.text });
    } catch (err: any) {
      console.error("Gemini API Error:", err);
      res.status(500).json({
        error: "API Failure",
        message: err.message || "An error occurred while contacting Gemini.",
      });
    }
  });

  // Serve static assets / handle Vite Dev Server
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

  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
