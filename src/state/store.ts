import { create } from "zustand";
import type { Repo } from "../engine/model";
import { execute } from "../engine/execute";
import { parse } from "../engine/parser";
import { levels } from "../levels/levels";
import { loadProgress, saveProgress } from "./progress";

export type LineKind = "input" | "output" | "error" | "success";
export interface OutputLine {
  kind: LineKind;
  text: string;
}

interface GameState {
  levelIndex: number;
  repo: Repo;
  output: OutputLine[];
  commands: string[]; // имена команд, введённых на текущем уровне
  solved: boolean;
  hintShown: boolean;
  completed: Set<string>;

  runCommand: (input: string) => void;
  goToLevel: (index: number) => void;
  nextLevel: () => void;
  restartLevel: () => void;
  toggleHint: () => void;
}

function welcomeLines(index: number): OutputLine[] {
  const lvl = levels[index];
  return [
    { kind: "output", text: `▸ ${lvl.world}` },
    { kind: "output", text: `Уровень ${lvl.id}: ${lvl.title}` },
    { kind: "output", text: lvl.intro },
    { kind: "output", text: `🎯 Цель: ${lvl.goal}` },
  ];
}

export const useGame = create<GameState>((set, get) => ({
  levelIndex: 0,
  repo: levels[0].setup(),
  output: welcomeLines(0),
  commands: [],
  solved: false,
  hintShown: false,
  completed: loadProgress(),

  runCommand: (input: string) => {
    const trimmed = input.trim();
    if (!trimmed) return;
    const state = get();
    const lines: OutputLine[] = [{ kind: "input", text: `$ ${trimmed}` }];

    // Локальные удобные команды, не трогающие git
    if (trimmed === "clear") {
      set({ output: [] });
      return;
    }
    if (trimmed === "solution" || trimmed === "решение") {
      const sol = levels[state.levelIndex].solution;
      set({
        output: [
          ...state.output,
          ...lines,
          { kind: "output", text: "Эталонное решение:" },
          ...sol.map((s) => ({ kind: "output" as const, text: "  " + s })),
        ],
      });
      return;
    }

    const res = execute(state.repo, trimmed);
    const parsed = parse(trimmed);

    if (!res.ok) {
      set({
        output: [...state.output, ...lines, { kind: "error", text: res.error || "неизвестная команда" }],
      });
      return;
    }

    for (const t of res.output) lines.push({ kind: "output", text: t });
    const commands = parsed ? [...state.commands, parsed.cmd] : state.commands;
    const level = levels[state.levelIndex];
    const justSolved = !state.solved && level.validate(res.repo, { commands });

    if (justSolved) {
      lines.push({ kind: "success", text: "✅ Уровень пройден! Жми «Следующий уровень»." });
      const completed = new Set(state.completed).add(level.id);
      saveProgress(completed);
      set({ repo: res.repo, output: [...state.output, ...lines], commands, solved: true, completed });
    } else {
      set({ repo: res.repo, output: [...state.output, ...lines], commands });
    }
  },

  goToLevel: (index: number) => {
    if (index < 0 || index >= levels.length) return;
    set({
      levelIndex: index,
      repo: levels[index].setup(),
      output: welcomeLines(index),
      commands: [],
      solved: false,
      hintShown: false,
    });
  },

  nextLevel: () => {
    const { levelIndex } = get();
    if (levelIndex < levels.length - 1) get().goToLevel(levelIndex + 1);
  },

  restartLevel: () => get().goToLevel(get().levelIndex),

  toggleHint: () => set((s) => ({ hintShown: !s.hintShown })),
}));
