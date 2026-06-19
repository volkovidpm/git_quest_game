// Разбор строки команды в структуру { cmd, args, flags }.
// Поддерживает кавычки для сообщений: git commit -m "hello world".

export interface ParsedCommand {
  cmd: string;
  args: string[];
  flags: Record<string, string | boolean>;
}

/** Флаги, которые забирают следующий токен как значение. */
const VALUE_FLAGS: Record<string, string> = {
  "-m": "message",
  "--message": "message",
  "-c": "create", // git switch -c <name>
  "-b": "create", // git checkout -b <name>
  "-B": "createForce",
  "--onto": "onto",
};

/** Нормализация булевых флагов в короткие ключи. */
const BOOL_FLAG_ALIASES: Record<string, string> = {
  "--hard": "hard",
  "--soft": "soft",
  "--mixed": "mixed",
  "--no-ff": "noff",
  "--continue": "continue",
  "--abort": "abort",
  "--all": "all",
  "-a": "all",
  "-d": "delete",
  "-D": "deleteForce",
};

/** Разбить строку на токены с учётом одинарных и двойных кавычек. */
export function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let cur = "";
  let quote: '"' | "'" | null = null;
  let hasContent = false;
  for (const ch of input.trim()) {
    if (quote) {
      if (ch === quote) quote = null;
      else cur += ch;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      hasContent = true;
    } else if (/\s/.test(ch)) {
      if (cur || hasContent) tokens.push(cur);
      cur = "";
      hasContent = false;
    } else {
      cur += ch;
      hasContent = true;
    }
  }
  if (cur || hasContent) tokens.push(cur);
  return tokens;
}

/**
 * Разобрать ввод. Возвращает null, если строка пустая или это не git-команда.
 * Допускается ввод как с префиксом "git", так и без него.
 */
export function parse(input: string): ParsedCommand | null {
  let tokens = tokenize(input);
  if (tokens.length === 0) return null;
  if (tokens[0] === "git") tokens = tokens.slice(1);
  if (tokens.length === 0) return null;

  const cmd = tokens[0];
  const args: string[] = [];
  const flags: Record<string, string | boolean> = {};

  for (let i = 1; i < tokens.length; i++) {
    const t = tokens[i];
    if (t in VALUE_FLAGS) {
      const key = VALUE_FLAGS[t];
      flags[key] = tokens[i + 1] ?? "";
      i++;
    } else if (t in BOOL_FLAG_ALIASES) {
      flags[BOOL_FLAG_ALIASES[t]] = true;
    } else if (t.startsWith("--")) {
      flags[t.slice(2)] = true;
    } else if (t.startsWith("-") && t.length > 1) {
      flags[t.slice(1)] = true;
    } else {
      args.push(t);
    }
  }

  return { cmd, args, flags };
}
