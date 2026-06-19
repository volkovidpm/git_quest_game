import {
  type CmdResult,
  type Repo,
  cloneRepo,
  headCommitId,
  ok,
  err,
} from "../model";
import type { ParsedCommand } from "../parser";
import { resolveRef } from "../refs";

/** Общая логика для `git switch` и `git checkout`. */
export function switchBranch(repo0: Repo, p: ParsedCommand): CmdResult {
  const repo = cloneRepo(repo0);

  // Создание новой ветки: switch -c / checkout -b
  const createName =
    typeof p.flags.create === "string"
      ? p.flags.create
      : typeof p.flags.createForce === "string"
        ? p.flags.createForce
        : null;

  if (createName) {
    if (createName in repo.branches && !p.flags.createForce)
      return err(`fatal: a branch named '${createName}' already exists`);
    const cur = headCommitId(repo);
    if (!cur) return err("fatal: сначала сделайте хотя бы один коммит");
    repo.branches[createName] = cur;
    repo.head = { type: "branch", name: createName };
    return ok(repo, [`Switched to a new branch '${createName}'`]);
  }

  const target = p.args[0];
  if (!target) return err("fatal: missing branch or commit argument");

  // Переключение на существующую ветку
  if (target in repo.branches && repo.branches[target] !== null) {
    repo.head = { type: "branch", name: target };
    return ok(repo, [`Switched to branch '${target}'`]);
  }

  // Иначе пробуем как коммит/ссылку -> detached HEAD
  const commitId = resolveRef(repo, target);
  if (commitId && repo.commits[commitId]) {
    repo.head = { type: "detached", commitId };
    return ok(repo, [
      `Note: переходим в detached HEAD на ${commitId}`,
      "HEAD теперь не на ветке — новые коммиты могут потеряться.",
    ]);
  }

  return err(`error: pathspec '${target}' did not match any branch or commit`);
}
