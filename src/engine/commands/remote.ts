import {
  type CmdResult,
  type Repo,
  type Commit,
  cloneRepo,
  headCommitId,
  currentBranch,
  setCurrent,
  commitOnto,
  ancestors,
  isAncestor,
  ok,
  err,
} from "../model";
import type { ParsedCommand } from "../parser";

const ORIGIN = "origin";

/** git clone — копирует «облако» (origin) в локальный репозиторий. */
export function clone(repo0: Repo): CmdResult {
  const repo = cloneRepo(repo0);
  const origin = repo.remotes[ORIGIN];
  if (!origin) return err("fatal: нет удалёнки origin для клонирования");

  repo.commits = structuredClone(origin.commits);
  repo.branches = {};
  for (const [b, id] of Object.entries(origin.branches)) {
    repo.branches[b] = id;
    repo.remoteTracking[`${ORIGIN}/${b}`] = id;
  }
  const main = origin.branches.main ? "main" : Object.keys(origin.branches)[0];
  repo.head = { type: "branch", name: main };
  repo.seq = maxSeq(repo.commits);
  return ok(repo, [`Cloning into '.'... готово. Активная ветка: ${main}`]);
}

/** git fetch — подтягивает коммиты origin и двигает origin/* ссылки. */
export function fetch(repo0: Repo): CmdResult {
  const repo = cloneRepo(repo0);
  const origin = repo.remotes[ORIGIN];
  if (!origin) return err("fatal: нет удалёнки origin");
  copyCommits(origin.commits, repo.commits);
  for (const [b, id] of Object.entries(origin.branches)) {
    repo.remoteTracking[`${ORIGIN}/${b}`] = id;
  }
  repo.seq = Math.max(repo.seq, maxSeq(repo.commits));
  return ok(repo, ["Получены изменения из origin (обновлены ссылки origin/*)"]);
}

/** git pull — fetch + слияние origin/<текущая> в текущую ветку. */
export function pull(repo0: Repo): CmdResult {
  const fetched = fetch(repo0);
  if (!fetched.ok) return fetched;
  const repo = fetched.repo;
  const cur = currentBranch(repo);
  if (!cur) return err("fatal: pull в detached HEAD не поддерживается");
  const remoteId = repo.remoteTracking[`${ORIGIN}/${cur}`];
  const curId = headCommitId(repo);
  if (!remoteId) return ok(repo, ["Уже актуально (нет origin-ветки)"]);
  if (!curId || isAncestor(repo, remoteId, curId)) return ok(repo, ["Already up to date."]);

  if (curId && isAncestor(repo, curId, remoteId)) {
    setCurrent(repo, remoteId);
    return ok(repo, [`Fast-forward к origin/${cur} (${remoteId})`]);
  }
  // расхождение -> merge-коммит
  const mergeId = commitOnto(repo, [curId!, remoteId], `Merge origin/${cur}`);
  setCurrent(repo, mergeId);
  return ok(repo, [`Слияние с origin/${cur} коммитом ${mergeId}`]);
}

/** git push — отправляет коммиты текущей ветки в origin. */
export function push(repo0: Repo, p: ParsedCommand): CmdResult {
  const repo = cloneRepo(repo0);
  const origin = repo.remotes[ORIGIN];
  if (!origin) return err("fatal: нет удалёнки origin");
  const cur = currentBranch(repo);
  if (!cur) return err("fatal: push в detached HEAD не поддерживается");
  const curId = headCommitId(repo);
  if (!curId) return err("fatal: нечего отправлять");

  const remoteId = origin.branches[cur];
  const force = !!p.flags.force || !!p.flags.f;
  // Отклоняем не-fast-forward пуш без --force
  if (remoteId && !isAncestor(repo, remoteId, curId) && !force) {
    return err(
      `! [rejected] ${cur} -> ${cur} (non-fast-forward)\n` +
        "Сначала git pull, затем повторите push."
    );
  }

  // Копируем все коммиты, достижимые из curId, в origin
  const reachable = ancestors(repo, curId);
  for (const id of reachable) {
    if (!origin.commits[id]) origin.commits[id] = structuredClone(repo.commits[id]);
  }
  origin.branches[cur] = curId;
  repo.remoteTracking[`${ORIGIN}/${cur}`] = curId;
  return ok(repo, [`origin/${cur} обновлён -> ${curId}`]);
}

function copyCommits(from: Record<string, Commit>, to: Record<string, Commit>): void {
  for (const [id, c] of Object.entries(from)) {
    if (!to[id]) to[id] = structuredClone(c);
  }
}

function maxSeq(commits: Record<string, Commit>): number {
  let max = 0;
  for (const id of Object.keys(commits)) {
    const m = /^C(\d+)$/.exec(id);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return max;
}
