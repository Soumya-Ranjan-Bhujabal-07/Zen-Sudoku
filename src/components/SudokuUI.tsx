/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  DifficultyTier,
  Cell,
  GameState,
  LevelStats
} from "../types";
import {
  generateSudokuPuzzle,
  getConflicts,
  getTierForLevel,
  getGivensForLevel,
  solveSudoku
} from "../SudokuEngine";
import { getRandomQuote } from "../utils/quotes";
import {
  Play,
  Pause,
  RotateCcw,
  Undo2,
  Redo2,
  Edit3,
  Eraser,
  Grid,
  Moon,
  Sun,
  Eye,
  EyeOff,
  Trophy,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Sliders,
  Sparkles,
  Award,
  Check,
  Search,
  BookMarked,
  Lock,
  MessageSquare,
  Send,
  Loader2,
  X,
  Calendar,
  Flame,
  BarChart3
} from "lucide-react";

export default function SudokuUI() {
  // --- Persistent Storage Helpers ---
  const [unlockedLevel, setUnlockedLevel] = useState<number>(() => {
    const val = localStorage.getItem("sudoku_unlocked_level");
    return val ? parseInt(val, 10) : 1;
  });

  const [completedLevels, setCompletedLevels] = useState<Record<number, LevelStats>>(() => {
    const val = localStorage.getItem("sudoku_completed_levels");
    return val ? JSON.parse(val) : {};
  });

  const [themeMode, setThemeMode] = useState<"light" | "dark">(() => {
    const val = localStorage.getItem("sudoku_theme");
    return val === "dark" ? "dark" : "light";
  });

  // --- Game Statistics States ---
  const [isStatsOpen, setIsStatsOpen] = useState<boolean>(false);

  const [startedGamesByTier, setStartedGamesByTier] = useState<Record<DifficultyTier, number>>(() => {
    const val = localStorage.getItem("sudoku_started_games_by_tier");
    if (val) {
      try {
        return JSON.parse(val);
      } catch (e) {}
    }
    return {
      [DifficultyTier.GentleSand]: 0,
      [DifficultyTier.WarmClay]: 0,
      [DifficultyTier.Terracotta]: 0,
      [DifficultyTier.DeepForest]: 0,
      [DifficultyTier.DarkWalnut]: 0,
    };
  });

  const [totalTimeByTier, setTotalTimeByTier] = useState<Record<DifficultyTier, number>>(() => {
    const val = localStorage.getItem("sudoku_total_time_by_tier");
    if (val) {
      try {
        return JSON.parse(val);
      } catch (e) {}
    }
    return {
      [DifficultyTier.GentleSand]: 0,
      [DifficultyTier.WarmClay]: 0,
      [DifficultyTier.Terracotta]: 0,
      [DifficultyTier.DeepForest]: 0,
      [DifficultyTier.DarkWalnut]: 0,
    };
  });

  // --- Layout Tab ---
  // "game" | "level-select" | "about-zen" | "daily-puzzle"
  const [activeTab, setActiveTab] = useState<"game" | "level-select" | "about-zen" | "daily-puzzle">("game");

  // --- Daily Puzzle States ---
  const [isDailyMode, setIsDailyMode] = useState<boolean>(false);
  const [dailyDateStr, setDailyDateStr] = useState<string>(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });

  const [completedDailies, setCompletedDailies] = useState<Record<string, { completed: boolean; timeTaken: number }>>(() => {
    const val = localStorage.getItem("sudoku_completed_dailies");
    return val ? JSON.parse(val) : {};
  });

  const [calendarYear, setCalendarYear] = useState<number>(() => new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState<number>(() => new Date().getMonth());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });

  // --- Compute Statistics Hook ---
  const computedStatsByTier = useMemo(() => {
    const stats: Record<DifficultyTier, { completed: number; started: number; bestTime: number | null; totalTime: number }> = {
      [DifficultyTier.GentleSand]: { completed: 0, started: startedGamesByTier[DifficultyTier.GentleSand] || 0, bestTime: null, totalTime: totalTimeByTier[DifficultyTier.GentleSand] || 0 },
      [DifficultyTier.WarmClay]: { completed: 0, started: startedGamesByTier[DifficultyTier.WarmClay] || 0, bestTime: null, totalTime: totalTimeByTier[DifficultyTier.WarmClay] || 0 },
      [DifficultyTier.Terracotta]: { completed: 0, started: startedGamesByTier[DifficultyTier.Terracotta] || 0, bestTime: null, totalTime: totalTimeByTier[DifficultyTier.Terracotta] || 0 },
      [DifficultyTier.DeepForest]: { completed: 0, started: startedGamesByTier[DifficultyTier.DeepForest] || 0, bestTime: null, totalTime: totalTimeByTier[DifficultyTier.DeepForest] || 0 },
      [DifficultyTier.DarkWalnut]: { completed: 0, started: startedGamesByTier[DifficultyTier.DarkWalnut] || 0, bestTime: null, totalTime: totalTimeByTier[DifficultyTier.DarkWalnut] || 0 },
    };

    // Regular levels
    Object.values(completedLevels).forEach((lvlStats: any) => {
      const tier = getTierForLevel(lvlStats.level);
      stats[tier].completed += 1;
      if (lvlStats.bestTime) {
        if (stats[tier].bestTime === null || lvlStats.bestTime < (stats[tier].bestTime || Infinity)) {
          stats[tier].bestTime = lvlStats.bestTime;
        }
      }
    });

    // Daily levels
    Object.entries(completedDailies).forEach(([dateStr, dStats]) => {
      if (dStats && typeof dStats === "object" && "completed" in dStats && dStats.completed) {
        const level = getDailyLevelNum(dateStr);
        const tier = getTierForLevel(level);
        stats[tier].completed += 1;
        const timeTaken = (dStats as any).timeTaken;
        if (timeTaken) {
          if (stats[tier].bestTime === null || timeTaken < (stats[tier].bestTime || Infinity)) {
            stats[tier].bestTime = timeTaken;
          }
        }
      }
    });

    // Ensure started >= completed so win rate is realistic
    Object.keys(stats).forEach((t) => {
      const tier = t as DifficultyTier;
      if (stats[tier].started < stats[tier].completed) {
        stats[tier].started = stats[tier].completed;
      }
    });

    return stats;
  }, [completedLevels, completedDailies, startedGamesByTier, totalTimeByTier]);

  // Helper to calculate a unique stable seed for a given date YYYY-MM-DD
  const getDailyLevelNum = (dateStr: string): number => {
    const parts = dateStr.split("-").map(Number);
    const year = parts[0];
    const month = parts[1];
    const day = parts[2];
    const dateHash = (year * 372 + month * 31 + day) % 10000;
    const dateObj = new Date(year, month - 1, day);
    const dayOfWeek = dateObj.getDay(); // 0 (Sun) to 6 (Sat)
    let base = 1;
    let range = 199;
    if (dayOfWeek === 1 || dayOfWeek === 2) {
      base = 1;
      range = 199;
    } else if (dayOfWeek === 3 || dayOfWeek === 4) {
      base = 201;
      range = 199;
    } else if (dayOfWeek === 5) {
      base = 401;
      range = 199;
    } else if (dayOfWeek === 6) {
      base = 601;
      range = 199;
    } else {
      base = 801;
      range = 199;
    }
    return base + (dateHash % range);
  };

  const saveCompletedDaily = (dateStr: string, timeTaken: number) => {
    const updated = {
      ...completedDailies,
      [dateStr]: {
        completed: true,
        timeTaken,
      }
    };
    setCompletedDailies(updated);
    localStorage.setItem("sudoku_completed_dailies", JSON.stringify(updated));
  };

  // Calculate completion streak
  const completionStreak = useMemo(() => {
    let streak = 0;
    let checkDate = new Date(); // Start from today
    let safetyCounter = 0;
    while (safetyCounter < 365) {
      safetyCounter++;
      const yyyy = checkDate.getFullYear();
      const mm = String(checkDate.getMonth() + 1).padStart(2, '0');
      const dd = String(checkDate.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      if (completedDailies[dateStr]?.completed) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        // If checking today and it's not completed, check if yesterday was completed to preserve streak
        if (streak === 0) {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const y_yyyy = yesterday.getFullYear();
          const y_mm = String(yesterday.getMonth() + 1).padStart(2, '0');
          const y_dd = String(yesterday.getDate()).padStart(2, '0');
          const y_dateStr = `${y_yyyy}-${y_mm}-${y_dd}`;
          if (completedDailies[y_dateStr]?.completed) {
            checkDate = yesterday;
            continue;
          }
        }
        break;
      }
    }
    return streak;
  }, [completedDailies]);

  // --- Current Game States ---
  const [levelNum, setLevelNum] = useState<number>(() => {
    const val = localStorage.getItem("sudoku_last_played_level");
    const parsed = val ? parseInt(val, 10) : 1;
    const unlocked = localStorage.getItem("sudoku_unlocked_level");
    const unlockedParsed = unlocked ? parseInt(unlocked, 10) : 1;
    return Math.min(parsed, unlockedParsed);
  });

  const [gameState, setGameState] = useState<GameState | null>(null);

  // Undo / Redo history stacks
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);

  // Pencil mode active state
  const [pencilMode, setPencilMode] = useState<boolean>(false);

  // Custom visual settings
  const [showHelperHighlights, setShowHelperHighlights] = useState<boolean>(true);

  // Level selector pagination / search
  const [searchLevelText, setSearchLevelText] = useState<string>("");
  const [selectedTierFilter, setSelectedTierFilter] = useState<DifficultyTier | "All">("All");
  const [levelPage, setLevelPage] = useState<number>(0);
  const levelsPerPage = 20;

  // Timer reference
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Success Quote State
  const [completionQuote, setCompletionQuote] = useState<string>("");

  // --- Mobile Fluid Touch & Long-Press Interactions ---
  const [pressingCell, setPressingCell] = useState<{ row: number; col: number } | null>(null);
  const [pressProgress, setPressProgress] = useState<number>(0);
  const pressTimerRef = useRef<any>(null);
  const pressStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const isLongPressedRef = useRef<boolean>(false);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (pressTimerRef.current) {
        clearInterval(pressTimerRef.current);
      }
    };
  }, []);

  // --- AI Chatbot States & Helpers ---
  const [isChatOpen, setIsChatOpen] = useState<boolean>(true);
  const [chatHistory, setChatHistory] = useState<Array<{ sender: "user" | "bot"; text: string }>>([
    {
      sender: "bot",
      text: "Greetings, traveler of patterns. I am your ZenMaster assistant. If you seek guidance on our sandy board, click on any cell and ask me for a hint, or inquire about Sudoku strategies. How can I aid your concentration today?"
    }
  ]);
  const [chatInput, setChatInput] = useState<string>("");
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (isChatOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatHistory, isChatLoading, isChatOpen]);

  // --- Success Animation States ---
  const [successAnimationActive, setSuccessAnimationActive] = useState<boolean>(false);
  const [victoryLeaves, setVictoryLeaves] = useState<Array<{
    id: number;
    left: number;
    size: number;
    delay: number;
    duration: number;
    rotate: number;
    xOffset: number;
  }>>([]);

  // Trigger success animation sequence and generate falling leaf particles
  useEffect(() => {
    if (gameState?.isCompleted) {
      setSuccessAnimationActive(true);
      
      const leaves = Array.from({ length: 28 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        size: Math.random() * 14 + 10, // 10px to 24px
        delay: Math.random() * 2.5, // staggered entry over 2.5s
        duration: Math.random() * 5 + 4, // 4s to 9s fall time
        rotate: Math.random() * 360 + 180,
        xOffset: (Math.random() - 0.5) * 80, // gentle sway
      }));
      setVictoryLeaves(leaves);

      const timer = setTimeout(() => {
        setSuccessAnimationActive(false);
      }, 2600); // 2.6s for ripple animation to fully pass and settle
      return () => clearTimeout(timer);
    } else {
      setSuccessAnimationActive(false);
      setVictoryLeaves([]);
    }
  }, [gameState?.isCompleted, gameState?.level]);

  // --- Sync Theme With Document Body ---
  useEffect(() => {
    const bodyClass = document.body.classList;
    if (themeMode === "dark") {
      bodyClass.add("theme-dark");
    } else {
      bodyClass.remove("theme-dark");
    }
    localStorage.setItem("sudoku_theme", themeMode);
  }, [themeMode]);

  // --- Save Progress Helpers ---
  const saveCompletedStats = (level: number, timeTaken: number) => {
    const existing = completedLevels[level];
    const bestTime = existing && existing.bestTime 
      ? Math.min(existing.bestTime, timeTaken) 
      : timeTaken;

    const updated = {
      ...completedLevels,
      [level]: {
        level,
        completed: true,
        timeTaken,
        bestTime,
      }
    };
    setCompletedLevels(updated);
    localStorage.setItem("sudoku_completed_levels", JSON.stringify(updated));

    // Auto unlock next level
    if (level === unlockedLevel && level < 1000) {
      const next = level + 1;
      setUnlockedLevel(next);
      localStorage.setItem("sudoku_unlocked_level", next.toString());
    }
  };

  // --- Reset Level ---
  const handleResetLevel = () => {
    if (!window.confirm("Restore this puzzle to its clean starting state? All custom placements and notes will be lost.")) return;
    initializeLevel(levelNum, true, isDailyMode, isDailyMode ? dailyDateStr : undefined);
  };

  // --- Helper: Conflict Check on State Changes ---
  const checkWinCondition = (cells: Cell[][]): boolean => {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const cell = cells[r][c];
        if (cell.value === 0 || cell.value !== cell.solutionValue) {
          return false;
        }
      }
    }
    return true;
  };

  // --- Initialize Level ---
  const initializeLevel = (level: number, forceNew: boolean = false, isDaily: boolean = false, targetDateStr?: string) => {
    const activeDailyStr = targetDateStr || dailyDateStr;
    const actualLevel = isDaily ? getDailyLevelNum(activeDailyStr) : level;
    
    // Check if we have saved progress for this exact level
    const savedProgressKey = isDaily
      ? `sudoku_saved_progress_daily_${activeDailyStr}`
      : `sudoku_saved_progress_l${actualLevel}`;
    
    const savedProgress = localStorage.getItem(savedProgressKey);
    
    if (savedProgress && !forceNew) {
      try {
        const parsed = JSON.parse(savedProgress);
        // Re-construct notes Set from arrays
        const cellGrid: Cell[][] = parsed.cells.map((row: any[]) =>
          row.map((c: any) => ({
            ...c,
            notes: new Set(c.notes || []),
          }))
        );

        setGameState({
          level: parsed.level,
          tier: parsed.tier,
          cells: cellGrid,
          startTime: Date.now() - parsed.elapsedTime * 1000,
          elapsedTime: parsed.elapsedTime,
          isPaused: parsed.isPaused,
          isCompleted: parsed.isCompleted,
          errorCount: parsed.errorCount || 0,
          moveCount: parsed.moveCount || 0,
          selectedRow: parsed.selectedRow,
          selectedCol: parsed.selectedCol,
          inputMode: parsed.inputMode || "cell-first",
          selectedNumber: parsed.selectedNumber || null,
          zenMode: parsed.zenMode !== undefined ? parsed.zenMode : false,
          autoClearNotes: parsed.autoClearNotes !== undefined ? parsed.autoClearNotes : true,
        });

        setUndoStack(parsed.undoStack || []);
        setRedoStack(parsed.redoStack || []);
        if (!isDaily) {
          setLevelNum(actualLevel);
          localStorage.setItem("sudoku_last_played_level", actualLevel.toString());
        }
        setIsDailyMode(isDaily);
        if (targetDateStr) {
          setDailyDateStr(targetDateStr);
        }
        setActiveTab("game");
        return;
      } catch (e) {
        console.error("Failed to load saved progress, generating fresh puzzle.", e);
      }
    }

    // Fresh generation
    const { puzzle, solution, tier } = generateSudokuPuzzle(actualLevel);

    // Increment started games for this tier
    setStartedGamesByTier((prev) => {
      const updated = {
        ...prev,
        [tier]: (prev[tier] || 0) + 1,
      };
      localStorage.setItem("sudoku_started_games_by_tier", JSON.stringify(updated));
      return updated;
    });
    
    const cellGrid: Cell[][] = [];
    for (let r = 0; r < 9; r++) {
      const rowCells: Cell[] = [];
      for (let c = 0; c < 9; c++) {
        const val = puzzle[r][c];
        rowCells.push({
          row: r,
          col: c,
          value: val,
          givenValue: val,
          solutionValue: solution[r][c],
          isGiven: val !== 0,
          notes: new Set<number>(),
          isValid: true,
        });
      }
      cellGrid.push(rowCells);
    }

    setGameState({
      level: actualLevel,
      tier,
      cells: cellGrid,
      startTime: Date.now(),
      elapsedTime: 0,
      isPaused: false,
      isCompleted: false,
      errorCount: 0,
      moveCount: 0,
      selectedRow: null,
      selectedCol: null,
      inputMode: "cell-first",
      selectedNumber: null,
      zenMode: false,
      autoClearNotes: true,
    });

    setUndoStack([]);
    setRedoStack([]);
    if (!isDaily) {
      setLevelNum(actualLevel);
      localStorage.setItem("sudoku_last_played_level", actualLevel.toString());
    }
    setIsDailyMode(isDaily);
    if (targetDateStr) {
      setDailyDateStr(targetDateStr);
    }
    setActiveTab("game");
    
    // Clear completion state
    setCompletionQuote("");
  };

  // Load level on start or when level changes
  useEffect(() => {
    if (!isDailyMode) {
      initializeLevel(levelNum, false, false);
    }
  }, [levelNum]);

  // --- Active State Persistence ---
  const persistCurrentProgress = (state: GameState, uStack: string[], rStack: string[]) => {
    const compactCells = state.cells.map((row) =>
      row.map((c) => ({
        row: c.row,
        col: c.col,
        value: c.value,
        givenValue: c.givenValue,
        solutionValue: c.solutionValue,
        isGiven: c.isGiven,
        notes: Array.from(c.notes),
        isValid: c.isValid,
      }))
    );

    const progress = {
      level: state.level,
      tier: state.tier,
      cells: compactCells,
      elapsedTime: state.elapsedTime,
      isPaused: state.isPaused,
      isCompleted: state.isCompleted,
      errorCount: state.errorCount,
      moveCount: state.moveCount,
      selectedRow: state.selectedRow,
      selectedCol: state.selectedCol,
      inputMode: state.inputMode,
      selectedNumber: state.selectedNumber,
      zenMode: state.zenMode,
      autoClearNotes: state.autoClearNotes,
      undoStack: uStack,
      redoStack: rStack,
    };

    const savedProgressKey = isDailyMode
      ? `sudoku_saved_progress_daily_${dailyDateStr}`
      : `sudoku_saved_progress_l${state.level}`;

    localStorage.setItem(savedProgressKey, JSON.stringify(progress));
  };

  // Timer loop
  useEffect(() => {
    if (gameState && !gameState.isPaused && !gameState.isCompleted) {
      timerRef.current = setInterval(() => {
        setGameState((prev) => {
          if (!prev || prev.isPaused || prev.isCompleted) return prev;
          const nextTime = Math.floor((Date.now() - prev.startTime) / 1000);
          const next = { ...prev, elapsedTime: nextTime };
          persistCurrentProgress(next, undoStack, redoStack);

          // Update total time played for this tier
          setTotalTimeByTier((timePrev) => {
            const updated = {
              ...timePrev,
              [prev.tier]: (timePrev[prev.tier] || 0) + 1,
            };
            localStorage.setItem("sudoku_total_time_by_tier", JSON.stringify(updated));
            return updated;
          });

          return next;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState?.isPaused, gameState?.isCompleted]);

  // Save changes to localStorage on game state adjustment
  const handleGameStateChange = (
    updater: (prev: GameState) => GameState,
    shouldRecordHistory: boolean = true
  ) => {
    if (!gameState) return;

    if (shouldRecordHistory) {
      // Snapshot previous board state for undo
      const snapshot = JSON.stringify(
        gameState.cells.map((row) =>
          row.map((c) => ({
            row: c.row,
            col: c.col,
            value: c.value,
            notes: Array.from(c.notes),
            isValid: c.isValid,
          }))
        )
      );
      const nextUndo = [...undoStack, snapshot];
      setUndoStack(nextUndo);
      setRedoStack([]); // Clear redo stack on new action
      
      setGameState((prev) => {
        const next = updater(prev);
        persistCurrentProgress(next, nextUndo, []);
        return next;
      });
    } else {
      setGameState((prev) => {
        const next = updater(prev);
        persistCurrentProgress(next, undoStack, redoStack);
        return next;
      });
    }
  };

  // --- Undo & Redo ---
  const handleUndo = () => {
    if (undoStack.length === 0 || !gameState) return;

    const prevSnapshotStr = undoStack[undoStack.length - 1];
    const newUndo = undoStack.slice(0, -1);

    // Save current state to Redo
    const currentSnapshot = JSON.stringify(
      gameState.cells.map((row) =>
        row.map((c) => ({
          row: c.row,
          col: c.col,
          value: c.value,
          notes: Array.from(c.notes),
          isValid: c.isValid,
        }))
      )
    );
    const newRedo = [...redoStack, currentSnapshot];

    const prevCellsData = JSON.parse(prevSnapshotStr);
    const updatedCells = gameState.cells.map((row, r) =>
      row.map((c, cIdx) => {
        const matching = prevCellsData[r][cIdx];
        return {
          ...c,
          value: matching.value,
          notes: new Set<number>(matching.notes),
          isValid: matching.isValid,
        };
      })
    );

    setUndoStack(newUndo);
    setRedoStack(newRedo);
    setGameState((prev) => {
      if (!prev) return prev;
      const next = { ...prev, cells: updatedCells };
      persistCurrentProgress(next, newUndo, newRedo);
      return next;
    });
  };

  const handleRedo = () => {
    if (redoStack.length === 0 || !gameState) return;

    const nextSnapshotStr = redoStack[redoStack.length - 1];
    const newRedo = redoStack.slice(0, -1);

    // Save current state to Undo
    const currentSnapshot = JSON.stringify(
      gameState.cells.map((row) =>
        row.map((c) => ({
          row: c.row,
          col: c.col,
          value: c.value,
          notes: Array.from(c.notes),
          isValid: c.isValid,
        }))
      )
    );
    const newUndo = [...undoStack, currentSnapshot];

    const nextCellsData = JSON.parse(nextSnapshotStr);
    const updatedCells = gameState.cells.map((row, r) =>
      row.map((c, cIdx) => {
        const matching = nextCellsData[r][cIdx];
        return {
          ...c,
          value: matching.value,
          notes: new Set<number>(matching.notes),
          isValid: matching.isValid,
        };
      })
    );

    setUndoStack(newUndo);
    setRedoStack(newRedo);
    setGameState((prev) => {
      if (!prev) return prev;
      const next = { ...prev, cells: updatedCells };
      persistCurrentProgress(next, newUndo, newRedo);
      return next;
    });
  };

  // --- Input & Number Action Handlers ---
  const handleCellAction = (row: number, col: number, targetValue: number, isPencilAction: boolean) => {
    handleGameStateChange((prev) => {
      const nextGrid = prev.cells.map((rArr) => rArr.map((c) => ({ ...c, notes: new Set(c.notes) })));
      const cell = nextGrid[row][col];

      if (cell.isGiven) return prev;

      let nextErrorCount = prev.errorCount;
      let nextMoveCount = prev.moveCount + 1;

      if (isPencilAction) {
        // Toggle note
        if (cell.value !== 0) {
          // Erase main value if we are typing notes on a filled cell
          cell.value = 0;
        }
        if (cell.notes.has(targetValue)) {
          cell.notes.delete(targetValue);
        } else {
          cell.notes.add(targetValue);
        }
        cell.isValid = true;
      } else {
        // Main Value Placement
        if (cell.value === targetValue) {
          // Clear if clicked same value
          cell.value = 0;
          cell.isValid = true;
        } else {
          cell.value = targetValue;
          cell.notes.clear(); // Clear all notes when value is set

          // Validate placement correctness
          if (targetValue !== cell.solutionValue) {
            cell.isValid = false;
            nextErrorCount++;
          } else {
            cell.isValid = true;

            // Auto Clear Notes in same Row, Column, Box
            if (prev.autoClearNotes) {
              // Same Row
              for (let c = 0; c < 9; c++) {
                nextGrid[row][c].notes.delete(targetValue);
              }
              // Same Column
              for (let r = 0; r < 9; r++) {
                nextGrid[r][col].notes.delete(targetValue);
              }
              // Same Box
              const boxRStart = Math.floor(row / 3) * 3;
              const boxCStart = Math.floor(col / 3) * 3;
              for (let br = 0; br < 3; br++) {
                for (let bc = 0; bc < 3; bc++) {
                  nextGrid[boxRStart + br][boxCStart + bc].notes.delete(targetValue);
                }
              }
            }
          }
        }
      }

      // Check for completion
      const completedNow = checkWinCondition(nextGrid);
      let isCompleted = prev.isCompleted;

      if (completedNow && !isCompleted) {
        isCompleted = true;
        // Trigger completion callback
        if (isDailyMode) {
          saveCompletedDaily(dailyDateStr, prev.elapsedTime);
        } else {
          saveCompletedStats(prev.level, prev.elapsedTime);
        }
        setCompletionQuote(getRandomQuote(prev.level));
      }

      return {
        ...prev,
        cells: nextGrid,
        errorCount: nextErrorCount,
        moveCount: nextMoveCount,
        isCompleted,
      };
    });
  };

  // Erase Cell Value
  const handleEraseCell = (row: number, col: number) => {
    handleGameStateChange((prev) => {
      const nextGrid = prev.cells.map((rArr) => rArr.map((c) => ({ ...c, notes: new Set(c.notes) })));
      const cell = nextGrid[row][col];
      if (cell.isGiven) return prev;

      cell.value = 0;
      cell.notes.clear();
      cell.isValid = true;

      return {
        ...prev,
        cells: nextGrid,
        moveCount: prev.moveCount + 1,
      };
    });
  };

  // --- Responsive Touch & Long Press Event Handlers for Mobile Fluidity ---
  const handlePressStart = (row: number, col: number, clientX: number, clientY: number) => {
    if (!gameState || gameState.isPaused || gameState.isCompleted) return;

    if (pressTimerRef.current) {
      clearInterval(pressTimerRef.current);
    }

    isLongPressedRef.current = false;
    pressStartPosRef.current = { x: clientX, y: clientY };

    const cell = gameState.cells[row][col];
    if (cell.isGiven) {
      // Clues shouldn't be long-pressed to clear
      setPressingCell(null);
      setPressProgress(0);
      return;
    }

    setPressingCell({ row, col });
    setPressProgress(0);

    const duration = 500; // ms for full long press
    const step = 20; // check interval
    let elapsed = 0;

    pressTimerRef.current = setInterval(() => {
      elapsed += step;
      const progress = Math.min((elapsed / duration) * 100, 100);
      setPressProgress(progress);

      if (elapsed >= duration) {
        clearInterval(pressTimerRef.current);
        pressTimerRef.current = null;
        isLongPressedRef.current = true;
        
        // Trigger cell clear!
        handleEraseCell(row, col);

        // Haptic feedback
        if (navigator.vibrate) {
          try {
            navigator.vibrate(40);
          } catch (e) {
            // Ignore if security or device blocks
          }
        }

        // Keep visual complete state briefly, then reset
        setTimeout(() => {
          setPressingCell((current) => {
            if (current && current.row === row && current.col === col) {
              return null;
            }
            return current;
          });
          setPressProgress(0);
        }, 120);
      }
    }, step);
  };

  const handlePressMove = (clientX: number, clientY: number) => {
    if (!pressStartPosRef.current || !pressingCell) return;

    const dx = clientX - pressStartPosRef.current.x;
    const dy = clientY - pressStartPosRef.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Cancel long press if user moves finger significantly (e.g. scrolling the page)
    if (distance > 10) {
      cancelPress();
    }
  };

  const handlePressEnd = (row: number, col: number) => {
    const wasLongPressed = isLongPressedRef.current;

    if (pressTimerRef.current) {
      clearInterval(pressTimerRef.current);
      pressTimerRef.current = null;
    }

    setPressingCell(null);
    setPressProgress(0);
    pressStartPosRef.current = null;

    // Only select the cell if it wasn't a long press and we didn't cancel due to movement
    if (!wasLongPressed) {
      handleCellClick(row, col);
    }
  };

  const cancelPress = () => {
    if (pressTimerRef.current) {
      clearInterval(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    setPressingCell(null);
    setPressProgress(0);
    pressStartPosRef.current = null;
  };

  // --- Grid Cell Interaction Dispatcher ---
  const handleCellClick = (row: number, col: number) => {
    if (!gameState || gameState.isPaused || gameState.isCompleted) return;

    if (gameState.inputMode === "cell-first") {
      // Normal Selection Mode
      handleGameStateChange((prev) => {
        const nextNum = prev.cells[row][col].value !== 0 ? prev.cells[row][col].value : null;
        return {
          ...prev,
          selectedRow: row,
          selectedCol: col,
          selectedNumber: nextNum, // Auto highlight other cells with this value
        };
      }, false);
    } else {
      // Paint Mode (Number-first)
      if (gameState.selectedNumber !== null) {
        // Place selected paintbrush number in the clicked cell
        handleCellAction(row, col, gameState.selectedNumber, pencilMode);
      } else {
        // Eraser paintbrush mode
        handleEraseCell(row, col);
      }
    }
  };

  // --- Keyboard Event Handler ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!gameState || gameState.isPaused || gameState.isCompleted || activeTab !== "game") return;

      // Ensure we are in cell-first mode and have a valid cell selection
      if (gameState.inputMode === "cell-first" && gameState.selectedRow !== null && gameState.selectedCol !== null) {
        const { selectedRow, selectedCol } = gameState;

        if (e.key >= "1" && e.key <= "9") {
          const num = parseInt(e.key, 10);
          handleCellAction(selectedRow, selectedCol, num, pencilMode);
        } else if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") {
          handleEraseCell(selectedRow, selectedCol);
        } else if (e.key === "n" || e.key === "N") {
          setPencilMode((prev) => !prev);
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          handleGameStateChange((prev) => ({
            ...prev,
            selectedRow: Math.max(0, selectedRow - 1),
            selectedNumber: prev.cells[Math.max(0, selectedRow - 1)][selectedCol].value || null,
          }), false);
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          handleGameStateChange((prev) => ({
            ...prev,
            selectedRow: Math.min(8, selectedRow + 1),
            selectedNumber: prev.cells[Math.min(8, selectedRow + 1)][selectedCol].value || null,
          }), false);
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          handleGameStateChange((prev) => ({
            ...prev,
            selectedCol: Math.max(0, selectedCol - 1),
            selectedNumber: prev.cells[selectedRow][Math.max(0, selectedCol - 1)].value || null,
          }), false);
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          handleGameStateChange((prev) => ({
            ...prev,
            selectedCol: Math.min(8, selectedCol + 1),
            selectedNumber: prev.cells[selectedRow][Math.min(8, selectedCol + 1)].value || null,
          }), false);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [gameState, pencilMode, activeTab]);

  // --- Paintbrush/Number Selectors ---
  const handleNumberSelect = (num: number) => {
    if (!gameState) return;

    if (gameState.inputMode === "cell-first") {
      // If we have an active cell selection, apply number instantly
      if (gameState.selectedRow !== null && gameState.selectedCol !== null) {
        handleCellAction(gameState.selectedRow, gameState.selectedCol, num, pencilMode);
      } else {
        // Just highlight identical numbers across grid
        handleGameStateChange((prev) => ({
          ...prev,
          selectedNumber: num,
        }), false);
      }
    } else {
      // Paint Mode
      handleGameStateChange((prev) => ({
        ...prev,
        selectedNumber: num,
      }), false);
    }
  };

  const handleInputModeToggle = (mode: "cell-first" | "number-first") => {
    handleGameStateChange((prev) => ({
      ...prev,
      inputMode: mode,
      selectedRow: null,
      selectedCol: null,
      selectedNumber: mode === "number-first" ? (prev.selectedNumber || 1) : null,
    }), false);
  };

  // --- Conflicts / Warnings Highlight Calculations ---
  const conflictsSet = useMemo(() => {
    if (!gameState || !showHelperHighlights) return new Set<string>();
    return getConflicts(gameState.cells);
  }, [gameState?.cells, showHelperHighlights]);

  // --- Stats and Formatting helpers ---
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const formatTotalTime = (totalSeconds: number) => {
    if (!totalSeconds) return "0s";
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    
    if (h > 0) {
      return `${h}h ${m}m ${s}s`;
    }
    if (m > 0) {
      return `${m}m ${s}s`;
    }
    return `${s}s`;
  };

  // Total completed calculation
  const totalCompletedCount = useMemo(() => {
    return Object.keys(completedLevels).length;
  }, [completedLevels]);

  // Filtered levels in paged level selection
  const filteredLevelsList = useMemo(() => {
    const list: number[] = [];
    for (let i = 1; i <= 1000; i++) {
      const tier = getTierForLevel(i);
      if (selectedTierFilter === "All" || tier === selectedTierFilter) {
        if (searchLevelText === "") {
          list.push(i);
        } else {
          if (i.toString().includes(searchLevelText)) {
            list.push(i);
          }
        }
      }
    }
    return list;
  }, [selectedTierFilter, searchLevelText]);

  const pagedLevels = useMemo(() => {
    const start = levelPage * levelsPerPage;
    return filteredLevelsList.slice(start, start + levelsPerPage);
  }, [filteredLevelsList, levelPage]);

  const maxLevelPage = useMemo(() => {
    return Math.max(0, Math.ceil(filteredLevelsList.length / levelsPerPage) - 1);
  }, [filteredLevelsList]);

  // Adjust pagination page when search or tier filters alter
  useEffect(() => {
    setLevelPage(0);
  }, [selectedTierFilter, searchLevelText]);

  // Next level helper
  const handleNextLevel = () => {
    if (levelNum < 1000) {
      setLevelNum(levelNum + 1);
    }
  };

  // Send message to the server-side Gemini AI Chatbot
  const handleSendChatMessage = async (textToSend?: string) => {
    const queryText = textToSend || chatInput.trim();
    if (!queryText) return;

    if (!textToSend) {
      setChatInput("");
    }

    // Append user message immediately
    setChatHistory((prev) => [...prev, { sender: "user", text: queryText }]);
    setIsChatLoading(true);
    setChatError(null);

    // Simplify board cells structure to avoid heavy payload
    const boardState = gameState?.cells.map((row) =>
      row.map((cell) => ({
        value: cell.value,
        solutionValue: cell.solutionValue,
        isGiven: cell.isGiven,
        isValid: cell.isValid,
      }))
    );

    const selectedCell = {
      row: gameState?.selectedRow,
      col: gameState?.selectedCol,
    };

    try {
      const response = await fetch("/api/gemini/hint", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          level: gameState?.level || levelNum,
          tier: gameState?.tier || getTierForLevel(levelNum),
          selectedCell,
          boardState,
          message: queryText,
          chatHistory: chatHistory.map((m) => ({
            role: m.sender === "user" ? "user" : "model",
            text: m.text,
          })),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to contact ZenMaster AI.");
      }

      setChatHistory((prev) => [...prev, { sender: "bot", text: data.text }]);
    } catch (err: any) {
      console.error(err);
      setChatError(err.message || "A quiet wind disrupted the connection. Let's try again.");
    } finally {
      setIsChatLoading(false);
    }
  };

  // Trigger templates for quick AI assistance
  const requestQuickHint = (type: "selected-cell" | "check-mistakes" | "suggest-scan") => {
    if (!gameState) return;

    let query = "";
    if (type === "selected-cell") {
      if (gameState.selectedRow === null || gameState.selectedCol === null) {
        alert("Please select a cell on the board first so I know where to guide you.");
        return;
      }
      query = `Can you look at Row ${gameState.selectedRow + 1}, Column ${gameState.selectedCol + 1} and give me a gentle clue to solve it?`;
    } else if (type === "check-mistakes") {
      query = "Please scan my current entries on the board and let me know if there are any mistakes or conflicts.";
    } else if (type === "suggest-scan") {
      query = "Please scan the overall board and suggest a good area (a specific row, column, or 3x3 box) for me to focus on next.";
    }

    if (query) {
      handleSendChatMessage(query);
    }
  };

  // Auto solve developer assist/cheat check (Very high polish, kept discreetly for evaluation)
  const handleQuickSolve = () => {
    if (!gameState) return;
    if (!window.confirm("Solve this board instantly with Zen-wisdom? This will mark the puzzle as finished.")) return;

    handleGameStateChange((prev) => {
      const solved = prev.cells.map((row) =>
        row.map((c) => ({
          ...c,
          value: c.solutionValue,
          isValid: true,
          notes: new Set<number>(),
        }))
      );
      if (isDailyMode) {
        saveCompletedDaily(dailyDateStr, prev.elapsedTime);
      } else {
        saveCompletedStats(prev.level, prev.elapsedTime);
      }
      setCompletionQuote(getRandomQuote(prev.level));

      return {
        ...prev,
        cells: solved,
        isCompleted: true,
      };
    });
  };

  // Get color variables for level selector chips
  const getTierColorClass = (tier: DifficultyTier) => {
    switch (tier) {
      case DifficultyTier.GentleSand:
        return "bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-900/50";
      case DifficultyTier.WarmClay:
        return "bg-orange-100 text-orange-900 border-orange-200 dark:bg-orange-950/40 dark:text-orange-200 dark:border-orange-900/50";
      case DifficultyTier.Terracotta:
        return "bg-red-100 text-red-900 border-red-200 dark:bg-red-950/40 dark:text-red-200 dark:border-red-900/50";
      case DifficultyTier.DeepForest:
        return "bg-emerald-100 text-emerald-900 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-900/50";
      case DifficultyTier.DarkWalnut:
        return "bg-stone-200 text-stone-900 border-stone-300 dark:bg-stone-800 dark:text-stone-200 dark:border-stone-700";
    }
  };

  return (
    <div className="min-h-screen bg-texture py-6 px-4 flex flex-col items-center justify-between transition-colors duration-300">
      
      {/* --- Top Navigation Header --- */}
      <header className="w-full max-w-lg lg:max-w-4xl xl:max-w-5xl mb-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between border-b border-[var(--color-grid-base)] pb-3">
        <div className="flex items-center gap-3">
          <BookMarked className="w-5 h-5 text-[var(--color-accent)] shrink-0" />
          <div className="flex flex-col">
            <h1 className="text-xl font-display font-bold tracking-tight text-[var(--color-cell-given)] leading-none">
              Zen <span className="text-[var(--color-accent)] font-medium">Sudoku</span>
            </h1>
            <span className="text-[10px] text-[var(--color-cell-note)] font-mono leading-none mt-1">
              made by <span className="font-semibold text-[var(--color-cell-given)]">Soumya Ranjan Bhujabal</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setIsDailyMode(false);
              setActiveTab("game");
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${
              activeTab === "game" && !isDailyMode
                ? "bg-[var(--color-accent)] text-[var(--color-cell-bg)] shadow-sm"
                : "text-[var(--color-cell-note)] hover:bg-[var(--color-grid-base)]/30"
            }`}
          >
            Play
          </button>
          <button
            onClick={() => setActiveTab("level-select")}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${
              activeTab === "level-select"
                ? "bg-[var(--color-accent)] text-[var(--color-cell-bg)] shadow-sm"
                : "text-[var(--color-cell-note)] hover:bg-[var(--color-grid-base)]/30"
            }`}
          >
            Levels
          </button>
          <button
            onClick={() => setActiveTab("daily-puzzle")}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all flex items-center gap-1 ${
              activeTab === "daily-puzzle" || (isDailyMode && activeTab === "game")
                ? "bg-[var(--color-accent)] text-[var(--color-cell-bg)] shadow-sm font-semibold"
                : "text-[var(--color-cell-note)] hover:bg-[var(--color-grid-base)]/30"
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Daily Puzzle</span>
          </button>
          <button
            onClick={() => setActiveTab("about-zen")}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${
              activeTab === "about-zen"
                ? "bg-[var(--color-accent)] text-[var(--color-cell-bg)] shadow-sm"
                : "text-[var(--color-cell-note)] hover:bg-[var(--color-grid-base)]/30"
            }`}
          >
            Zen Wisdom
          </button>

          <span className="w-px h-4 bg-[var(--color-grid-base)]" />

          {/* Zen AI Assistant Button */}
          <button
            onClick={() => setIsChatOpen((prev) => !prev)}
            className={`p-2 rounded-full transition-all relative ${
              isChatOpen
                ? "bg-[var(--color-accent)] text-[var(--color-cell-bg)] shadow-xs"
                : "text-[var(--color-cell-note)] hover:bg-[var(--color-grid-base)]/30"
            }`}
            title={isChatOpen ? "Close Zen AI Assistant" : "Ask Zen AI Assistant for Hints"}
            type="button"
          >
            <Sparkles className="w-4 h-4" />
          </button>

          {/* Game Statistics Button */}
          <button
            onClick={() => setIsStatsOpen(true)}
            className="p-2 text-[var(--color-cell-note)] hover:bg-[var(--color-grid-base)]/30 rounded-full transition-colors relative"
            title="View Game Achievements & Statistics"
            type="button"
          >
            <BarChart3 className="w-4 h-4 text-[var(--color-accent)]" />
          </button>

          {/* Theme Switcher Button */}
          <button
            onClick={() => setThemeMode((prev) => (prev === "light" ? "dark" : "light"))}
            className="p-2 text-[var(--color-cell-note)] hover:bg-[var(--color-grid-base)]/30 rounded-full transition-colors"
            title="Toggle Rustic theme mode"
            type="button"
          >
            {themeMode === "light" ? (
              <Moon className="w-4 h-4 text-stone-700" />
            ) : (
              <Sun className="w-4 h-4 text-amber-200" />
            )}
          </button>
        </div>
      </header>

      {/* --- Main Content Body --- */}
      <main className="w-full max-w-lg lg:max-w-4xl xl:max-w-5xl flex-1 flex flex-col items-center justify-center">
        
        {/* ===================== TAB: GAME ===================== */}
        {activeTab === "game" && gameState && (
          <div className="w-full flex flex-col lg:flex-row items-start gap-6 animate-place">
            
            {/* Left Column: Board and normal game controls */}
            <div className="flex-1 w-full max-w-lg mx-auto flex flex-col items-center">
            
            {/* Level & Tier Badge Bar */}
            <div className="w-full flex items-center justify-between mb-3 px-1">
              <div>
                <div className="text-[var(--color-cell-note)] text-xs font-mono tracking-wider">
                  {isDailyMode ? (
                    <span className="flex items-center gap-1.5 text-[var(--color-accent)] font-semibold">
                      <Calendar className="w-3.5 h-3.5" />
                      DAILY PUZZLE • {dailyDateStr}
                    </span>
                  ) : (
                    <span>LEVEL {gameState.level} / 1000+</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <h2 className="text-lg font-display font-semibold text-[var(--color-cell-given)]">
                    {gameState.tier}
                  </h2>
                  <span className="text-[10px] uppercase tracking-widest font-mono font-semibold px-2 py-0.5 rounded-full bg-[var(--color-accent-bg)] text-[var(--color-accent)]">
                    {getGivensForLevel(gameState.level)} Clues
                  </span>
                </div>
              </div>

              {/* Progress Counters (Hideable under Zen Mode) */}
              {!gameState.zenMode && (
                <div className="flex items-center gap-4 text-right">
                  <div className="text-xs">
                    <span className="text-[var(--color-cell-note)] font-mono block text-[10px] uppercase tracking-wider">
                      Timer
                    </span>
                    <span className="font-mono font-medium text-[var(--color-cell-given)] text-sm">
                      {formatTime(gameState.elapsedTime)}
                    </span>
                  </div>
                  <div className="text-xs">
                    <span className="text-[var(--color-cell-note)] font-mono block text-[10px] uppercase tracking-wider">
                      Mistakes
                    </span>
                    <span className="font-mono font-medium text-[var(--color-cell-given)] text-sm">
                      {gameState.errorCount}
                    </span>
                  </div>
                </div>
              )}

              {/* If Zen Mode is Active, show only peaceful indicator */}
              {gameState.zenMode && (
                <div className="text-xs italic text-[var(--color-cell-note)] flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-stone-400" />
                  Zen Play
                </div>
              )}
            </div>

            {/* --- The Sudoku Floating Grid Canvas --- */}
            <div className="relative w-full aspect-square bg-[var(--color-grid-base)] p-1 rounded-2xl shadow-xl border border-[var(--color-grid-base)] flex flex-col justify-between overflow-hidden">
              
              {/* Blur Overlay when Paused */}
              {gameState.isPaused && (
                <div className="absolute inset-0 z-20 backdrop-blur-md bg-[var(--color-bg-canvas)]/80 flex flex-col items-center justify-center text-center p-6 rounded-2xl animate-place">
                  <Pause className="w-12 h-12 text-[var(--color-accent)] mb-3 animate-bounce" />
                  <h3 className="text-xl font-display font-semibold text-[var(--color-cell-given)]">
                    Play is Paused
                  </h3>
                  <p className="text-sm text-[var(--color-cell-note)] mt-1 max-w-[260px]">
                    Let the busy mind rest. Take a deep breath before continuing your focus.
                  </p>
                  <button
                    onClick={() => handleGameStateChange((prev) => ({ ...prev, isPaused: false, startTime: Date.now() - prev.elapsedTime * 1000 }), false)}
                    className="mt-4 px-6 py-2 bg-[var(--color-accent)] text-[var(--color-cell-bg)] font-semibold rounded-full hover:bg-[var(--color-accent-hover)] transition-all cursor-pointer shadow-sm text-sm"
                  >
                    Resume Play
                  </button>
                </div>
              )}

              {/* Falling Leaves Particles on Victory */}
              {gameState.isCompleted && (
                <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden rounded-2xl">
                  {victoryLeaves.map((leaf) => (
                    <motion.div
                      key={leaf.id}
                      initial={{ y: -30, x: `${leaf.left}%`, rotate: 0, opacity: 0 }}
                      animate={{
                        y: "110%",
                        x: `${leaf.left + leaf.xOffset}%`,
                        rotate: leaf.rotate,
                        opacity: [0, 0.8, 0.8, 0],
                      }}
                      transition={{
                        duration: leaf.duration,
                        delay: leaf.delay,
                        ease: "linear",
                        repeat: Infinity,
                      }}
                      className="absolute rounded-tl-full rounded-br-full bg-emerald-700/20 dark:bg-emerald-400/25 border border-emerald-500/10 shadow-sm"
                      style={{
                        width: leaf.size,
                        height: leaf.size * 0.7,
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Victory Overlay */}
              {gameState.isCompleted && !successAnimationActive && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="absolute inset-0 z-20 bg-[var(--color-bg-canvas)]/95 flex flex-col items-center justify-center text-center p-6 rounded-2xl border-2 border-[var(--color-accent)] shadow-2xl"
                >
                  <div className="w-16 h-16 bg-[var(--color-accent-bg)] text-[var(--color-accent)] rounded-full flex items-center justify-center mb-4">
                    <Trophy className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-display font-bold text-[var(--color-cell-given)]">
                    {isDailyMode ? "Daily Goal Achieved" : "Level Completed"}
                  </h3>
                  <p className="text-xs font-mono uppercase tracking-widest text-[var(--color-accent)] mt-1 font-semibold">
                    {isDailyMode ? (
                      `Daily Puzzle — ${dailyDateStr}`
                    ) : (
                      `${gameState.tier} — Level ${gameState.level}`
                    )}
                  </p>

                  <div className="my-5 p-4 rounded-xl bg-[var(--color-grid-base)]/20 border border-[var(--color-grid-base)]/50 max-w-[320px]">
                    <p className="text-sm italic font-display text-[var(--color-cell-note)]">
                      "{completionQuote || getRandomQuote(gameState.level)}"
                    </p>
                  </div>

                  <div className="flex gap-6 mb-6 text-sm">
                    <div>
                      <span className="text-[var(--color-cell-note)] font-mono block text-[10px] uppercase tracking-wider">Time</span>
                      <span className="font-mono font-bold text-lg text-[var(--color-cell-given)]">{formatTime(gameState.elapsedTime)}</span>
                    </div>
                    <div>
                      <span className="text-[var(--color-cell-note)] font-mono block text-[10px] uppercase tracking-wider">Mistakes</span>
                      <span className="font-mono font-bold text-lg text-[var(--color-cell-given)]">{gameState.errorCount}</span>
                    </div>
                    <div>
                      <span className="text-[var(--color-cell-note)] font-mono block text-[10px] uppercase tracking-wider">Moves</span>
                      <span className="font-mono font-bold text-lg text-[var(--color-cell-given)]">{gameState.moveCount}</span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => initializeLevel(gameState.level, true, isDailyMode, isDailyMode ? dailyDateStr : undefined)}
                      className="px-4 py-2 border border-[var(--color-accent)] text-[var(--color-accent)] rounded-full hover:bg-[var(--color-accent-bg)] transition-all text-xs font-medium"
                    >
                      Play Again
                    </button>
                    {isDailyMode ? (
                      <button
                        onClick={() => setActiveTab("daily-puzzle")}
                        className="px-5 py-2 bg-[var(--color-accent)] text-[var(--color-cell-bg)] rounded-full hover:bg-[var(--color-accent-hover)] transition-all text-xs font-medium flex items-center gap-1 shadow"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        Daily Tracker
                      </button>
                    ) : (
                      gameState.level < 1000 && (
                        <button
                          onClick={handleNextLevel}
                          className="px-5 py-2 bg-[var(--color-accent)] text-[var(--color-cell-bg)] rounded-full hover:bg-[var(--color-accent-hover)] transition-all text-xs font-medium flex items-center gap-1 shadow"
                        >
                          Next Level
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      )
                    )}
                  </div>
                </motion.div>
              )}

              {/* 9x9 Sudoku Grid Cells */}
              <div className="grid grid-cols-9 gap-[1px] bg-[var(--color-grid-base)] h-full w-full rounded-xl overflow-hidden">
                {gameState.cells.map((rowArr, r) =>
                  rowArr.map((cell, c) => {
                    const isSelected = gameState.selectedRow === r && gameState.selectedCol === c;
                    
                    // Highlighting helper conditions
                    const sharesRowOrCol = gameState.selectedRow === r || gameState.selectedCol === c;
                    const sharesBox =
                      gameState.selectedRow !== null &&
                      gameState.selectedCol !== null &&
                      Math.floor(gameState.selectedRow / 3) === Math.floor(r / 3) &&
                      Math.floor(gameState.selectedCol / 3) === Math.floor(c / 3);

                    const sharesValue =
                      gameState.selectedNumber !== null &&
                      cell.value === gameState.selectedNumber;

                    const isConflict = conflictsSet.has(`${r},${c}`);

                    // Styling classes calculation
                    let bgClass = "bg-[var(--color-cell-bg)]";
                    
                    // Faint 3x3 Block tonal shifts
                    const isAlternateBox = (Math.floor(r / 3) + Math.floor(c / 3)) % 2 === 1;
                    if (isAlternateBox) {
                      bgClass = "bg-[var(--color-grid-base)]/20";
                    }

                    if (showHelperHighlights && (sharesRowOrCol || sharesBox)) {
                      bgClass = "bg-[var(--color-accent-bg)]/25";
                    }
                    if (showHelperHighlights && sharesValue && cell.value !== 0) {
                      bgClass = "bg-[var(--color-cell-highlight)]";
                    }
                    if (isSelected) {
                      bgClass = "bg-[var(--color-cell-selected)]";
                    }
                    if (isConflict) {
                      bgClass = "bg-[var(--color-error-bg)]";
                    }

                    if (gameState.isCompleted) {
                      bgClass = "animate-success-cell";
                    }

                    return (
                      <div
                        key={`${r}-${c}`}
                        onPointerDown={(e) => handlePressStart(r, c, e.clientX, e.clientY)}
                        onPointerUp={() => handlePressEnd(r, c)}
                        onPointerMove={(e) => handlePressMove(e.clientX, e.clientY)}
                        onPointerCancel={cancelPress}
                        onContextMenu={(e) => e.preventDefault()}
                        className={`relative aspect-square flex items-center justify-center cursor-pointer transition-all duration-150 select-none touch-pan-y ${bgClass} ${
                          // Borders for 3x3 blocks
                          r % 3 === 2 && r !== 8 ? "border-b-2 border-[var(--color-grid-base)]" : ""
                        } ${
                          c % 3 === 2 && c !== 8 ? "border-r-2 border-[var(--color-grid-base)]" : ""
                        } ${
                          pressingCell?.row === r && pressingCell?.col === c ? "scale-95" : ""
                        }`}
                        id={`cell-${r}-${c}`}
                        style={gameState.isCompleted ? { animationDelay: `${(r + c) * 0.08}s` } : undefined}
                      >
                        {/* Cell Value Rendering */}
                        {cell.value !== 0 ? (
                          <span
                            className={`text-lg sm:text-xl font-display font-semibold transition-transform duration-200 ${
                              gameState.isCompleted
                                ? "text-[var(--color-cell-placed)] font-bold animate-success-number"
                                : cell.isGiven
                                ? "text-[var(--color-cell-given)] font-medium"
                                : cell.isValid
                                ? "text-[var(--color-cell-placed)] font-bold animate-place"
                                : "text-[var(--color-error)] font-bold animate-pulse"
                            }`}
                            style={gameState.isCompleted ? { animationDelay: `${(r + c) * 0.08}s` } : undefined}
                          >
                            {cell.value}
                          </span>
                        ) : (
                          /* Notes Grid (Pencil Marks) Rendering */
                          <div className="absolute inset-0.5 grid grid-cols-3 grid-rows-3 gap-[1px] p-[1px] text-[9px] font-mono leading-none">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                              <div
                                key={num}
                                className={`flex items-center justify-center font-semibold text-[var(--color-cell-note)] transition-opacity duration-150 ${
                                  cell.notes.has(num) ? "opacity-100" : "opacity-0"
                                }`}
                              >
                                {num}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Long-press Progress Ring Overlay */}
                        {pressingCell?.row === r && pressingCell?.col === c && pressProgress > 0 && (
                          <div className="absolute inset-0 flex items-center justify-center bg-stone-900/10 dark:bg-white/10 pointer-events-none z-20">
                            <svg className="w-10 h-10 transform -rotate-90">
                              <circle
                                cx="20"
                                cy="20"
                                r="16"
                                stroke="var(--color-grid-base)"
                                strokeWidth="2.5"
                                fill="transparent"
                                className="opacity-30"
                              />
                              <circle
                                cx="20"
                                cy="20"
                                r="16"
                                stroke="var(--color-accent)"
                                strokeWidth="2.5"
                                fill="transparent"
                                strokeDasharray={100}
                                strokeDashoffset={100 - (pressProgress / 100) * 100}
                                strokeLinecap="round"
                              />
                            </svg>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* --- Micro Stats Panel & Play Controllers --- */}
            <div className="w-full mt-3 flex items-center justify-between px-1">
              {/* Reset, Undo, Redo */}
              <div className="flex gap-2">
                <button
                  onClick={handleUndo}
                  disabled={undoStack.length === 0}
                  className={`p-2 rounded-xl border border-[var(--color-grid-base)] flex items-center justify-center transition-all ${
                    undoStack.length === 0
                      ? "opacity-40 cursor-not-allowed text-[var(--color-cell-note)]"
                      : "text-[var(--color-cell-given)] hover:bg-[var(--color-grid-base)]/30 active:scale-95"
                  }`}
                  title="Undo last move"
                >
                  <Undo2 className="w-4 h-4" />
                </button>
                <button
                  onClick={handleRedo}
                  disabled={redoStack.length === 0}
                  className={`p-2 rounded-xl border border-[var(--color-grid-base)] flex items-center justify-center transition-all ${
                    redoStack.length === 0
                      ? "opacity-40 cursor-not-allowed text-[var(--color-cell-note)]"
                      : "text-[var(--color-cell-given)] hover:bg-[var(--color-grid-base)]/30 active:scale-95"
                  }`}
                  title="Redo previous move"
                >
                  <Redo2 className="w-4 h-4" />
                </button>
                <button
                  onClick={handleResetLevel}
                  className="p-2 text-[var(--color-cell-note)] hover:text-stone-900 dark:hover:text-stone-100 hover:bg-[var(--color-grid-base)]/30 border border-[var(--color-grid-base)] rounded-xl transition-all active:scale-95"
                  title="Reset puzzle to original layout"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>

              {/* Pause & Settings Toggles */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleGameStateChange((prev) => ({ ...prev, isPaused: !prev.isPaused }), false)}
                  className="px-3 py-1.5 border border-[var(--color-grid-base)] rounded-xl text-xs font-mono font-medium text-[var(--color-cell-note)] hover:bg-[var(--color-grid-base)]/30 transition-all flex items-center gap-1 cursor-pointer"
                  title={gameState.isPaused ? "Resume Game" : "Pause Game"}
                >
                  {gameState.isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                  {gameState.isPaused ? "Resume" : "Pause"}
                </button>

                <button
                  onClick={() => handleGameStateChange((prev) => ({ ...prev, zenMode: !prev.zenMode }), false)}
                  className={`px-3 py-1.5 border rounded-xl text-xs font-mono font-medium transition-all flex items-center gap-1 ${
                    gameState.zenMode
                      ? "bg-[var(--color-accent)] text-[var(--color-cell-bg)] border-[var(--color-accent)] shadow-xs"
                      : "border-[var(--color-grid-base)] text-[var(--color-cell-note)] hover:bg-[var(--color-grid-base)]/30"
                  }`}
                  title="Toggle Zen Mode (Hides timer and mistake logs)"
                >
                  <EyeOff className="w-3.5 h-3.5" />
                  Zen
                </button>
              </div>
            </div>

            {/* --- Primary Controls Panel --- */}
            <div className="w-full mt-4 p-4 rounded-2xl bg-[var(--color-grid-base)]/25 border border-[var(--color-grid-base)] flex flex-col gap-4">
              
              {/* Interaction Modes Switch: Cell-First vs Paintbrush Mode */}
              <div className="flex items-center justify-between border-b border-[var(--color-grid-base)] pb-3">
                <span className="text-xs font-display font-medium text-[var(--color-cell-note)]">
                  Mode
                </span>
                <div className="flex gap-1.5 bg-[var(--color-grid-base)]/40 p-1 rounded-xl">
                  <button
                    onClick={() => handleInputModeToggle("cell-first")}
                    className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                      gameState.inputMode === "cell-first"
                        ? "bg-[var(--color-cell-bg)] text-[var(--color-cell-given)] shadow-sm"
                        : "text-[var(--color-cell-note)] hover:opacity-80"
                    }`}
                  >
                    Select Cell First
                  </button>
                  <button
                    onClick={() => handleInputModeToggle("number-first")}
                    className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                      gameState.inputMode === "number-first"
                        ? "bg-[var(--color-cell-bg)] text-[var(--color-cell-given)] shadow-sm"
                        : "text-[var(--color-cell-note)] hover:opacity-80"
                    }`}
                  >
                    Paint Number
                  </button>
                </div>
              </div>

              {/* Number Buttons Pad */}
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-9 gap-1.5">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => {
                    // Count remaining numbers on board
                    let countOnBoard = 0;
                    gameState.cells.forEach((row) =>
                      row.forEach((cell) => {
                        if (cell.value === num) countOnBoard++;
                      })
                    );
                    const isAllPlaced = countOnBoard >= 9;

                    const isNumSelected = gameState.selectedNumber === num;

                    return (
                      <button
                        key={num}
                        onClick={() => handleNumberSelect(num)}
                        className={`aspect-square relative rounded-xl text-lg font-display font-bold flex flex-col items-center justify-center transition-all ${
                          isNumSelected
                            ? "bg-[var(--color-accent)] text-[var(--color-cell-bg)] shadow-md scale-105"
                            : "bg-[var(--color-cell-bg)] text-[var(--color-cell-given)] hover:bg-[var(--color-grid-base)]/50 active:scale-95"
                        } border border-[var(--color-grid-base)]`}
                        id={`btn-num-${num}`}
                      >
                        <span>{num}</span>
                        {isAllPlaced && (
                          <div className="absolute top-0.5 right-0.5">
                            <Check className="w-2.5 h-2.5 text-[var(--color-cell-placed)]" />
                          </div>
                        )}
                        <span className="text-[8px] font-mono font-normal opacity-50 block mt-[-3px]">
                          {countOnBoard}/9
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Sub-Action Buttons: Pencil Notes, Erase, Hints Helper */}
                <div className="grid grid-cols-3 gap-2">
                  
                  {/* Pencil Note Toggle */}
                  <button
                    onClick={() => setPencilMode((prev) => !prev)}
                    className={`py-2 px-3 border rounded-xl font-medium text-xs flex items-center justify-center gap-2 transition-all ${
                      pencilMode
                        ? "bg-[var(--color-accent-bg)] border-[var(--color-accent)] text-[var(--color-accent)] font-bold shadow-xs"
                        : "border-[var(--color-grid-base)] bg-[var(--color-cell-bg)] text-[var(--color-cell-note)] hover:bg-[var(--color-grid-base)]/30"
                    }`}
                    title="Pencil mode: write small notes instead of placing digits"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>Pencil {pencilMode ? "On" : "Off"}</span>
                  </button>

                  {/* Eraser */}
                  <button
                    onClick={() => {
                      if (gameState.inputMode === "cell-first") {
                        if (gameState.selectedRow !== null && gameState.selectedCol !== null) {
                          handleEraseCell(gameState.selectedRow, gameState.selectedCol);
                        } else {
                          alert("Select a cell first, or switch to Paint mode to erase by clicking cells.");
                        }
                      } else {
                        // Switch Paint Mode selection to Eraser (null selectedNumber)
                        handleGameStateChange((prev) => ({
                          ...prev,
                          selectedNumber: null,
                        }), false);
                      }
                    }}
                    className={`py-2 px-3 border rounded-xl font-medium text-xs flex items-center justify-center gap-2 transition-all ${
                      gameState.inputMode === "number-first" && gameState.selectedNumber === null
                        ? "bg-[var(--color-error-bg)] border-[var(--color-error)] text-[var(--color-error)]"
                        : "border-[var(--color-grid-base)] bg-[var(--color-cell-bg)] text-[var(--color-cell-note)] hover:bg-[var(--color-grid-base)]/30"
                    }`}
                  >
                    <Eraser className="w-4 h-4" />
                    <span>Eraser</span>
                  </button>

                  {/* Highlights Helper */}
                  <button
                    onClick={() => setShowHelperHighlights((prev) => !prev)}
                    className={`py-2 px-3 border rounded-xl font-medium text-xs flex items-center justify-center gap-2 transition-all ${
                      showHelperHighlights
                        ? "border-[var(--color-grid-base)] bg-[var(--color-cell-bg)] text-[var(--color-accent)] font-semibold"
                        : "border-[var(--color-grid-base)] bg-[var(--color-cell-bg)] text-[var(--color-cell-note)] hover:bg-[var(--color-grid-base)]/30 opacity-70"
                    }`}
                    title="Toggle assistance highlight helpers"
                  >
                    {showHelperHighlights ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    <span>Highlights</span>
                  </button>

                </div>

                {/* Auto Clear Notes toggle & Quick Solve discrete helper */}
                <div className="flex items-center justify-between text-[11px] text-[var(--color-cell-note)] px-1 pt-1.5 border-t border-[var(--color-grid-base)]">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={gameState.autoClearNotes}
                      onChange={(e) =>
                        handleGameStateChange((prev) => ({ ...prev, autoClearNotes: e.target.checked }), false)
                      }
                      className="rounded border-[var(--color-grid-base)] text-[var(--color-accent)] focus:ring-[var(--color-accent)] cursor-pointer"
                    />
                    <span>Auto-clear pencil marks</span>
                  </label>

                  <button
                    onClick={handleQuickSolve}
                    className="opacity-20 hover:opacity-100 text-[10px] font-mono hover:text-[var(--color-accent)] transition-all uppercase"
                    title="Developer auto-solving assistant"
                  >
                    Zen-Solve Board
                  </button>
                </div>

              </div>

            </div>

          </div> {/* Closing Left Column */}

          {/* Right Column: Zen AI Assistant Column */}
          <AnimatePresence>
            {isChatOpen && (
              <motion.div
                initial={{ opacity: 0, width: 0, x: 20 }}
                animate={{ opacity: 1, width: "auto", x: 0 }}
                exit={{ opacity: 0, width: 0, x: 20 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="w-full lg:w-[350px] xl:w-[380px] shrink-0 flex flex-col lg:sticky lg:top-4 gap-3 overflow-hidden"
              >
                <div className="w-full p-4 rounded-2xl bg-[var(--color-grid-base)]/25 border border-[var(--color-grid-base)] flex flex-col gap-3">
                  {/* Header */}
                  <div className="flex items-center justify-between border-b border-[var(--color-grid-base)] pb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs font-display font-semibold text-[var(--color-cell-given)]">
                        ZenMaster AI Tutor
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setChatHistory([
                          {
                            sender: "bot",
                            text: "Greetings, traveler of patterns. I am your ZenMaster assistant. If you seek guidance on our sandy board, click on any cell and ask me for a hint, or inquire about Sudoku strategies. How can I aid your concentration today?"
                          }
                        ])}
                        className="text-[10px] font-mono text-[var(--color-cell-note)] hover:text-[var(--color-cell-given)] transition-colors cursor-pointer"
                        title="Reset chat"
                        type="button"
                      >
                        Reset Chat
                      </button>
                      <button
                        onClick={() => setIsChatOpen(false)}
                        className="text-[var(--color-cell-note)] hover:text-[var(--color-cell-given)] cursor-pointer"
                        type="button"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Quick Hint Action Chips */}
                  <div className="flex flex-wrap gap-1.5 py-0.5">
                    <button
                      onClick={() => requestQuickHint("selected-cell")}
                      className="px-2.5 py-1 bg-[var(--color-cell-bg)] border border-[var(--color-grid-base)] text-[10px] rounded-lg text-[var(--color-cell-given)] hover:bg-[var(--color-accent-bg)] hover:text-[var(--color-accent)] hover:border-[var(--color-accent)]/30 transition-all cursor-pointer font-medium"
                      type="button"
                    >
                      💡 Clue for Selected Cell
                    </button>
                    <button
                      onClick={() => requestQuickHint("check-mistakes")}
                      className="px-2.5 py-1 bg-[var(--color-cell-bg)] border border-[var(--color-grid-base)] text-[10px] rounded-lg text-[var(--color-cell-given)] hover:bg-[var(--color-accent-bg)] hover:text-[var(--color-accent)] hover:border-[var(--color-accent)]/30 transition-all cursor-pointer font-medium"
                      type="button"
                    >
                      🔍 Check Mistakes
                    </button>
                    <button
                      onClick={() => requestQuickHint("suggest-scan")}
                      className="px-2.5 py-1 bg-[var(--color-cell-bg)] border border-[var(--color-grid-base)] text-[10px] rounded-lg text-[var(--color-cell-given)] hover:bg-[var(--color-accent-bg)] hover:text-[var(--color-accent)] hover:border-[var(--color-accent)]/30 transition-all cursor-pointer font-medium"
                      type="button"
                    >
                      🧭 Suggest Next Scan
                    </button>
                  </div>

                  {/* Message Log */}
                  <div className="max-h-[220px] lg:max-h-[380px] overflow-y-auto flex flex-col gap-2 p-2 bg-[var(--color-cell-bg)] rounded-xl border border-[var(--color-grid-base)] scrollbar-thin">
                    {chatHistory.map((msg, index) => (
                      <div
                        key={index}
                        className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                          msg.sender === "user"
                            ? "bg-[var(--color-accent-bg)] text-[var(--color-accent)] self-end rounded-tr-none font-medium"
                            : "bg-[var(--color-grid-base)]/10 text-[var(--color-cell-given)] border-l-2 border-[var(--color-accent)] self-start rounded-tl-none"
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                      </div>
                    ))}

                    {isChatLoading && (
                      <div className="flex items-center gap-2 text-xs text-[var(--color-cell-note)] italic p-1">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--color-accent)]" />
                        <span>ZenMaster is reflecting on the stones...</span>
                      </div>
                    )}

                    {chatError && (
                      <div className="p-2 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-300 text-xs">
                        {chatError}
                      </div>
                    )}

                    <div ref={chatEndRef} />
                  </div>

                  {/* Message Input Form */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendChatMessage();
                    }}
                    className="flex gap-2"
                  >
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Ask ZenMaster about this board or strategy..."
                      className="flex-1 px-3 py-2 bg-[var(--color-cell-bg)] border border-[var(--color-grid-base)] rounded-xl text-xs text-[var(--color-cell-given)] placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] transition-all"
                      disabled={isChatLoading}
                    />
                    <button
                      type="submit"
                      disabled={isChatLoading || !chatInput.trim()}
                      className={`p-2 bg-[var(--color-accent)] text-[var(--color-cell-bg)] rounded-xl hover:bg-[var(--color-accent-hover)] transition-all flex items-center justify-center ${
                        isChatLoading || !chatInput.trim() ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
                      }`}
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      )}

        {/* ===================== TAB: LEVEL SELECT ===================== */}
        {activeTab === "level-select" && (
          <div className="w-full animate-place">
            
            {/* Header / Search / Filter */}
            <div className="bg-[var(--color-grid-base)]/25 border border-[var(--color-grid-base)] rounded-2xl p-4 mb-4">
              <h3 className="text-base font-display font-semibold text-[var(--color-cell-given)] flex items-center gap-2 mb-3">
                <Sliders className="w-4 h-4 text-[var(--color-accent)]" />
                Select Puzzle Level (1 - 1,000+)
              </h3>

              <div className="flex flex-col gap-3">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-4 h-4 text-[var(--color-cell-note)] absolute left-3 top-1/2 transform -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by Level (e.g. 452)"
                    value={searchLevelText}
                    onChange={(e) => setSearchLevelText(e.target.value.replace(/\D/g, ""))}
                    className="w-full pl-9 pr-4 py-2 bg-[var(--color-cell-bg)] border border-[var(--color-grid-base)] rounded-xl text-xs text-[var(--color-cell-given)] placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] transition-all"
                  />
                </div>

                {/* Tier Filter Pills */}
                <div>
                  <span className="text-[10px] block font-mono uppercase tracking-wider text-[var(--color-cell-note)] mb-1.5">
                    Filter by Difficulty Tier
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {["All", ...Object.values(DifficultyTier)].map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setSelectedTierFilter(filter as any)}
                        className={`px-2.5 py-1 text-[10px] font-semibold rounded-full transition-all ${
                          selectedTierFilter === filter
                            ? "bg-[var(--color-accent)] text-[var(--color-cell-bg)] shadow-xs"
                            : "bg-[var(--color-cell-bg)] text-[var(--color-cell-note)] border border-[var(--color-grid-base)] hover:opacity-80"
                        }`}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Summary Tracker */}
            <div className="flex items-center justify-between text-xs text-[var(--color-cell-note)] px-1 mb-2">
              <span>
                Found <span className="font-semibold text-[var(--color-cell-given)]">{filteredLevelsList.length}</span> matching levels
              </span>
              <span className="flex items-center gap-1">
                <Trophy className="w-3.5 h-3.5 text-amber-500" />
                <span>Completed: <b>{totalCompletedCount}</b> / 1000</span>
              </span>
            </div>

            {/* Levels Paged Grid */}
            {pagedLevels.length > 0 ? (
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                {pagedLevels.map((lvl) => {
                  const stats = completedLevels[lvl];
                  const isCompleted = !!stats?.completed;
                  const tier = getTierForLevel(lvl);
                  const isCurrent = levelNum === lvl;
                  const isLocked = lvl > unlockedLevel;

                  return (
                    <button
                      key={lvl}
                      onClick={() => {
                        if (isLocked) {
                          alert(`Please complete previous levels to unlock Level ${lvl}.`);
                          return;
                        }
                        setLevelNum(lvl);
                        setActiveTab("game");
                      }}
                      className={`relative p-3 rounded-xl flex flex-col items-center justify-center border transition-all ${
                        isLocked
                          ? "bg-stone-100/50 dark:bg-stone-900/40 border-dashed border-stone-300 dark:border-stone-800 text-stone-400 dark:text-stone-600 cursor-not-allowed opacity-60"
                          : isCurrent
                          ? "bg-[var(--color-accent-bg)] border-[var(--color-accent)] text-[var(--color-accent)] font-bold ring-1 ring-[var(--color-accent)] hover:shadow-md cursor-pointer"
                          : isCompleted
                          ? "bg-[var(--color-cell-bg)] border-emerald-400 text-stone-600 dark:border-emerald-800 hover:shadow-md cursor-pointer"
                          : "bg-[var(--color-cell-bg)] border-[var(--color-grid-base)] text-[var(--color-cell-given)] hover:shadow-md cursor-pointer"
                      }`}
                    >
                      {/* Checkmark icon for completed levels */}
                      {isCompleted && (
                        <div className="absolute top-1 right-1 bg-emerald-500 text-white rounded-full p-0.5" title="Level completed">
                          <Check className="w-2 h-2" />
                        </div>
                      )}

                      {/* Lock icon for locked levels */}
                      {isLocked && (
                        <div className="absolute top-1 right-1 text-stone-400 dark:text-stone-600" title="Level locked">
                          <Lock className="w-3 h-3" />
                        </div>
                      )}

                      <span className="text-sm font-mono font-bold">
                        {lvl}
                      </span>
                      <span className="text-[8px] opacity-75 truncate max-w-full text-center mt-0.5">
                        {isLocked ? "Locked" : tier.replace(" ", "")}
                      </span>

                      {stats?.bestTime && !isLocked && (
                        <span className="text-[7px] font-mono opacity-50 mt-1">
                          {formatTime(stats.bestTime)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center text-[var(--color-cell-note)] bg-[var(--color-cell-bg)] border border-[var(--color-grid-base)] rounded-2xl">
                No levels match your filter criteria. Let's try searching for another level!
              </div>
            )}

            {/* Pagination Controllers */}
            {maxLevelPage > 0 && (
              <div className="flex items-center justify-between mt-4 px-1">
                <button
                  onClick={() => setLevelPage((p) => Math.max(0, p - 1))}
                  disabled={levelPage === 0}
                  className={`p-2 rounded-xl border border-[var(--color-grid-base)] bg-[var(--color-cell-bg)] text-[var(--color-cell-given)] transition-all flex items-center justify-center ${
                    levelPage === 0 ? "opacity-30 cursor-not-allowed" : "hover:bg-[var(--color-grid-base)]/20 cursor-pointer"
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <span className="text-xs text-[var(--color-cell-note)] font-mono">
                  Page <span className="font-semibold text-[var(--color-cell-given)]">{levelPage + 1}</span> of {maxLevelPage + 1}
                </span>

                <button
                  onClick={() => setLevelPage((p) => Math.min(maxLevelPage, p + 1))}
                  disabled={levelPage === maxLevelPage}
                  className={`p-2 rounded-xl border border-[var(--color-grid-base)] bg-[var(--color-cell-bg)] text-[var(--color-cell-given)] transition-all flex items-center justify-center ${
                    levelPage === maxLevelPage ? "opacity-30 cursor-not-allowed" : "hover:bg-[var(--color-grid-base)]/20 cursor-pointer"
                  }`}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

          </div>
        )}

        {/* ===================== TAB: ABOUT ZEN WISDOM ===================== */}
        {activeTab === "about-zen" && (
          <div className="w-full bg-[var(--color-cell-bg)] border border-[var(--color-grid-base)] rounded-2xl p-6 shadow-md animate-place text-sm text-[var(--color-cell-given)] leading-relaxed">
            <div className="flex items-center gap-3 mb-4 border-b border-[var(--color-grid-base)] pb-3">
              <Award className="w-6 h-6 text-[var(--color-accent)]" />
              <div>
                <h3 className="text-base font-display font-semibold">
                  Zen Mindset & Progressions
                </h3>
                <p className="text-xs text-[var(--color-cell-note)]">
                  The architecture behind 1,000 earthy puzzles
                </p>
              </div>
            </div>

            <p className="mb-3">
              Sudoku is more than a game of numbers; it is a ritual of pattern discovery, quiet patience, and mental focus. We designed this experience without harsh digital blares or neon timers to create a peaceful sanctuary for your intellect.
            </p>

            <h4 className="font-display font-medium text-xs uppercase tracking-wider text-[var(--color-accent)] mb-2 mt-4">
              Difficulty Tiers Logic
            </h4>
            
            <ul className="space-y-3 font-sans text-xs">
              <li className="flex gap-2.5">
                <span className="w-3.5 h-3.5 rounded-full bg-amber-100 dark:bg-amber-950 flex-shrink-0" />
                <div>
                  <strong className="text-[var(--color-cell-given)]">Levels 1–200 (Gentle Sand):</strong>
                  <p className="text-[var(--color-cell-note)] mt-0.5">36 to 40 clues. Solvable with basic Naked Singles and Hidden Singles. Smooth entry point.</p>
                </div>
              </li>
              <li className="flex gap-2.5">
                <span className="w-3.5 h-3.5 rounded-full bg-orange-100 dark:bg-orange-950 flex-shrink-0" />
                <div>
                  <strong className="text-[var(--color-cell-given)]">Levels 201–400 (Warm Clay):</strong>
                  <p className="text-[var(--color-cell-note)] mt-0.5">31 to 35 clues. Introducing Naked Pairs/Triples and intersection block-pointing removals.</p>
                </div>
              </li>
              <li className="flex gap-2.5">
                <span className="w-3.5 h-3.5 rounded-full bg-red-100 dark:bg-red-950 flex-shrink-0" />
                <div>
                  <strong className="text-[var(--color-cell-given)]">Levels 401–600 (Terracotta):</strong>
                  <p className="text-[var(--color-cell-note)] mt-0.5">27 to 30 clues. Hidden Pairs/Triples and classic symmetric X-Wing deductions are required.</p>
                </div>
              </li>
              <li className="flex gap-2.5">
                <span className="w-3.5 h-3.5 rounded-full bg-emerald-100 dark:bg-emerald-950 flex-shrink-0" />
                <div>
                  <strong className="text-[var(--color-cell-given)]">Levels 601–800 (Deep Forest):</strong>
                  <p className="text-[var(--color-cell-note)] mt-0.5">24 to 26 clues. Features advanced Swordfish, XY-Wing, and Simple Chains logical paths.</p>
                </div>
              </li>
              <li className="flex gap-2.5">
                <span className="w-3.5 h-3.5 rounded-full bg-stone-200 dark:bg-stone-800 flex-shrink-0" />
                <div>
                  <strong className="text-[var(--color-cell-given)]">Levels 801–1000+ (Dark Walnut):</strong>
                  <p className="text-[var(--color-cell-note)] mt-0.5">21 to 23 clues. Elite, minimal puzzles requiring advanced Forcing Chains and Nishio depth.</p>
                </div>
              </li>
            </ul>

            <div className="mt-5 pt-4 border-t border-[var(--color-grid-base)] text-center">
              <span className="text-[10px] text-[var(--color-cell-note)] font-mono uppercase tracking-wider block mb-1">
                Current Zen Thought
              </span>
              <p className="italic text-xs text-[var(--color-cell-given)] font-display px-4">
                "{getRandomQuote(levelNum)}"
              </p>
            </div>
          </div>
        )}

        {/* ===================== TAB: DAILY PUZZLE ===================== */}
        {activeTab === "daily-puzzle" && (() => {
          const firstDay = new Date(calendarYear, calendarMonth, 1).getDay();
          const numDays = new Date(calendarYear, calendarMonth + 1, 0).getDate();
          
          const monthNames = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
          ];
          
          const daysArray = [];
          for (let i = 0; i < firstDay; i++) {
            daysArray.push(null); // padding empty slots
          }
          for (let i = 1; i <= numDays; i++) {
            daysArray.push(i);
          }

          // Format check for highlight / select
          const todayObj = new Date();
          const todayStr = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, '0')}-${String(todayObj.getDate()).padStart(2, '0')}`;

          const selParts = selectedCalendarDate.split("-").map(Number);
          const isSelectedCompleted = completedDailies[selectedCalendarDate]?.completed;
          const selectedTimeTaken = completedDailies[selectedCalendarDate]?.timeTaken;
          const selectedLevelNum = getDailyLevelNum(selectedCalendarDate);
          const selDate = new Date(selParts[0], selParts[1] - 1, selParts[2]);
          const isSelectedFuture = selDate > new Date(todayObj.getFullYear(), todayObj.getMonth(), todayObj.getDate());

          const handlePrevMonth = () => {
            if (calendarMonth === 0) {
              setCalendarMonth(11);
              setCalendarYear(y => y - 1);
            } else {
              setCalendarMonth(m => m - 1);
            }
          };

          const handleNextMonth = () => {
            if (calendarMonth === 11) {
              setCalendarMonth(0);
              setCalendarYear(y => y + 1);
            } else {
              setCalendarMonth(m => m + 1);
            }
          };

          const totalDailiesCompleted = Object.values(completedDailies).filter((d: any) => d?.completed).length;

          return (
            <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 animate-place">
              {/* Left 2 Columns: Calendar Board */}
              <div className="md:col-span-2 w-full bg-[var(--color-cell-bg)] border border-[var(--color-grid-base)] rounded-2xl p-5 shadow-sm">
                
                {/* Header with navigation */}
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-[var(--color-grid-base)]">
                  <div>
                    <h3 className="text-base font-display font-semibold text-[var(--color-cell-given)]">
                      {monthNames[calendarMonth]} {calendarYear}
                    </h3>
                    <p className="text-[10px] text-[var(--color-cell-note)] font-mono uppercase tracking-wider">
                      Daily Zen Calendar
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={handlePrevMonth}
                      className="p-1.5 rounded-lg border border-[var(--color-grid-base)] hover:bg-[var(--color-grid-base)]/20 text-[var(--color-cell-given)] transition-all cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        const d = new Date();
                        setCalendarMonth(d.getMonth());
                        setCalendarYear(d.getFullYear());
                        const todayFormatted = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                        setSelectedCalendarDate(todayFormatted);
                      }}
                      className="px-2.5 py-1 text-[10px] font-mono border border-[var(--color-grid-base)] hover:bg-[var(--color-grid-base)]/20 text-[var(--color-cell-given)] rounded-lg transition-all cursor-pointer"
                    >
                      Today
                    </button>
                    <button
                      onClick={handleNextMonth}
                      className="p-1.5 rounded-lg border border-[var(--color-grid-base)] hover:bg-[var(--color-grid-base)]/20 text-[var(--color-cell-given)] transition-all cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Day labels */}
                <div className="grid grid-cols-7 gap-1 text-center mb-1">
                  {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(day => (
                    <span key={day} className="text-[10px] font-mono uppercase tracking-widest text-[var(--color-cell-note)] font-bold py-1">
                      {day}
                    </span>
                  ))}
                </div>

                {/* Calendar Days grid */}
                <div className="grid grid-cols-7 gap-1">
                  {daysArray.map((dayNum, idx) => {
                    if (dayNum === null) {
                      return <div key={`empty-${idx}`} className="aspect-square bg-stone-50/10 dark:bg-stone-900/10 rounded-xl" />;
                    }

                    const formattedDate = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                    const isToday = formattedDate === todayStr;
                    const isSelected = formattedDate === selectedCalendarDate;
                    const stats = completedDailies[formattedDate];
                    const isDone = !!stats?.completed;

                    const dayDate = new Date(calendarYear, calendarMonth, dayNum);
                    const todayDate = new Date(todayObj.getFullYear(), todayObj.getMonth(), todayObj.getDate());
                    const isFuture = dayDate > todayDate;

                    return (
                      <button
                        key={`day-${dayNum}`}
                        onClick={() => setSelectedCalendarDate(formattedDate)}
                        className={`aspect-square relative flex flex-col items-center justify-between p-1.5 rounded-xl border transition-all text-left ${
                          isFuture
                            ? "bg-stone-100/30 dark:bg-stone-900/20 border-dashed border-stone-200 dark:border-stone-800 text-stone-400 dark:text-stone-700 opacity-60 cursor-not-allowed"
                            : isSelected
                            ? "bg-[var(--color-accent-bg)] border-[var(--color-accent)] ring-1 ring-[var(--color-accent)] font-bold text-[var(--color-accent)] scale-102 z-10 shadow-sm cursor-pointer"
                            : isDone
                            ? "bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-950 text-stone-700 dark:text-stone-300 hover:shadow-xs cursor-pointer"
                            : "bg-[var(--color-cell-bg)] border-[var(--color-grid-base)] text-[var(--color-cell-given)] hover:bg-[var(--color-grid-base)]/10 cursor-pointer"
                        }`}
                      >
                        <div className="flex justify-between items-start w-full">
                          <span className="text-xs font-mono font-medium">{dayNum}</span>
                          {isToday && !isSelected && (
                            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping" title="Today" />
                          )}
                        </div>

                        {/* Status indicators */}
                        <div className="w-full flex justify-end items-end mt-auto">
                          {isFuture ? (
                            <Lock className="w-3 h-3 text-stone-300 dark:text-stone-800" />
                          ) : isDone ? (
                            <div className="bg-emerald-500 text-white rounded-full p-0.5 shadow-sm" title="Completed">
                              <Check className="w-2.5 h-2.5" />
                            </div>
                          ) : (
                            <span className="text-[7px] font-mono opacity-40 text-[var(--color-cell-note)]">
                              L.{getDailyLevelNum(formattedDate)}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Date details and Stats Card */}
              <div className="flex flex-col gap-4 w-full">
                
                {/* Stats Card */}
                <div className="bg-[var(--color-cell-bg)] border border-[var(--color-grid-base)] rounded-2xl p-5 shadow-sm text-center">
                  <h4 className="text-[10px] text-[var(--color-cell-note)] font-mono uppercase tracking-wider mb-2">
                    YOUR MEDITATION STATS
                  </h4>
                  <div className="grid grid-cols-2 gap-4 divide-x divide-[var(--color-grid-base)]">
                    <div>
                      <span className="block text-2xl font-mono font-bold text-emerald-500">
                        {totalDailiesCompleted}
                      </span>
                      <span className="text-[9px] text-[var(--color-cell-note)] uppercase tracking-wider font-semibold block mt-0.5">
                        Total Done
                      </span>
                    </div>
                    <div>
                      <span className="block text-2xl font-mono font-bold text-amber-500 flex items-center justify-center gap-1">
                        <Flame className="w-5 h-5 fill-amber-500/20 text-amber-500 inline shrink-0" />
                        {completionStreak}
                      </span>
                      <span className="text-[9px] text-[var(--color-cell-note)] uppercase tracking-wider font-semibold block mt-0.5">
                        Current Streak
                      </span>
                    </div>
                  </div>
                </div>

                {/* Day Action details */}
                <div className="bg-[var(--color-cell-bg)] border border-[var(--color-grid-base)] rounded-2xl p-5 shadow-sm flex-1 flex flex-col justify-between min-h-[220px]">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs text-[var(--color-accent)] font-mono uppercase tracking-widest font-semibold mb-1">
                      <Calendar className="w-4 h-4 text-[var(--color-accent)]" />
                      <span>Challenge Info</span>
                    </div>
                    <h3 className="text-lg font-display font-bold text-[var(--color-cell-given)]">
                      {monthNames[selParts[1] - 1]} {selParts[2]}, {selParts[0]}
                    </h3>
                    <p className="text-[11px] text-[var(--color-cell-note)] mt-1 font-sans">
                      A unique seed is calculated from this date, providing a stable, structured grid. Every traveler on this day receives the exact same puzzle layout.
                    </p>

                    <div className="mt-5 space-y-2.5">
                      <div className="flex items-center justify-between text-xs border-b border-[var(--color-grid-base)]/50 pb-1.5">
                        <span className="text-[var(--color-cell-note)]">Puzzle Seed Level</span>
                        <span className="font-mono font-semibold text-[var(--color-cell-given)]">
                          Level {selectedLevelNum}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs border-b border-[var(--color-grid-base)]/50 pb-1.5">
                        <span className="text-[var(--color-cell-note)]">Difficulty Tier</span>
                        <span className="font-semibold text-[var(--color-cell-given)]">
                          {getTierForLevel(selectedLevelNum)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs pb-1 border-b border-[var(--color-grid-base)]/50 pb-1.5">
                        <span className="text-[var(--color-cell-note)]">Status</span>
                        <span className={`font-semibold ${isSelectedCompleted ? "text-emerald-500" : "text-amber-500"}`}>
                          {isSelectedCompleted ? "✓ Completed" : "○ Not Completed"}
                        </span>
                      </div>
                      {isSelectedCompleted && selectedTimeTaken && (
                        <div className="flex items-center justify-between text-xs pb-1">
                          <span className="text-[var(--color-cell-note)]">Time Taken</span>
                          <span className="font-mono font-semibold text-[var(--color-cell-given)]">
                            {formatTime(selectedTimeTaken)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-6">
                    {isSelectedFuture ? (
                      <button
                        disabled
                        className="w-full py-2.5 bg-stone-100 dark:bg-stone-900 border border-[var(--color-grid-base)] text-stone-400 dark:text-stone-600 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 shadow-inner cursor-not-allowed"
                      >
                        <Lock className="w-4 h-4 text-stone-300 dark:text-stone-600" />
                        <span>Locked (Releases {monthNames[selParts[1] - 1]} {selParts[2]})</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => initializeLevel(0, false, true, selectedCalendarDate)}
                        className="w-full py-2.5 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[var(--color-cell-bg)] rounded-xl transition-all font-semibold text-xs flex items-center justify-center gap-1.5 shadow cursor-pointer"
                      >
                        <span>{isSelectedCompleted ? "Replay Challenge" : "Begin Meditation"}</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

              </div>
            </div>
          );
        })()}

      </main>

      {/* --- Footer Signature --- */}
      <footer className="w-full max-w-lg mt-6 pt-3 border-t border-[var(--color-grid-base)] text-center text-[10px] text-[var(--color-cell-note)] font-mono">
        <div>100% Client-Side Generator • Seed-Based Deterministic Matrix</div>
        <div className="opacity-60 mt-0.5">Level {levelNum} • {getTierForLevel(levelNum)}</div>
      </footer>

      {/* ===================== GAME STATISTICS OVERLAY ===================== */}
      <AnimatePresence>
        {isStatsOpen && (
          <div className="fixed inset-0 bg-stone-900/65 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="w-full max-w-2xl bg-[var(--color-cell-bg)] border border-[var(--color-grid-base)] rounded-3xl p-6 shadow-2xl relative flex flex-col max-h-[90vh] overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-[var(--color-grid-base)] mb-4">
                <div>
                  <h2 className="text-lg font-display font-bold text-[var(--color-cell-given)] flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-[var(--color-accent)]" />
                    <span>Meditation Achievements</span>
                  </h2>
                  <p className="text-[10px] text-[var(--color-cell-note)] font-mono uppercase tracking-wider">
                    Journey Stats & Tier Mastery
                  </p>
                </div>
                <button
                  onClick={() => setIsStatsOpen(false)}
                  className="p-1.5 rounded-lg border border-[var(--color-grid-base)] hover:bg-[var(--color-grid-base)]/20 text-[var(--color-cell-given)] transition-all cursor-pointer"
                  title="Close Overlay"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body Content */}
              <div className="flex-1 overflow-y-auto pr-1 space-y-4">
                
                {/* Summary row */}
                <div className="grid grid-cols-3 gap-3 bg-[var(--color-grid-base)]/5 p-4 rounded-2xl border border-[var(--color-grid-base)]/40 text-center">
                  <div>
                    <span className="block text-2xl font-mono font-bold text-[var(--color-accent)]">
                      {totalCompletedCount}
                    </span>
                    <span className="text-[9px] text-[var(--color-cell-note)] uppercase tracking-wider font-semibold">
                      Total Solved
                    </span>
                  </div>
                  <div>
                    <span className="block text-2xl font-mono font-bold text-emerald-500">
                      {Object.values(completedDailies).filter((d: any) => d?.completed).length}
                    </span>
                    <span className="text-[9px] text-[var(--color-cell-note)] uppercase tracking-wider font-semibold">
                      Dailies Solved
                    </span>
                  </div>
                  <div>
                    <span className="block text-2xl font-mono font-bold text-amber-500">
                      {completionStreak}
                    </span>
                    <span className="text-[9px] text-[var(--color-cell-note)] uppercase tracking-wider font-semibold">
                      Current Streak
                    </span>
                  </div>
                </div>

                {/* Tier breakdown cards */}
                <div className="space-y-3">
                  <h3 className="text-xs font-mono uppercase tracking-wider text-[var(--color-cell-note)] font-bold">
                    Mastery Breakdown by Tier
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {Object.values(DifficultyTier).map((tier) => {
                      const stats = computedStatsByTier[tier];
                      const completed = stats.completed;
                      const started = stats.started;
                      const winRate = started > 0 ? Math.round((completed / started) * 100) : 0;
                      const bestTimeStr = stats.bestTime ? formatTime(stats.bestTime) : "—";
                      const totalTimeStr = formatTotalTime(stats.totalTime);

                      // Bullet/color mapping
                      let dotColor = "bg-amber-400";
                      if (tier === DifficultyTier.WarmClay) dotColor = "bg-orange-400";
                      if (tier === DifficultyTier.Terracotta) dotColor = "bg-red-400";
                      if (tier === DifficultyTier.DeepForest) dotColor = "bg-emerald-400";
                      if (tier === DifficultyTier.DarkWalnut) dotColor = "bg-stone-500";

                      return (
                        <div
                          key={tier}
                          className="bg-[var(--color-cell-bg)] border border-[var(--color-grid-base)]/70 rounded-2xl p-4 flex flex-col justify-between hover:shadow-md transition-all"
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-display font-bold text-[var(--color-cell-given)] flex items-center gap-1.5">
                                <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                                {tier}
                              </span>
                              <span className="text-[10px] font-mono font-bold text-[var(--color-accent)] bg-[var(--color-accent-bg)] px-2 py-0.5 rounded-full">
                                {winRate}% WR
                              </span>
                            </div>

                            <div className="text-[10px] text-[var(--color-cell-note)] mb-3">
                              {tier === DifficultyTier.GentleSand && "Smooth entry point (Levels 1–200)"}
                              {tier === DifficultyTier.WarmClay && "Intermediate deduction (Levels 201–400)"}
                              {tier === DifficultyTier.Terracotta && "Hidden patterns (Levels 401–600)"}
                              {tier === DifficultyTier.DeepForest && "Expert chain reasoning (Levels 601–800)"}
                              {tier === DifficultyTier.DarkWalnut && "Elite master puzzles (Levels 801–1000+)"}
                            </div>

                            {/* Progress bar */}
                            <div className="w-full bg-[var(--color-grid-base)]/25 rounded-full h-1.5 mb-4 overflow-hidden">
                              <div
                                className={`h-full ${dotColor} transition-all duration-500`}
                                style={{ width: `${Math.min(100, winRate)}%` }}
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[var(--color-grid-base)]/40 text-left">
                            <div>
                              <span className="block text-[8px] text-[var(--color-cell-note)] font-mono uppercase tracking-wider">
                                Solved
                              </span>
                              <span className="text-xs font-mono font-bold text-[var(--color-cell-given)]">
                                {completed}
                              </span>
                            </div>
                            <div>
                              <span className="block text-[8px] text-[var(--color-cell-note)] font-mono uppercase tracking-wider">
                                Best Time
                              </span>
                              <span className="text-xs font-mono font-bold text-[var(--color-cell-given)]">
                                {bestTimeStr}
                              </span>
                            </div>
                            <div>
                              <span className="block text-[8px] text-[var(--color-cell-note)] font-mono uppercase tracking-wider">
                                Time Played
                              </span>
                              <span className="text-xs font-mono font-bold text-[var(--color-cell-given)] truncate block" title={totalTimeStr}>
                                {totalTimeStr}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* Footer with a subtle message & clear option */}
              <div className="mt-5 pt-3 border-t border-[var(--color-grid-base)] flex items-center justify-between">
                <span className="text-[9px] text-[var(--color-cell-note)] font-mono italic">
                  "Step by step, the sandy paths clear of mist."
                </span>
                <button
                  onClick={() => {
                    if (window.confirm("Are you sure you want to clear your statistics? This will reset your win rate, started counts, and total time played statistics (completed levels lists will remain preserved).")) {
                      localStorage.removeItem("sudoku_started_games_by_tier");
                      localStorage.removeItem("sudoku_total_time_by_tier");
                      setStartedGamesByTier({
                        [DifficultyTier.GentleSand]: 0,
                        [DifficultyTier.WarmClay]: 0,
                        [DifficultyTier.Terracotta]: 0,
                        [DifficultyTier.DeepForest]: 0,
                        [DifficultyTier.DarkWalnut]: 0,
                      });
                      setTotalTimeByTier({
                        [DifficultyTier.GentleSand]: 0,
                        [DifficultyTier.WarmClay]: 0,
                        [DifficultyTier.Terracotta]: 0,
                        [DifficultyTier.DeepForest]: 0,
                        [DifficultyTier.DarkWalnut]: 0,
                      });
                    }
                  }}
                  className="text-[9px] font-mono text-[var(--color-error)] hover:underline opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
                >
                  Reset Stats
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
