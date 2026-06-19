import type { Level } from "./types";
import type { Repo, Commit } from "../engine/model";
import {
  ancestors,
  headCommitId,
  currentBranch,
  isAncestor,
} from "../engine/model";
import { createEmptyRepo, createLinearRepo } from "../engine/repo";

// ── Помощники для построения стартовых состояний ─────────────────────────────

function c(id: string, parents: string[], message: string, file?: string, content?: string): Commit {
  return { id, parents, message, file, content };
}

/** main(C2) и feature(C3) разошлись от общего C1. HEAD на указанной ветке. */
function diverged(head: "main" | "feature"): Repo {
  const r = createLinearRepo(1); // C1 на main
  r.commits.C2 = c("C2", ["C1"], "правка в feature");
  r.branches.feature = "C2";
  r.commits.C3 = c("C3", ["C1"], "правка в main");
  r.branches.main = "C3";
  r.seq = 3;
  r.head = { type: "branch", name: head };
  return r;
}

/** Конфликтный сценарий: обе ветки меняют один файл. HEAD на main. */
function conflicting(): Repo {
  const r = createEmptyRepo();
  r.commits.C1 = c("C1", [], "базовый файл", "app.txt", "версия 0");
  r.branches.main = "C1";
  r.commits.C2 = c("C2", ["C1"], "правка в feature", "app.txt", "версия feature");
  r.branches.feature = "C2";
  r.commits.C3 = c("C3", ["C1"], "правка в main", "app.txt", "версия main");
  r.branches.main = "C3";
  r.seq = 3;
  r.head = { type: "branch", name: "main" };
  return r;
}

/** Добавить к репозиторию удалёнку origin как копию текущего состояния. */
function withOrigin(r: Repo): Repo {
  r.remotes.origin = {
    commits: structuredClone(r.commits),
    branches: Object.fromEntries(
      Object.entries(r.branches).filter(([, v]) => v !== null) as [string, string][]
    ),
  };
  for (const [b, id] of Object.entries(r.remotes.origin.branches)) {
    r.remoteTracking[`origin/${b}`] = id;
  }
  return r;
}

const W1 = "Мир 1 · Основы";
const W2 = "Мир 2 · Ветки";
const W3 = "Мир 3 · Откаты";
const W4 = "Мир 4 · Продвинутое";
const W5 = "Мир 5 · Удалёнка";

