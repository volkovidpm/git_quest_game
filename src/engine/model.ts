// Упрощённая модель git — не настоящий git, а наглядное представление
// дерева коммитов, веток и указателя HEAD. На ней строится вся игра.

export interface Commit {
  id: string;
  /** Родители: 0 = корневой, 1 = обычный, 2 = merge-коммит. */
  parents: string[];
  message: string;
  /**
   * Упрощение для учебных целей: один коммит меняет один «файл».
   * Нужно для наглядного staging и обнаружения конфликтов при слиянии.
   */
  file?: string;
  content?: string;
}

/** Куда смотрит HEAD: на ветку (норма) или прямо на коммит (detached). */
export type Head =
  | { type: "branch"; name: string }
  | { type: "detached"; commitId: string };

/** Копия репозитория «в облаке» (origin). */
export interface Remote {
  commits: Record<string, Commit>;
  branches: Record<string, string>;
}

/** Незавершённое слияние/перенос с конфликтом. */
export interface PendingMerge {
  /** Откуда сливаем (ветка-источник или коммит). */
  from: string;
  /** Сообщение будущего merge-коммита. */
  message: string;
  /** Второй родитель будущего merge-коммита. */
  otherParent: string;
  /** Файлы в конфликте, которые ждут `git add`. */
  conflicts: string[];
  /** Уже разрешённые (через `git add`) файлы. */
  resolved: string[];
}

export interface Repo {
  commits: Record<string, Commit>;
  /** Ветка -> id коммита. Значение null = ветка ещё не родилась (нет коммитов). */
  branches: Record<string, string | null>;
  head: Head;
  /** Удалёнки: имя (обычно "origin") -> Remote. */
  remotes: Record<string, Remote>;
  /** Remote-tracking ссылки, напр. "origin/main" -> id коммита. */
  remoteTracking: Record<string, string>;
  /** Счётчик для генерации id коммитов (C1, C2, ...). */
  seq: number;
  /** Активное слияние с конфликтом, если есть. */
  pendingMerge?: PendingMerge;
}

/** Результат выполнения одной команды. */
export type CmdResult =
  | { ok: true; repo: Repo; output: string[] }
  | { ok: false; error: string };

export function ok(repo: Repo, output: string[] = []): CmdResult {
  return { ok: true, repo, output };
}

export function err(error: string): CmdResult {
  return { ok: false, error };
}

/** Глубокая копия репозитория — команды не мутируют вход. */
export function cloneRepo(repo: Repo): Repo {
  return structuredClone(repo);
}

/** id коммита, на который сейчас указывает HEAD (или null, если ветка не родилась). */
export function headCommitId(repo: Repo): string | null {
  if (repo.head.type === "detached") return repo.head.commitId;
  return repo.branches[repo.head.name] ?? null;
}

/** Имя текущей ветки или null, если HEAD detached. */
export function currentBranch(repo: Repo): string | null {
  return repo.head.type === "branch" ? repo.head.name : null;
}

/** Все предки коммита (включая его самого). */
export function ancestors(repo: Repo, id: string | null): Set<string> {
  const seen = new Set<string>();
  if (!id) return seen;
  const stack = [id];
  while (stack.length) {
    const cur = stack.pop()!;
    if (seen.has(cur)) continue;
    seen.add(cur);
    const c = repo.commits[cur];
    if (c) stack.push(...c.parents);
  }
  return seen;
}

/** Является ли `maybeAncestor` предком `id` (или тем же коммитом). */
export function isAncestor(repo: Repo, maybeAncestor: string, id: string): boolean {
  return ancestors(repo, id).has(maybeAncestor);
}

/** Ближайший общий предок двух коммитов (merge base), или null. */
export function mergeBase(repo: Repo, a: string, b: string): string | null {
  const ancA = ancestors(repo, a);
  // BFS от b, первый встреченный из ancA — ближайший общий предок
  const seen = new Set<string>();
  const queue = [b];
  while (queue.length) {
    const cur = queue.shift()!;
    if (seen.has(cur)) continue;
    seen.add(cur);
    if (ancA.has(cur)) return cur;
    const c = repo.commits[cur];
    if (c) queue.push(...c.parents);
  }
  return null;
}

/**
 * Состояние «файлов» на момент коммита: проходим по предкам и для каждого
 * файла берём самое позднее значение (по порядку коммитов). Упрощение: один
 * файл на коммит. Возвращает map файл -> содержимое.
 */
export function snapshotAt(repo: Repo, id: string | null): Record<string, string> {
  if (!id) return {};
  // Топологический порядок от корня к id: сортируем предков по номеру seq в id.
  const ancIds = [...ancestors(repo, id)];
  ancIds.sort((x, y) => commitOrder(x) - commitOrder(y));
  const files: Record<string, string> = {};
  for (const cid of ancIds) {
    const c = repo.commits[cid];
    if (c?.file) files[c.file] = c.content ?? "";
  }
  return files;
}

/** Числовой порядок коммита по его id вида "C12". Для нераспознанных — 0. */
export function commitOrder(id: string): number {
  const m = /^C(\d+)$/.exec(id);
  return m ? Number(m[1]) : 0;
}

/** Сгенерировать новый id коммита и вернуть его (seq инкрементит вызывающий). */
export function nextCommitId(repo: Repo): string {
  return `C${repo.seq + 1}`;
}

/** Передвинуть текущую позицию (ветку или detached HEAD) на коммит id. */
export function setCurrent(repo: Repo, id: string): void {
  if (repo.head.type === "branch") repo.branches[repo.head.name] = id;
  else repo.head.commitId = id;
}

/** Создать новый коммит-потомок текущего HEAD и передвинуть на него. Возвращает id. */
export function commitOnto(
  repo: Repo,
  parents: string[],
  message: string,
  file?: string,
  content?: string
): string {
  repo.seq += 1;
  const id = `C${repo.seq}`;
  repo.commits[id] = { id, parents, message, file, content };
  return id;
}
