import { useGame } from "../state/store";
import { levels } from "../levels/levels";

export function LevelPanel() {
  const levelIndex = useGame((s) => s.levelIndex);
  const solved = useGame((s) => s.solved);
  const hintShown = useGame((s) => s.hintShown);
  const toggleHint = useGame((s) => s.toggleHint);
  const restartLevel = useGame((s) => s.restartLevel);
  const nextLevel = useGame((s) => s.nextLevel);
  const runCommand = useGame((s) => s.runCommand);

  const level = levels[levelIndex];
  const isLast = levelIndex === levels.length - 1;

  return (
    <div className="level-panel">
      <div className="level-head">
        <span className="level-world">{level.world}</span>
        <h2>
          {level.id} · {level.title}
        </h2>
      </div>
      <p className="level-goal">🎯 {level.goal}</p>

      <div className="level-actions">
        <button onClick={toggleHint}>{hintShown ? "Скрыть подсказку" : "💡 Подсказка"}</button>
        <button onClick={() => runCommand("solution")}>Решение</button>
        <button onClick={restartLevel}>↺ Заново</button>
      </div>

      {hintShown && <div className="hint">{level.hint}</div>}

      {solved && (
        <button className="next-btn" onClick={nextLevel} disabled={isLast}>
          {isLast ? "🏁 Курс пройден!" : "Следующий уровень →"}
        </button>
      )}
    </div>
  );
}
