import { type CmdResult, type Repo, cloneRepo, ok, err } from "../model";
import type { ParsedCommand } from "../parser";

/**
 * В игре `git add` решает две задачи:
 *  1) во время конфликта слияния помечает файл разрешённым;
 *  2) вне слияния — наглядно «добавляет в индекс» (концепция staging).
 */
export function add(repo0: Repo, p: ParsedCommand): CmdResult {
  const repo = cloneRepo(repo0);
  const arg = p.args[0];
  if (!arg) return err("Nothing specified, nothing added. Укажите файл: git add <файл> или git add .");

  if (repo.pendingMerge) {
    const pm = repo.pendingMerge;
    const all = arg === "." || arg === "*" || p.flags.all;
    const toResolve = all ? [...pm.conflicts] : pm.conflicts.filter((f) => f === arg);
    if (toResolve.length === 0)
      return err(`fatal: pathspec '${arg}' did not match any unmerged file`);
    pm.conflicts = pm.conflicts.filter((f) => !toResolve.includes(f));
    pm.resolved.push(...toResolve);
    const left = pm.conflicts.length;
    return ok(repo, [
      `Разрешено: ${toResolve.join(", ")}`,
      left > 0
        ? `Осталось конфликтов: ${left}`
        : "Все конфликты разрешены — теперь git commit, чтобы завершить слияние.",
    ]);
  }

  return ok(repo, [`Изменения добавлены в индекс (staging): ${arg}`]);
}
