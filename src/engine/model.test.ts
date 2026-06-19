import { describe, it, expect } from "vitest";
import {
  ancestors,
  isAncestor,
  mergeBase,
  headCommitId,
  snapshotAt,
} from "./model";
import { createLinearRepo, createEmptyRepo } from "./repo";

describe("createLinearRepo", () => {
  it("строит цепочку коммитов на main", () => {
    const repo = createLinearRepo(3);
    expect(Object.keys(repo.commits)).toEqual(["C1", "C2", "C3"]);
    expect(repo.branches.main).toBe("C3");
    expect(repo.commits.C2.parents).toEqual(["C1"]);
    expect(headCommitId(repo)).toBe("C3");
  });
});

describe("createEmptyRepo", () => {
  it("main не родилась", () => {
    const repo = createEmptyRepo();
    expect(repo.branches.main).toBeNull();
    expect(headCommitId(repo)).toBeNull();
  });
});

describe("ancestors / isAncestor", () => {
  it("включает сам коммит и всех предков", () => {
    const repo = createLinearRepo(3);
    expect([...ancestors(repo, "C3")].sort()).toEqual(["C1", "C2", "C3"]);
    expect(isAncestor(repo, "C1", "C3")).toBe(true);
    expect(isAncestor(repo, "C3", "C1")).toBe(false);
  });
});

describe("mergeBase", () => {
  it("находит общий предок после расхождения", () => {
    // C1 - C2 (main)
    //        \
    //         C3 (feature)
    const repo = createLinearRepo(2);
    repo.commits.C3 = { id: "C3", parents: ["C2"], message: "f" };
    repo.commits.C4 = { id: "C4", parents: ["C2"], message: "m" };
    repo.seq = 4;
    expect(mergeBase(repo, "C3", "C4")).toBe("C2");
  });
});

describe("snapshotAt", () => {
  it("берёт последнее значение файла по цепочке", () => {
    const repo = createEmptyRepo();
    repo.commits.C1 = { id: "C1", parents: [], message: "a", file: "readme", content: "v1" };
    repo.commits.C2 = { id: "C2", parents: ["C1"], message: "b", file: "readme", content: "v2" };
    repo.branches.main = "C2";
    repo.seq = 2;
    expect(snapshotAt(repo, "C2")).toEqual({ readme: "v2" });
  });
});
