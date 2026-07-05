/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum DifficultyTier {
  GentleSand = "Gentle Sand",     // Easy, 1-200
  WarmClay = "Warm Clay",         // Medium, 201-400
  Terracotta = "Terracotta",       // Hard, 401-600
  DeepForest = "Deep Forest",     // Expert, 601-800
  DarkWalnut = "Dark Walnut",     // Master, 801-1000+
}

export interface Cell {
  row: number;
  col: number;
  value: number;       // 0 means empty
  givenValue: number;  // Initial value (0 if empty)
  solutionValue: number; // Correct solution value
  isGiven: boolean;
  notes: Set<number>;
  isValid: boolean;    // false if conflicting or incorrect
}

export interface GameState {
  level: number;
  tier: DifficultyTier;
  cells: Cell[][];
  startTime: number;
  elapsedTime: number; // in seconds
  isPaused: boolean;
  isCompleted: boolean;
  errorCount: number;
  moveCount: number;
  selectedRow: number | null;
  selectedCol: number | null;
  inputMode: "cell-first" | "number-first"; // Object-Action or Paint mode
  selectedNumber: number | null; // Selected number in paint mode or for highlight
  zenMode: boolean; // Toggleable timer/error/move counter
  autoClearNotes: boolean;
}

export interface HistoryState {
  cells: {
    row: number;
    col: number;
    value: number;
    notes: number[];
  }[][];
}

export interface LevelStats {
  level: number;
  completed: boolean;
  timeTaken?: number;
  bestTime?: number;
}
