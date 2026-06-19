import {
  type CmdResult,
  type Repo,
  ancestors,
  commitOrder,
  currentBranch,
  headCommitId,
  ok,
} from "../model";

/** git log — список коммитов от HEAD к корню. */
export function log(repo: Repo): CmdResult {
  const head = headCommitId(repo);
  if (!head) return ok(repo, ["fatal: ветка пока без коммитов"]);
  const ids = [...ancestors(repo, head)].sort((a, b) => commitOrder(b) - commitOrder(a));
  const cur = currentBranch(repo);
  const labelAt: Record<string, string[]> = {};
  for (const [name, id] of Object.entries(repo.branches)) {
    if (id) (labelAt[id] ??= []).push(name);
  }
  const lines = ids.map((id) => {
    const c = repo.commits[id];
    const labels: string[] = [];
    if (id === head) labels.push(cur ? `HEAD -> ${cur}` : "HEAD");
    for (const b of labelAt[id] ?? []) if (b !== cur) labels.push(b);
    const deco = labels.length ? ` (${labels.join(", ")})` : "";
    return `${id}${deco} ${c.message}`;
  });
  return ok(repo, lines);
}

/** git status — текущая ветка и состояние слияния. */
export function status(repo: Repo): CmdResult {
  const lines: string[] = [];
  const cur = currentBranch(repo);
  lines.push(cur ? `На ветке ${cur}` : "HEAD отделён (detached)");
  if (repo.pendingMerge) {
    const pm = repo.pendingMerge;
    lines.push("Вы в процессе слияния.");
    if (pm.conflicts.length)
      lines.push(`Не разрешённые пути: ${pm.conflicts.join(", ")}`);
    else lines.push("Все конфликты разрешены — осталось git commit.");
  } else if (!headCommitId(repo)) {
    lines.push("Коммитов пока нет");
  } else {
    lines.push("нечего коммитить, рабочее дерево чисто");
  }
  return ok(repo, lines);
}
