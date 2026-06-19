const KEY = "gitquest:progress:v1";

/** Загрузить множество id пройденных уровней из localStorage. */
export function loadProgress(): Set<string> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

/** Сохранить множество пройденных уровней. */
export function saveProgress(done: Set<string>): void {
  try {
    localStorage.setItem(KEY, JSON.stringify([...done]));
  } catch {
    // localStorage недоступен — молча игнорируем
  }
}
