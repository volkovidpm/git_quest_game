import {
  type CmdResult,
  type Repo,
  cloneRepo,
  headCommitId,
  commitOnto,
  setCurrent,
  snapshotAt,
  ok,
  err,
} from "../model";
import type { ParsedCommand } from "../parser";
import { resolveRef } from "../refs";

/** git revert <ref> — создаёт новый коммит, отменяющий указанный. */
export function revert(repo0: Repo, p: ParsedCommand): CmdResult {
  const repo = cloneRepo(repo0);
  const ref = p.args[0];
  if (!ref) return err("fatal: укажите коммит для отмены: git revert <ref>");
  const id = resolveRef(repo, ref);
  if (!id || !repo.commits[id]) return err(`fatal: bad revision '${ref}'`);

  const target = repo.commits[id];
  const head = headCommitId(repo);
  if (!head) return err("fatal: нет коммитов");

  // Откатываем «файл» к состоянию до целевого коммита.
  let file: string | undefined;
  let content: string | undefined;
  if (target.file) {
    file = target.file;
    const before = snapshotAt(repo, target.parents[0] ?? null);
    content = before[target.file] ?? "";
  }

  const message = `Revert "${target.message}"`;
  const newId = commitOnto(repo, [head], message, file, content);
  setCurrent(repo, newId);
  return ok(repo, [`[${newId}] ${message}`]);
}
