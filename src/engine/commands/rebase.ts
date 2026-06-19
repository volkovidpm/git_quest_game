import {
  type CmdResult,
  type Repo,
  cloneRepo,
  headCommitId,
  setCurrent,
  commitOnto,
  ancestors,
  commitOrder,
  ok,
  err,
} from "../model";
import type { ParsedCommand } from "../parser";
import { resolveRef } from "../refs";

/**
 * git rebase <upstream>            — переносит коммиты текущей ветки на upstream.
 * git rebase --onto <new> <up>     — переносит коммиты (up..HEAD) на <new>.
 */
export function rebase(repo0: Repo, p: ParsedCommand): CmdResult {
  const repo = cloneRepo(repo0);

  const ontoRef = typeof p.flags.onto === "string" ? p.flags.onto : null;
  const upstreamRef = p.args[0];
  if (!upstreamRef) return err("fatal: укажите ветку: git rebase <ветка>");

  const upstreamId = resolveRef(repo, upstreamRef);
  if (!upstreamId) return err(`fatal: invalid upstream '${upstreamRef}'`);

  const newBaseId = ontoRef ? resolveRef(repo, ontoRef) : upstreamId;
  if (!newBaseId) return err(`fatal: invalid base '${ontoRef}'`);

  const curId = headCommitId(repo);
  if (!curId) return err("fatal: нет коммитов для rebase");

  // Коммиты текущей ветки, которых нет в upstream — их и переносим.
  const upstreamAnc = ancestors(repo, upstreamId);
  const toReplay = [...ancestors(repo, curId)]
    .filter((id) => !upstreamAnc.has(id))
    .sort((a, b) => commitOrder(a) - commitOrder(b));

  if (toReplay.length === 0) {
    return ok(repo, ["Current branch is up to date — переносить нечего."]);
  }

  let base = newBaseId;
  for (const oldId of toReplay) {
    const c = repo.commits[oldId];
    base = commitOnto(repo, [base], c.message, c.file, c.content);
  }
  setCurrent(repo, base);
  return ok(repo, [
    `Successfully rebased: перенесено коммитов ${toReplay.length} на ${newBaseId}`,
  ]);
}
