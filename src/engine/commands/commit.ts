import {
  type CmdResult,
  type Repo,
  cloneRepo,
  headCommitId,
  currentBranch,
  commitOnto,
  setCurrent,
  ok,
  err,
} from "../model";
import type { ParsedCommand } from "../parser";

export function commit(repo0: Repo, p: ParsedCommand): CmdResult {
  const repo = cloneRepo(repo0);

  // Если идёт слияние с конфликтом — commit завершает его.
  if (repo.pendingMerge) {
    if (repo.pendingMerge.conflicts.length > 0) {
      return err(
        "error: Committing is not possible because you have unmerged files.\n" +
          "Сначала разрешите конфликты: git add <файл> для каждого файла."
      );
    }
    return finishMerge(repo);
  }

  const message =
    typeof p.flags.message === "string" && p.flags.message.length > 0
      ? p.flags.message
      : "коммит";

  const parentId = headCommitId(repo);
  const id = commitOnto(repo, parentId ? [parentId] : [], message);
  setCurrent(repo, id);

  const branch = currentBranch(repo) ?? "detached";
  return ok(repo, [`[${branch} ${id}] ${message}`]);
}

/** Завершить слияние после разрешения всех конфликтов. */
function finishMerge(repo: Repo): CmdResult {
  const pm = repo.pendingMerge!;
  const parentId = headCommitId(repo)!;
  const id = commitOnto(repo, [parentId, pm.otherParent], pm.message);
  setCurrent(repo, id);
  repo.pendingMerge = undefined;
  const branch = currentBranch(repo) ?? "detached";
  return ok(repo, [`[${branch} ${id}] ${pm.message}`]);
}
