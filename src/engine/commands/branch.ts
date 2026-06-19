import {
  type CmdResult,
  type Repo,
  cloneRepo,
  headCommitId,
  currentBranch,
  ok,
  err,
} from "../model";
import type { ParsedCommand } from "../parser";

export function branch(repo0: Repo, p: ParsedCommand): CmdResult {
  const repo = cloneRepo(repo0);
  const name = p.args[0];

  // Удаление ветки
  if (p.flags.delete || p.flags.deleteForce) {
    if (!name) return err("error: branch name required");
    if (!(name in repo.branches)) return err(`error: branch '${name}' not found.`);
    if (currentBranch(repo) === name)
      return err(`error: Cannot delete branch '${name}' checked out.`);
    delete repo.branches[name];
    return ok(repo, [`Deleted branch ${name}.`]);
  }

  // Без аргумента — список веток
  if (!name) {
    const cur = currentBranch(repo);
    const lines = Object.keys(repo.branches)
      .filter((b) => repo.branches[b] !== null)
      .sort()
      .map((b) => (b === cur ? `* ${b}` : `  ${b}`));
    return ok(repo, lines.length ? lines : ["(нет веток с коммитами)"]);
  }

  // Создание ветки
  if (name in repo.branches) return err(`fatal: a branch named '${name}' already exists`);
  const cur = headCommitId(repo);
  if (!cur)
    return err("fatal: not a valid object name: 'HEAD' (сначала сделайте коммит)");
  repo.branches[name] = cur;
  return ok(repo, []);
}
