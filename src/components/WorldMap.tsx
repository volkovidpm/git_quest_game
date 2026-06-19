import { useGame } from "../state/store";
import { levels, levelsByWorld } from "../levels/levels";

export function WorldMap() {
  const levelIndex = useGame((s) => s.levelIndex);
  const completed = useGame((s) => s.completed);
  const goToLevel = useGame((s) => s.goToLevel);

  const groups = levelsByWorld();
  const indexOf = (id: string) => levels.findIndex((l) => l.id === id);

  const total = levels.length;
  const doneCount = levels.filter((l) => completed.has(l.id)).length;

  return (
    <aside className="world-map">
      <div className="brand">
        <span className="logo">⎇</span>
        <div>
          <h1>GitQuest</h1>
          <p className="tagline">учим git играя</p>
        </div>
      </div>

      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${(doneCount / total) * 100}%` }} />
      </div>
      <p className="progress-text">
        Пройдено {doneCount} из {total}
      </p>

      {groups.map((grp) => (
        <div key={grp.world} className="world-group">
          <h3>{grp.world}</h3>
          <ul>
            {grp.levels.map((l) => {
              const idx = indexOf(l.id);
              const isDone = completed.has(l.id);
              const isCurrent = idx === levelIndex;
              return (
                <li key={l.id}>
                  <button
                    className={`level-link${isCurrent ? " current" : ""}${isDone ? " done" : ""}`}
                    onClick={() => goToLevel(idx)}
                  >
                    <span className="check">{isDone ? "✓" : "○"}</span>
                    <span className="lvl-id">{l.id}</span>
                    <span className="lvl-title">{l.title}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </aside>
  );
}
