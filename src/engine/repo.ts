import type { Commit, Repo } from "./model";

/** Пустой репозиторий: ветка main ещё не родилась (нет коммитов). */
export function createEmptyRepo(): Repo {
  return {
    commits: {},
    branches: { main: null },
    head: { type: "branch", name: "main" },
    remotes: {},
    remoteTracking: {},
    seq: 0,
  };
}

/**
 * Удобный билдер начального состояния для уровней: линейная цепочка коммитов
 * на ветке main. `count` коммитов с авто-сообщениями.
 */
export function createLinearRepo(count: number): Repo {
  const repo = createEmptyRepo();
  let prev: string | null = null;
  for (let i = 1; i <= count; i++) {
    const id = `C${i}`;
    const commit: Commit = {
      id,
      parents: prev ? [prev] : [],
      message: `коммит ${i}`,
    };
    repo.commits[id] = commit;
    prev = id;
  }
  repo.seq = count;
  repo.branches.main = prev;
  return repo;
}

/** Зарегистрировать коммит в репозитории (мутирует переданный repo-черновик). */
export function addCommit(repo: Repo, commit: Commit): void {
  repo.commits[commit.id] = commit;
}
