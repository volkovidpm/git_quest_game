import {
  type CmdResult,
  type Repo,
  cloneRepo,
  headCommitId,
  setCurrent,
  commitOnto,
  isAncestor,
  mergeBase,
  snapshotAt,
  ok,
  err,
} from "../model";
import type { ParsedCommand } from "../parser";
import { resolveRef } from "../refs";

export function merge(repo0: Repo, p: ParsedCommand): CmdResult {
  const repo = cloneRepo(repo0);

  if (p.flags.abort) {
    if (!repo.pendingMerge) return err("fatal: There is no merge to abort.");
    repo.pendingMerge = undefined;
    return ok(repo, ["Слияние отменено, состояние восстановлено."]);
  }

  if (repo.pendingMerge) return err("error: слияние уже идёт, разрешите конфликты и сделайте commit");

  const targetName = p.args[0];
  if (!targetName) return err("fatal: укажите ветку для слияния, напр.: git merge feature");

  const targetId = resolveRef(repo, targetName);
  if (!targetId) return err(`merge: ${targetName} - не похоже на ветку или коммит`);

  const curId = headCommitId(repo);
  if (!curId) return err("fatal: нет коммитов для слияния");

  if (isAncestor(repo, targetId, curId)) {
    return ok(repo, ["Already up to date."]);
  }

  // Fast-forward: текущий коммит — предок целевого
  if (isAncestor(repo, curId, targetId) && !p.flags.noff) {
    setCurrent(repo, targetId);
    return ok(repo, [`Fast-forward к ${targetId}`]);
  }

  // Настоящее слияние: ищем конфликты по файлам
  const base = mergeBase(repo, curId, targetId);
  const conflicts = detectConflicts(repo, base, curId, targetId);
  const message = `Merge branch '${targetName}'`;

  if (conflicts.length > 0) {
    repo.pendingMerge = {
      from: targetName,
      message,
      otherParent: targetId,
      conflicts,
      resolved: [],
    };
    return ok(repo, [
      ...conflicts.map((f) => `CONFLICT (content): конфликт слияния в файле ${f}`),
      "Автослияние не удалось; разрешите конфликты и сделайте commit.",
      "Подсказка: git add <файл> для каждого конфликта, затем git commit.",
    ]);
  }

  const mergeId = commitOnto(repo, [curId, targetId], message);
  setCurrent(repo, mergeId);
  return ok(repo, [`Merge сделан коммитом ${mergeId}`]);
}

/** Файлы, изменённые с момента base, по конкретной ветке. */
function changedFiles(repo: Repo, baseId: string | null, sideId: string): Record<string, string> {
  const baseSnap = snapshotAt(repo, baseId);
  const sideSnap = snapshotAt(repo, sideId);
  const changed: Record<string, string> = {};
  for (const file of new Set([...Object.keys(baseSnap), ...Object.keys(sideSnap)])) {
    if (baseSnap[file] !== sideSnap[file]) changed[file] = sideSnap[file] ?? "";
  }
  return changed;
}

/** Файлы, изменённые по обе стороны к разному содержимому, — конфликт. */
function detectConflicts(repo: Repo, baseId: string | null, a: string, b: string): string[] {
  const ca = changedFiles(repo, baseId, a);
  const cb = changedFiles(repo, baseId, b);
  const conflicts: string[] = [];
  for (const file of Object.keys(ca)) {
    if (file in cb && ca[file] !== cb[file]) conflicts.push(file);
  }
  return conflicts.sort();
}