export const levels: Level[] = [
  // ── Мир 1: Основы ──────────────────────────────────────────────────────────
  {
    id: "1-1",
    world: W1,
    title: "Первый коммит",
    intro:
      "Коммит — это «сохранение» проекта. git хранит снимки, между которыми можно переключаться. Сейчас репозиторий пустой.",
    goal: "Сделай первый коммит с любым сообщением.",
    hint: 'Введи: git commit -m "первый коммит"',
    setup: () => createEmptyRepo(),
    validate: (r) => headCommitId(r) !== null,
    solution: ['git commit -m "первый коммит"'],
  },
  {
    id: "1-2",
    world: W1,
    title: "Серия коммитов",
    intro:
      "Каждый новый коммит ссылается на предыдущий — так выстраивается история. Получается цепочка снимков.",
    goal: "Сделай так, чтобы на ветке main было минимум 3 коммита.",
    hint: "Повтори git commit -m \"...\" несколько раз. Сейчас один коммит уже есть.",
    setup: () => createLinearRepo(1),
    validate: (r) => ancestors(r, r.branches.main ?? null).size >= 3,
    solution: ['git commit -m "второй"', 'git commit -m "третий"'],
  },
  {
    id: "1-3",
    world: W1,
    title: "Читаем состояние",
    intro:
      "Прежде чем что-то менять, полезно осмотреться. git status показывает, где ты, а git log — историю коммитов.",
    goal: "Введи команды git status и git log.",
    hint: "Две команды по очереди: git status, затем git log.",
    setup: () => createLinearRepo(3),
    validate: (_r, ctx) => ctx.commands.includes("status") && ctx.commands.includes("log"),
    solution: ["git status", "git log"],
  },
  {
    id: "1-4",
    world: W1,
    title: "Стейджинг: add → commit",
    intro:
      "Изменения сначала кладут «на сцену» командой git add, и только потом запечатывают коммитом. Это две коробки: индекс и снимок.",
    goal: "Используй git add, затем сделай коммит (станет минимум 2 коммита).",
    hint: 'Сначала git add ., потом git commit -m "правка".',
    setup: () => createLinearRepo(1),
    validate: (r, ctx) =>
      ctx.commands.includes("add") && ancestors(r, r.branches.main ?? null).size >= 2,
    solution: ["git add .", 'git commit -m "правка"'],
  },

  // ── Мир 2: Ветки ───────────────────────────────────────────────────────────
  {
    id: "2-1",
    world: W2,
    title: "Создай ветку",
    intro:
      "Ветка — параллельная вселенная, где можно экспериментировать, не трогая main. Создание ветки само по себе ничего не ломает.",
    goal: "Создай ветку с именем feature.",
    hint: "git branch feature",
    setup: () => createLinearRepo(2),
    validate: (r) => "feature" in r.branches,
    solution: ["git branch feature"],
  },
  {
    id: "2-2",
    world: W2,
    title: "Переключись на ветку",
    intro:
      "Создать ветку мало — нужно ещё в неё перейти. После переключения новые коммиты будут попадать именно в неё.",
    goal: "Переключись на ветку feature.",
    hint: "git switch feature (или git checkout feature)",
    setup: () => {
      const r = createLinearRepo(2);
      r.branches.feature = "C2";
      return r;
    },
    validate: (r) => currentBranch(r) === "feature",
    solution: ["git switch feature"],
  },
  {
    id: "2-3",
    world: W2,
    title: "Коммит в ветке",
    intro:
      "Ты на ветке feature. Сделай в ней коммит — main останется на месте, а feature уйдёт вперёд.",
    goal: "Сделай коммит в feature так, чтобы она опередила main.",
    hint: 'git commit -m "работа в ветке"',
    setup: () => {
      const r = createLinearRepo(2);
      r.branches.feature = "C2";
      r.head = { type: "branch", name: "feature" };
      return r;
    },
    validate: (r) =>
      r.branches.feature !== r.branches.main &&
      isAncestor(r, r.branches.main!, r.branches.feature!),
    solution: ['git commit -m "работа в ветке"'],
  },
  {
    id: "2-4",
    world: W2,
    title: "Fast-forward слияние",
    intro:
      "Когда main не уходила вперёд, слияние просто «догоняет» её до feature — это fast-forward, без отдельного merge-коммита.",
    goal: "Находясь на main, влей feature (произойдёт fast-forward).",
    hint: "Сначала ты на main. Введи git merge feature.",
    setup: () => {
      const r = createLinearRepo(2);
      r.commits.C3 = c("C3", ["C2"], "фича");
      r.branches.feature = "C3";
      r.seq = 3;
      return r; // HEAD на main (C2)
    },
    validate: (r) => r.branches.main === r.branches.feature && r.branches.main === "C3",
    solution: ["git merge feature"],
  },
  {
    id: "2-5",
    world: W2,
    title: "Слияние с расхождением",
    intro:
      "Если обе ветки ушли вперёд от общей точки, git создаёт merge-коммит с двумя родителями — он соединяет истории.",
    goal: "Находясь на main, слей feature. Должен появиться merge-коммит.",
    hint: "git merge feature — получится коммит с двумя родителями.",
    setup: () => diverged("main"),
    validate: (r) => {
      const h = headCommitId(r);
      return !!h && r.commits[h].parents.length === 2;
    },
    solution: ["git merge feature"],
  },

  // ── Мир 3: Откаты ──────────────────────────────────────────────────────────
  {
    id: "3-1",
    world: W3,
    title: "Detached HEAD",
    intro:
      "HEAD обычно указывает на ветку. Но можно «встать» прямо на старый коммит — это detached HEAD, удобно посмотреть прошлое.",
    goal: "Перейди на коммит на два шага назад (HEAD~2).",
    hint: "git checkout HEAD~2",
    setup: () => createLinearRepo(3),
    validate: (r) => r.head.type === "detached" && r.head.commitId === "C1",
    solution: ["git checkout HEAD~2"],
  },
  {
    id: "3-2",
    world: W3,
    title: "reset: откатить ветку",
    intro:
      "git reset двигает указатель ветки на другой коммит. Так можно «отмотать» историю назад.",
    goal: "Отмотай main на два коммита назад (к C1).",
    hint: "git reset --hard HEAD~2",
    setup: () => createLinearRepo(3),
    validate: (r) => r.branches.main === "C1",
    solution: ["git reset --hard HEAD~2"],
  },
  {
    id: "3-3",
    world: W3,
    title: "revert: безопасная отмена",
    intro:
      "В отличие от reset, git revert не стирает историю, а добавляет новый коммит, отменяющий изменения. Безопасно для общих веток.",
    goal: "Отмени последний коммит через revert (появится новый коммит).",
    hint: "git revert HEAD",
    setup: () => createLinearRepo(2),
    validate: (r) => {
      const h = headCommitId(r);
      return (
        ancestors(r, r.branches.main ?? null).size === 3 &&
        !!h &&
        r.commits[h].message.includes("Revert")
      );
    },
    solution: ["git revert HEAD"],
  },

  // ── Мир 4: Продвинутое ───────────────────────────────────────────────────────
  {
    id: "4-1",
    world: W4,
    title: "rebase: переписать историю",
    intro:
      "Вместо merge-коммита rebase переносит коммиты ветки поверх другой — история становится линейной и чистой. Ты на feature.",
    goal: "Перенеси feature поверх main с помощью rebase.",
    hint: "git rebase main",
    setup: () => diverged("feature"),
    validate: (r) => {
      const f = r.branches.feature!;
      return isAncestor(r, r.branches.main!, f) && f !== r.branches.main;
    },
    solution: ["git rebase main"],
  },
  {
    id: "4-2",
    world: W4,
    title: "cherry-pick: взять один коммит",
    intro:
      "cherry-pick копирует ровно один коммит из другой ветки на текущую — удобно, когда нужна только одна правка.",
    goal: "Перенеси коммит из feature на main через cherry-pick.",
    hint: "git cherry-pick feature",
    setup: () => {
      const r = createLinearRepo(1);
      r.commits.C2 = c("C2", ["C1"], "спец-фикс");
      r.branches.feature = "C2";
      r.seq = 2;
      return r; // HEAD на main (C1)
    },
    validate: (r) => {
      const h = headCommitId(r);
      return !!h && r.commits[h].message === "спец-фикс" && currentBranch(r) === "main";
    },
    solution: ["git cherry-pick feature"],
  },
  {
    id: "4-3",
    world: W4,
    title: "Конфликт слияния",
    intro:
      "Если обе ветки изменили один и тот же файл по-разному — git не может выбрать сам. Возникает конфликт: его разрешают вручную, затем git add и git commit.",
    goal: "Слей feature в main, разреши конфликт и заверши слияние.",
    hint: "git merge feature → git add app.txt → git commit",
    setup: () => conflicting(),
    validate: (r) => {
      const h = headCommitId(r);
      return !r.pendingMerge && !!h && r.commits[h].parents.length === 2;
    },
    solution: ["git merge feature", "git add app.txt", "git commit"],
  },

  // ── Мир 5: Удалёнка и команда ────────────────────────────────────────────────
  {
    id: "5-1",
    world: W5,
    title: "clone: забрать из облака",
    intro:
      "Удалёнка (origin) — копия проекта на сервере (GitLab/GitHub). git clone создаёт локальную копию из неё.",
    goal: "Склонируй репозиторий из origin.",
    hint: "git clone",
    setup: () => {
      const empty = createEmptyRepo();
      empty.remotes.origin = {
        commits: { C1: c("C1", [], "init"), C2: c("C2", ["C1"], "вторая правка") },
        branches: { main: "C2" },
      };
      return empty;
    },
    validate: (r) => r.branches.main !== null && Object.keys(r.commits).length >= 2,
    solution: ["git clone"],
  },
  {
    id: "5-2",
    world: W5,
    title: "push: отправить в облако",
    intro:
      "Сделанные локально коммиты надо отправить на сервер командой git push — тогда их увидит команда.",
    goal: "Сделай коммит и отправь его в origin (origin/main должен уйти вперёд).",
    hint: 'git commit -m "..." затем git push',
    setup: () => withOrigin(createLinearRepo(2)),
    validate: (r) =>
      r.remotes.origin.branches.main === headCommitId(r) &&
      r.remotes.origin.branches.main !== "C2",
    solution: ['git commit -m "новая правка"', "git push"],
  },
  {
    id: "5-3",
    world: W5,
    title: "pull: забрать свежее",
    intro:
      "Коллеги тоже пушат. git pull подтягивает их коммиты из origin к тебе. Здесь origin уже ушёл вперёд.",
    goal: "Догони origin командой git pull.",
    hint: "git pull",
    setup: () => {
      const r = withOrigin(createLinearRepo(2));
      // origin ушёл вперёд на C3
      r.remotes.origin.commits.C3 = c("C3", ["C2"], "правка коллеги");
      r.remotes.origin.branches.main = "C3";
      return r;
    },
    validate: (r) => headCommitId(r) === "C3" && headCommitId(r) === r.remotes.origin.branches.main,
    solution: ["git pull"],
  },
  {
    id: "5-4",
    world: W5,
    title: "Командный сценарий: ветка → push → MR",
    intro:
      "Реальный процесс в Intensa: под задачу заводят ветку, коммитят, пушат и открывают Merge Request на ревью. Пройдём первые три шага.",
    goal: "Создай ветку feature, сделай в ней коммит и запушь её в origin.",
    hint: 'git switch -c feature → git commit -m "..." → git push',
    setup: () => withOrigin(createLinearRepo(2)),
    validate: (r) => r.remotes.origin.branches.feature !== undefined,
    solution: ["git switch -c feature", 'git commit -m "новая фича"', "git push"],
  },
];

/** Уровни, сгруппированные по мирам (для карты). */
export function levelsByWorld(): { world: string; levels: Level[] }[] {
  const order: string[] = [];
  const map = new Map<string, Level[]>();
  for (const l of levels) {
    if (!map.has(l.world)) {
      map.set(l.world, []);
      order.push(l.world);
    }
    map.get(l.world)!.push(l);
  }
  return order.map((world) => ({ world, levels: map.get(world)! }));
}
