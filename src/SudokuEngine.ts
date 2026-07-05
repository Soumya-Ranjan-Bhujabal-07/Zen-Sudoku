/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DifficultyTier, Cell } from "./types";

/**
 * A fast, deterministic seed-based Pseudo-Random Number Generator (Mulberry32).
 */
export class SeededRandom {
  private state: number;

  constructor(seed: number) {
    this.state = seed | 0;
    if (this.state === 0) {
      this.state = 0x12345678;
    }
  }

  /**
   * Returns a random float between 0 and 1.
   */
  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Returns a random integer in [min, max] inclusive.
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * Shuffles an array in place deterministically.
   */
  shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      const temp = result[i];
      result[i] = result[j];
      result[j] = temp;
    }
    return result;
  }
}

/**
 * Deep copy a 9x9 board.
 */
function copyBoard(board: number[][]): number[][] {
  return board.map((row) => [...row]);
}

/**
 * Quick validation of a value placement.
 */
function isValidPlacement(board: number[][], r: number, c: number, val: number): boolean {
  for (let i = 0; i < 9; i++) {
    if (board[r][i] === val && i !== c) return false;
    if (board[i][c] === val && i !== r) return false;
    
    const boxRow = 3 * Math.floor(r / 3) + Math.floor(i / 3);
    const boxCol = 3 * Math.floor(c / 3) + (i % 3);
    if (board[boxRow][boxCol] === val && (boxRow !== r || boxCol !== c)) {
      return false;
    }
  }
  return true;
}

/**
 * Solves a Sudoku board using an optimized backtracking algorithm.
 * Stops after finding 'limit' number of solutions.
 * Returns the solution count and the first solution found.
 */
export function solveSudoku(
  grid: number[][],
  limit: number = 2,
  maxSteps: number = 2000
): { count: number; solution: number[][] | null; steps: number } {
  let count = 0;
  let firstSolution: number[][] | null = null;
  let steps = 0;
  const board = copyBoard(grid);

  function findNextCell(): [number, number] | null {
    // Find empty cell with fewest possibilities (MRV - Minimum Remaining Values heuristic)
    let bestR = -1;
    let bestC = -1;
    let minPossibilities = 10;

    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (board[r][c] === 0) {
          let possibilities = 0;
          for (let val = 1; val <= 9; val++) {
            if (isValidPlacement(board, r, c, val)) {
              possibilities++;
            }
          }
          if (possibilities < minPossibilities) {
            minPossibilities = possibilities;
            bestR = r;
            bestC = c;
          }
        }
      }
    }

    if (bestR === -1) return null;
    return [bestR, bestC];
  }

  function backtrack(): boolean {
    steps++;
    if (steps > maxSteps) {
      return true; // Force-abort if taking too long (fallback to safe-keeping)
    }

    const next = findNextCell();
    if (!next) {
      count++;
      if (!firstSolution) {
        firstSolution = copyBoard(board);
      }
      return count >= limit;
    }

    const [r, c] = next;
    for (let val = 1; val <= 9; val++) {
      if (isValidPlacement(board, r, c, val)) {
        board[r][c] = val;
        if (backtrack()) return true;
        board[r][c] = 0;
      }
    }
    return false;
  }

  backtrack();
  return { count, solution: firstSolution, steps };
}

/**
 * Returns the difficulty tier for a given level number.
 */
export function getTierForLevel(level: number): DifficultyTier {
  if (level <= 200) return DifficultyTier.GentleSand;
  if (level <= 400) return DifficultyTier.WarmClay;
  if (level <= 600) return DifficultyTier.Terracotta;
  if (level <= 800) return DifficultyTier.DeepForest;
  return DifficultyTier.DarkWalnut;
}

/**
 * Returns the target givens count for a given level.
 */
export function getGivensForLevel(level: number): number {
  if (level <= 200) {
    // Level 1-200: 36 - 40 givens
    const ratio = (level - 1) / 199;
    return Math.round(40 - ratio * 4);
  } else if (level <= 400) {
    // Level 201-400: 31 - 35 givens
    const ratio = (level - 201) / 199;
    return Math.round(35 - ratio * 4);
  } else if (level <= 600) {
    // Level 401-600: 27 - 30 givens
    const ratio = (level - 401) / 199;
    return Math.round(30 - ratio * 3);
  } else if (level <= 800) {
    // Level 601-800: 24 - 26 givens
    const ratio = (level - 601) / 199;
    return Math.round(26 - ratio * 2);
  } else {
    // Level 801-1000+: 21 - 23 givens
    const ratio = Math.min(1, (level - 801) / 199);
    return Math.round(23 - ratio * 2);
  }
}

/**
 * Generates a fully-solved Sudoku board using a seed-based PRNG.
 */
function generateSolvedBoard(rng: SeededRandom): number[][] {
  const board = Array.from({ length: 9 }, () => Array(9).fill(0));

  function fill(): boolean {
    // Find first empty cell
    let r = -1;
    let c = -1;
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) {
        if (board[i][j] === 0) {
          r = i;
          c = j;
          break;
        }
      }
      if (r !== -1) break;
    }

    if (r === -1) return true; // Filled completely

    const numbers = rng.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    for (const num of numbers) {
      if (isValidPlacement(board, r, c, num)) {
        board[r][c] = num;
        if (fill()) return true;
        board[r][c] = 0;
      }
    }
    return false;
  }

  fill();
  return board;
}

