import type { Commit, Repo } from "./model";
import { headCommitId } from "./model";

/**
 * Разрешить ссылку в id коммита. Понимает:
 *   HEAD, HEAD~2, HEAD^, <branch>, <branch>~1, <commitId>, origin/<branch>.
 * Возвращает null, если ссылку не удалось разрешить.
 */
export function resolveRef(repo: Repo, ref: string): string | null {
  // Разбираем суффиксы ~n и ^ (любое число, по очереди)
  const m = /^(.*?)((?:[~^]\d*)*)$/.exec(ref);
  if (!m) return null;
  const base = m[1];
  const suffix = m[2];

  let id: string | null = resolveBase(repo, base);
  if (!id) return null;

  // Применяем шаги вверх по первому родителю
  const steps = suffix.match(/[~^]\d*/g) ?? [];
  for (const step of steps) {
    const op = step[0];
    const n = step.length > 1 ? Number(step.slice(1)) : 1;
    const count = op === "^" && step.length === 1 ? 1 : n;
    for (let i = 0; i < count; i++) {
      const c: Commit | undefined = repo.commits[id!];
      if (!c || c.parents.length === 0) return null;
      // ^ без числа и ~ идут по первому родителю; ^2 — по второму
      id = step.startsWith("^") && step.length > 1 ? c.parents[n - 1] : c.parents[0];
      if (!id) return null;
    }
  }
  return id;
}

function resolveBase(repo: Repo, base: string): string | null {
  if (base === "HEAD" || base === "") return headCommitId(repo);
  if (base in repo.branches) return repo.branches[base] ?? null;
  if (base in repo.remoteTracking) return repo.remoteTracking[base];
  if (base in repo.commits) return base;
  return null;
}
