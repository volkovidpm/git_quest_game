import { type CmdResult, type Repo, err } from "./model";
import { parse } from "./parser";
import { commit } from "./commands/commit";
import { branch } from "./commands/branch";
import { switchBranch } from "./commands/switch";
import { merge } from "./commands/merge";
import { add } from "./commands/add";
import { log, status } from "./commands/inspect";
import { reset } from "./commands/reset";
import { revert } from "./commands/revert";
import { rebase } from "./commands/rebase";
import { cherryPick } from "./commands/cherryPick";
import { clone, fetch, pull, push } from "./commands/remote";

/**
 * Главная точка входа: строка -> результат (новое состояние или ошибка).
 * Поддерживает как "git commit ...", так и "commit ...".
 */
export function execute(repo: Repo, input: string): CmdResult {
  const p = parse(input);
  if (!p) return err("");

  switch (p.cmd) {
    case "commit":
      return commit(repo, p);
    case "branch":
      return branch(repo, p);
    case "switch":
    case "checkout":
      return switchBranch(repo, p);
    case "merge":
      return merge(repo, p);
    case "add":
      return add(repo, p);
    case "log":
      return log(repo);
    case "status":
      return status(repo);
    case "reset":
      return reset(repo, p);
    case "revert":
      return revert(repo, p);
    case "rebase":
      return rebase(repo, p);
    case "cherry-pick":
      return cherryPick(repo, p);
    case "clone":
      return clone(repo);
    case "fetch":
      return fetch(repo);
    case "pull":
      return pull(repo);
    case "push":
      return push(repo, p);
    case "init":
      return { ok: true, repo, output: ["Инициализирован пустой репозиторий Git"] };
    default:
      return err(`git: '${p.cmd}' не является командой git. Загляни в подсказку уровня.`);
  }
}
