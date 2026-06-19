import {
  type CmdResult,
  type Repo,
  cloneRepo,
  setCurrent,
  ok,
  err,
} from "../model";
import type { ParsedCommand } from "../parser";
import { resolveRef } from "../refs";

/** git reset [--soft|--mixed|--hard] <ref> — двигает текущую ветку на коммит. */
export function reset(repo0: Repo, p: ParsedCommand): CmdResult {
  const repo = cloneRepo(repo0);
  const target = p.args[0] ?? "HEAD";
  const id = resolveRef(repo, target);
  if (!id) return err(`fatal: ambiguous argument '${target}': неизвестная ссылка`);
  setCurrent(repo, id);
  const mode = p.flags.hard ? "hard" : p.flags.soft ? "soft" : "mixed";
  return ok(repo, [`HEAD теперь на ${id} (--${mode})`]);
}
