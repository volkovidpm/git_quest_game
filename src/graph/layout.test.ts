import { describe, it, expect } from "vitest";
import { layout } from "./layout";
import { createLinearRepo } from "../engine/repo";
import { execute } from "../engine/execute";

describe("layout", () => {
  it("линейная история: одна дорожка, растущая глубина", () => {
    const g = layout(createLinearRepo(3));
    expect(g.nodes.map((n) => n.lane)).toEqual([0, 0, 0]);
    expect(g.nodes.map((n) => n.col)).toEqual([0, 1, 2]);
    expect(g.lanes).toBe(1);
  });

  it("ветка получает отдельную дорожку", () => {
    let r = createLinearRepo(1);
    for (const cmd of ["git switch -c feature", "git commit -m f"]) {
      const res = execute(r, cmd);
      if (res.ok) r = res.repo;
    }
    const g = layout(r);
    const featureTip = g.nodes.find((n) => n.id === r.branches.feature);
    expect(featureTip?.lane).toBeGreaterThan(0);
    expect(g.branchLabels.some((b) => b.name === "feature" && b.isHead)).toBe(true);
  });

  it("строит рёбра родитель -> потомок", () => {
    const g = layout(createLinearRepo(2));
    expect(g.edges).toEqual([{ from: "C1", to: "C2" }]);
  });
});
