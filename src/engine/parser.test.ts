import { describe, it, expect } from "vitest";
import { parse, tokenize } from "./parser";

describe("tokenize", () => {
  it("разбивает по пробелам", () => {
    expect(tokenize("git commit -m hi")).toEqual(["git", "commit", "-m", "hi"]);
  });

  it("сохраняет фразу в двойных кавычках как один токен", () => {
    expect(tokenize('git commit -m "hello world"')).toEqual([
      "git",
      "commit",
      "-m",
      "hello world",
    ]);
  });

  it("сохраняет пустую строку в кавычках", () => {
    expect(tokenize('commit -m ""')).toEqual(["commit", "-m", ""]);
  });
});

describe("parse", () => {
  it("возвращает null на пустой строке", () => {
    expect(parse("")).toBeNull();
    expect(parse("   ")).toBeNull();
  });

  it("отбрасывает префикс git", () => {
    expect(parse("git status")?.cmd).toBe("status");
    expect(parse("status")?.cmd).toBe("status");
  });

  it("разбирает -m как значение message", () => {
    const p = parse('git commit -m "первый коммит"');
    expect(p).toEqual({ cmd: "commit", args: [], flags: { message: "первый коммит" } });
  });

  it("собирает позиционные аргументы", () => {
    const p = parse("git merge feature");
    expect(p?.args).toEqual(["feature"]);
  });

  it("разбирает -c <name> как create", () => {
    const p = parse("git switch -c feature");
    expect(p?.flags.create).toBe("feature");
  });

  it("булевы флаги: --hard", () => {
    const p = parse("git reset --hard HEAD~1");
    expect(p?.flags.hard).toBe(true);
    expect(p?.args).toEqual(["HEAD~1"]);
  });

  it("--onto забирает значение", () => {
    const p = parse("git rebase --onto main feature topic");
    expect(p?.flags.onto).toBe("main");
    expect(p?.args).toEqual(["feature", "topic"]);
  });
});
