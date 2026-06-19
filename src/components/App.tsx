import { useGame } from "../state/store";
import { GraphView } from "./GraphView";
import { Terminal } from "./Terminal";
import { LevelPanel } from "./LevelPanel";
import { WorldMap } from "./WorldMap";

export function App() {
  const repo = useGame((s) => s.repo);

  return (
    <div className="app">
      <WorldMap />
      <main className="stage">
        <section className="graph-area">
          <div className="graph-title">Дерево коммитов</div>
          <GraphView repo={repo} />
        </section>
        <section className="control-area">
          <LevelPanel />
          <Terminal />
        </section>
      </main>
    </div>
  );
}
