import { describe, it, expect } from "vitest";
import { levels } from "./levels";
import { execute } from "../engine/execute";
import { parse } from "../engine/parser";

describe("уровни решаются эталонным решением", () => {
  for (const level of levels) {
    it(`${level.id} · ${level.title}`, () => {
      let repo = level.setup();
      const commands: string[] = [];
      for (const cmd of level.solution) {
        const parsed = parse(cmd);
        if (parsed) commands.push(parsed.cmd);
        const res = execute(repo, cmd);
        expect(res.ok, `команда "${cmd}" не должна падать`).toBe(true);
        if (res.ok) repo = res.repo;
      }
      expect(level.validate(repo, { commands })).toBe(true);
    });
  }
});

describe("уровни корректно собраны", () => {
  it("id уникальны", () => {
    const ids = levels.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("у каждого уровня есть цель, подсказка и решение", () => {
    for (const l of levels) {
      expect(l.goal.length).toBeGreaterThan(0);
      expect(l.hint.length).toBeGreaterThan(0);
      expect(l.solution.length).toBeGreaterThan(0);
    }
  });
});