/**
 * Primary engine function: Deterministically generates a beautiful, symmetric, unique Sudoku puzzle.
 */
export function generateSudokuPuzzle(level: number): {
  puzzle: number[][];
  solution: number[][];
  givensCount: number;
  tier: DifficultyTier;
  estimatedComplexity: number;
} {
  const rng = new SeededRandom(level);
  const solution = generateSolvedBoard(rng);
  const puzzle = copyBoard(solution);

  const targetGivens = getGivensForLevel(level);
  const tier = getTierForLevel(level);

  // Prepare symmetric cell pairs to dig (180-degree rotational symmetry)
  // Each pair is [ [r1, c1], [r2, c2] ]
  const pairs: [number, number][][] = [];
  const visited = Array.from({ length: 9 }, () => Array(9).fill(false));

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (!visited[r][c]) {
        const symR = 8 - r;
        const symC = 8 - c;
        visited[r][c] = true;
        visited[symR][symC] = true;

        if (r === symR && c === symC) {
          pairs.push([[r, c]]);
        } else {
          pairs.push([[r, c], [symR, symC]]);
        }
      }
    }
  }

  // Shuffle the pairs to randomize the digging order
  const shuffledPairs = rng.shuffle(pairs);

  let currentGivens = 81;

  for (const pair of shuffledPairs) {
    if (currentGivens <= targetGivens) {
      break;
    }

    // Temporarily dig this pair
    const savedValues: { r: number; c: number; val: number }[] = [];
    for (const cell of pair) {
      const [cr, cc] = cell;
      savedValues.push({ r: cr, c: cc, val: puzzle[cr][cc] });
      puzzle[cr][cc] = 0;
    }

    // Check if the solution is still unique
    // We restrict backtracking steps here for rapid generation
    const solveResult = solveSudoku(puzzle, 2, 800);

    if (solveResult.count === 1) {
      // Unique solution maintained! Keep dug.
      currentGivens -= pair.length;
    } else {
      // Not unique or timed out, restore values
      for (const saved of savedValues) {
        puzzle[saved.r][saved.c] = saved.val;
      }
    }
  }

  // Double check our result. In rare extreme cases, if we couldn't dig enough symmetrically,
  // we can do a secondary single-cell dig pass to get closer to the target without symmetry.
  if (currentGivens > targetGivens + 3) {
    const singleCells: [number, number][] = [];
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (puzzle[r][c] !== 0) {
          singleCells.push([r, c]);
        }
      }
    }
    const shuffledSingles = rng.shuffle(singleCells);
    for (const [r, c] of shuffledSingles) {
      if (currentGivens <= targetGivens) break;

      const savedVal = puzzle[r][c];
      puzzle[r][c] = 0;

      const solveResult = solveSudoku(puzzle, 2, 800);
      if (solveResult.count === 1) {
        currentGivens--;
      } else {
        puzzle[r][c] = savedVal;
      }
    }
  }

  // Calculate the complexity using a final solving step count
  const finalSolve = solveSudoku(puzzle, 1, 3000);

  return {
    puzzle,
    solution,
    givensCount: currentGivens,
    tier,
    estimatedComplexity: finalSolve.steps,
  };
}

/**
 * Checks if a complete grid matches the correct solution.
 */
export function validateBoard(cells: Cell[][]): boolean {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const cell = cells[r][c];
      if (cell.value !== 0 && cell.value !== cell.solutionValue) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Gets all conflicts (duplicate coordinates) in the current grid.
 * Useful for high-fidelity error highlighting.
 */
export function getConflicts(cells: Cell[][]): Set<string> {
  const conflicts = new Set<string>();

  // Check rows
  for (let r = 0; r < 9; r++) {
    const seen = new Map<number, number[]>();
    for (let c = 0; c < 9; c++) {
      const val = cells[r][c].value;
      if (val !== 0) {
        if (!seen.has(val)) seen.set(val, []);
        seen.get(val)!.push(c);
      }
    }
    for (const [val, cols] of seen.entries()) {
      if (cols.length > 1) {
        cols.forEach((c) => conflicts.add(`${r},${c}`));
      }
    }
  }

  // Check columns
  for (let c = 0; c < 9; c++) {
    const seen = new Map<number, number[]>();
    for (let r = 0; r < 9; r++) {
      const val = cells[r][c].value;
      if (val !== 0) {
        if (!seen.has(val)) seen.set(val, []);
        seen.get(val)!.push(r);
      }
    }
    for (const [val, rows] of seen.entries()) {
      if (rows.length > 1) {
        rows.forEach((r) => conflicts.add(`${r},${c}`));
      }
    }
  }

  // Check 3x3 boxes
  for (let b = 0; b < 9; b++) {
    const boxRowStart = 3 * Math.floor(b / 3);
    const boxColStart = 3 * (b % 3);
    const seen = new Map<number, { r: number; c: number }[]>();

    for (let i = 0; i < 9; i++) {
      const r = boxRowStart + Math.floor(i / 3);
      const c = boxColStart + (i % 3);
      const val = cells[r][c].value;
      if (val !== 0) {
        if (!seen.has(val)) seen.set(val, []);
        seen.get(val)!.push({ r, c });
      }
    }

    for (const [val, coords] of seen.entries()) {
      if (coords.length > 1) {
        coords.forEach(({ r, c }) => conflicts.add(`${r},${c}`));
      }
    }
  }

  return conflicts;
}
