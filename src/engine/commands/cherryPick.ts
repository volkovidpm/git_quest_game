import {
  type CmdResult,
  type Repo,
  cloneRepo,
  headCommitId,
  setCurrent,
  commitOnto,
  ok,
  err,
} from "../model";
import type { ParsedCommand } from "../parser";
import { resolveRef } from "../refs";

/** git cherry-pick <ref> — копирует один коммит как потомка HEAD. */
export function cherryPick(repo0: Repo, p: ParsedCommand): CmdResult {
  const repo = cloneRepo(repo0);
  const ref = p.args[0];
  if (!ref) return err("fatal: укажите коммит: git cherry-pick <ref>");
  const id = resolveRef(repo, ref);
  if (!id || !repo.commits[id]) return err(`fatal: bad revision '${ref}'`);

  const head = headCommitId(repo);
  if (!head) return err("fatal: нет коммитов");

  const src = repo.commits[id];
  const newId = commitOnto(repo, [head], src.message, src.file, src.content);
  setCurrent(repo, newId);
  return ok(repo, [`[${newId}] ${src.message}`]);
}
