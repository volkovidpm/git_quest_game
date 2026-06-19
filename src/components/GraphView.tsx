import { useMemo } from "react";
import type { Repo } from "../engine/model";
import { layout } from "../graph/layout";

const COL_W = 96;
const LANE_H = 84;
const R = 22;
const PAD = 48;

const LANE_COLORS = ["#58a6ff", "#3fb950", "#d29922", "#bc8cff", "#f778ba", "#39c5cf"];

export function GraphView({ repo }: { repo: Repo }) {
  const g = useMemo(() => layout(repo), [repo]);

  const pos = (col: number, lane: number) => ({
    x: PAD + col * COL_W,
    y: PAD + lane * LANE_H,
  });

  const width = PAD * 2 + Math.max(0, g.cols - 1) * COL_W + 180;
  const height = PAD * 2 + Math.max(0, g.lanes - 1) * LANE_H;

  const nodeById = Object.fromEntries(g.nodes.map((n) => [n.id, n]));

  // Сгруппировать метки веток по коммиту
  const labelsByCommit = new Map<string, typeof g.branchLabels>();
  for (const b of g.branchLabels) {
    const arr = labelsByCommit.get(b.commitId) ?? [];
    arr.push(b);
    labelsByCommit.set(b.commitId, arr);
  }

  return (
    <div className="graph-scroll">
      <svg width={width} height={height} className="graph-svg">
        {/* рёбра — рисуются «прочерчиванием» при появлении */}
        {g.edges.map((e) => {
          const from = nodeById[e.from];
          const to = nodeById[e.to];
          if (!from || !to) return null;
          const a = pos(from.col, from.lane);
          const b = pos(to.col, to.lane);
          const color = LANE_COLORS[to.lane % LANE_COLORS.length];
          return (
            <path
              key={`${e.from}-${e.to}`}
              className="edge"
              pathLength={1}
              d={`M ${a.x} ${a.y} C ${(a.x + b.x) / 2} ${a.y}, ${(a.x + b.x) / 2} ${b.y}, ${b.x} ${b.y}`}
              stroke={color}
              strokeWidth={3}
              fill="none"
              opacity={0.7}
            />
          );
        })}

        {/* узлы — внешняя группа плавно переезжает (transition на transform),
            внутренняя группа делает «pop» при первом появлении */}
        {g.nodes.map((n) => {
          const p = pos(n.col, n.lane);
          const color = LANE_COLORS[n.lane % LANE_COLORS.length];
          const isHead = n.id === g.headCommitId;
          const labels = labelsByCommit.get(n.id) ?? [];
          return (
            <g key={n.id} className="node-group" transform={`translate(${p.x}, ${p.y})`}>
              <g className="node-pop">
                {isHead && <circle r={R + 6} className="head-ring" />}
                <circle
                  r={R}
                  fill={n.isMerge ? "var(--bg-elev)" : color}
                  stroke={color}
                  strokeWidth={3}
                  className="node-dot"
                />
                <text y={5} textAnchor="middle" className="node-id">
                  {n.id}
                </text>
                <title>{n.message}</title>
                {labels.map((bl, i) => (
                  <g key={bl.name} transform={`translate(${R + 12}, ${-10 + i * 26})`} className="branch-label">
                    <rect
                      width={bl.name.length * 9 + (bl.isHead ? 56 : 18)}
                      height={22}
                      rx={5}
                      className={bl.isHead ? "branch-tag head" : "branch-tag"}
                    />
                    <text x={9} y={16} className="branch-text">
                      {bl.isHead ? `HEAD → ${bl.name}` : bl.name}
                    </text>
                  </g>
                ))}
              </g>
            </g>
          );
        })}

        {g.headCommitId === null && (
          <text x={PAD} y={PAD} className="empty-hint">
            Репозиторий пуст — сделай первый коммит.
          </text>
        )}
      </svg>
    </div>
  );
}
