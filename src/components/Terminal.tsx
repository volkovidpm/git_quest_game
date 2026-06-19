import { useEffect, useRef, useState } from "react";
import { useGame } from "../state/store";

export function Terminal() {
  const output = useGame((s) => s.output);
  const runCommand = useGame((s) => s.runCommand);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [histPos, setHistPos] = useState(-1);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [output]);

  const submit = () => {
    const cmd = input.trim();
    if (!cmd) return;
    runCommand(cmd);
    setHistory((h) => [...h, cmd]);
    setHistPos(-1);
    setInput("");
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") submit();
    else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!history.length) return;
      const np = histPos < 0 ? history.length - 1 : Math.max(0, histPos - 1);
      setHistPos(np);
      setInput(history[np]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (histPos < 0) return;
      const np = histPos + 1;
      if (np >= history.length) {
        setHistPos(-1);
        setInput("");
      } else {
        setHistPos(np);
        setInput(history[np]);
      }
    }
  };

  return (
    <div className="terminal" onClick={() => inputRef.current?.focus()}>
      <div className="terminal-body">
        {output.map((line, i) => (
          <div key={i} className={`line line-${line.kind}`}>
            {line.text}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="terminal-input">
        <span className="prompt">$</span>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="введите git-команду и нажмите Enter…"
          autoFocus
          spellCheck={false}
          autoComplete="off"
        />
      </div>
    </div>
  );
}
