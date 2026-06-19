import type { Repo } from "../engine/model";

/** Контекст для проверки: какие команды игрок ввёл на этом уровне. */
export interface LevelContext {
  /** Имена введённых команд по порядку (например, ["commit", "log"]). */
  commands: string[];
}

export interface Level {
  id: string;
  world: string;
  title: string;
  /** Обучающее вступление (что это и зачем). */
  intro: string;
  /** Конкретная цель уровня. */
  goal: string;
  /** Подсказка по кнопке. */
  hint: string;
  /** Стартовое состояние репозитория. */
  setup: () => Repo;
  /** Проверка достижения цели. */
  validate: (repo: Repo, ctx: LevelContext) => boolean;
  /** Эталонное решение — для тестов и кнопки «показать решение». */
  solution: string[];
}
