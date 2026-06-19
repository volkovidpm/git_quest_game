import { describe, it, expect } from "vitest";
import { execute } from "./execute";
import { createEmptyRepo, createLinearRepo } from "./repo";
import { headCommitId, currentBranch, type Repo } from "./model";

/** Прогнать цепочку команд, бросив ошибку при первой неудаче. */
function run(repo: Repo, ...cmds: string[]): Repo {
  let r = repo;
  for (const c of cmds) {
    const res = execute(r, c);
    if (!res.ok) throw new Error(`"${c}" -> ${res.error}`);
    r = res.repo;
  }
  return r;
}

describe("commit", () => {
  it("первый коммит рождает ветку main", () => {
    const r = run(createEmptyRepo(), 'git commit -m "первый"');
    expect(headCommitId(r)).toBe("C1");
    expect(r.commits.C1.parents).toEqual([]);
    expect(r.commits.C1.message).toBe("первый");
  });

  it("второй коммит ссылается на первый", () => {
    const r = run(createEmptyRepo(), "git commit -m a", "git commit -m b");
    expect(r.commits.C2.parents).toEqual(["C1"]);
    expect(r.branches.main).toBe("C2");
  });
});

describe("branch / switch", () => {
  it("создаёт ветку и переключается", () => {
    const r = run(createLinearRepo(2), "git switch -c feature", "git commit -m f");
    expect(currentBranch(r)).toBe("feature");
    expect(r.branches.feature).toBe("C3");
    expect(r.branches.main).toBe("C2"); // main не двинулась
  });

  it("ошибка при переключении на несуществующее", () => {
    const res = execute(createLinearRepo(1), "git switch nope");
    expect(res.ok).toBe(false);
  });
});

describe("merge", () => {
  it("fast-forward двигает ветку", () => {
    const r = run(
      createLinearRepo(1),
      "git switch -c feature",
      "git commit -m f1",
      "git switch main",
      "git merge feature"
    );
    expect(r.branches.main).toBe(r.branches.feature);
  });

  it("создаёт merge-коммит при расхождении", () => {
    const r = run(
      createLinearRepo(1),
      "git switch -c feature",
      "git commit -m f1",
      "git switch main",
      "git commit -m m1",
      "git merge feature"
    );
    const head = headCommitId(r)!;
    expect(r.commits[head].parents).toHaveLength(2);
  });
});

describe("merge с конфликтом", () => {
  it("конфликт по файлу разрешается через add + commit", () => {
    // base: C1 (file app = v0)
    const repo = createEmptyRepo();
    repo.commits.C1 = { id: "C1", parents: [], message: "base", file: "app", content: "v0" };
    repo.branches.main = "C1";
    repo.seq = 1;
    // feature меняет app -> vF, main меняет app -> vM
    let r = run(repo, "git switch -c feature");
    r.commits.C2 = { id: "C2", parents: ["C1"], message: "f", file: "app", content: "vF" };
    r.branches.feature = "C2";
    r.seq = 2;
    r = run(r, "git switch main");
    r.commits.C3 = { id: "C3", parents: ["C1"], message: "m", file: "app", content: "vM" };
    r.branches.main = "C3";
    r.seq = 3;

    const conflicted = execute(r, "git merge feature");
    expect(conflicted.ok).toBe(true);
    expect(conflicted.ok && conflicted.repo.pendingMerge?.conflicts).toEqual(["app"]);

    // нельзя коммитить пока не разрешено
    const blocked = execute(conflicted.ok ? conflicted.repo : r, "git commit");
    expect(blocked.ok).toBe(false);

    // разрешаем и коммитим
    const done = run(conflicted.ok ? conflicted.repo : r, "git add app", "git commit");
    expect(done.pendingMerge).toBeUndefined();
    const head = headCommitId(done)!;
    expect(done.commits[head].parents).toHaveLength(2);
  });
});

describe("reset / revert", () => {
  it("reset двигает ветку назад", () => {
    const r = run(createLinearRepo(3), "git reset --hard HEAD~1");
    expect(headCommitId(r)).toBe("C2");
  });

  it("revert добавляет отменяющий коммит", () => {
    const r = run(createLinearRepo(2), "git revert HEAD");
    expect(headCommitId(r)).toBe("C3");
    expect(r.commits.C3.message).toContain("Revert");
  });
});

describe("rebase / cherry-pick", () => {
  it("rebase переносит коммиты ветки на upstream", () => {
    const r = run(
      createLinearRepo(1),
      "git switch -c feature",
      "git commit -m f1",
      "git switch main",
      "git commit -m m1",
      "git switch feature",
      "git rebase main"
    );
    // f1 должен быть перенесён поверх m1: его новый родитель — коммит main
    const head = headCommitId(r)!;
    expect(r.commits[head].parents[0]).toBe(r.branches.main);
  });

  it("cherry-pick копирует коммит на текущую ветку", () => {
    const r = run(
      createLinearRepo(1),
      "git switch -c feature",
      "git commit -m спец",
      "git switch main",
      "git cherry-pick feature"
    );
    const head = headCommitId(r)!;
    expect(r.commits[head].message).toBe("спец");
  });
});

describe("remote: fetch / push / pull", () => {
  function repoWithOrigin(): Repo {
    const r = createLinearRepo(2);
    r.remotes.origin = {
      commits: structuredClone(r.commits),
      branches: { main: "C2" },
    };
    r.remoteTracking["origin/main"] = "C2";
    return r;
  }

  it("push отправляет новый коммит в origin", () => {
    const r = run(repoWithOrigin(), "git commit -m local", "git push");
    expect(r.remotes.origin.branches.main).toBe("C3");
    expect(r.remotes.origin.commits.C3).toBeDefined();
    expect(r.remoteTracking["origin/main"]).toBe("C3");
  });

  it("pull подтягивает и двигает ветку (fast-forward)", () => {
    const r = repoWithOrigin();
    // origin ушёл вперёд
    r.remotes.origin.commits.C3 = { id: "C3", parents: ["C2"], message: "remote" };
    r.remotes.origin.branches.main = "C3";
    const after = run(r, "git pull");
    expect(headCommitId(after)).toBe("C3");
  });
});
