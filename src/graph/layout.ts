import { type Repo, commitOrder } from "../engine/model";

export interface GraphNode {
  id: string;
  col: number; // глубина от корня (горизонталь)
  lane: number; // дорожка ветки (вертикаль)
  message: string;
  isMerge: boolean;
}

export interface GraphEdge {
  from: string; // родитель
  to: string; // потомок
}

export interface BranchLabel {
  name: string;
  commitId: string;
  isHead: boolean;
}

export interface GraphLayout {
  nodes: GraphNode[];
  edges: GraphEdge[];
  cols: number;
  lanes: number;
  branchLabels: BranchLabel[];
  headCommitId: string | null;
}

/**
 * Раскладка дерева коммитов: col = глубина от корня, lane = дорожка ветки.
 * main всегда на дорожке 0, остальные ветки получают соседние дорожки.
 */
export function layout(repo: Repo): GraphLayout {
  const ids = Object.keys(repo.commits).sort((a, b) => commitOrder(a) - commitOrder(b));

  // Глубина = длиннейший путь от корня
  const depth: Record<string, number> = {};
  for (const id of ids) {
    const c = repo.commits[id];
    depth[id] = c.parents.length
      ? Math.max(...c.parents.map((p) => (depth[p] ?? 0) + 1))
      : 0;
  }

  // Дорожки: main первой, затем остальные ветки по алфавиту
  const branchOrder = Object.keys(repo.branches)
    .filter((b) => repo.branches[b] !== null)
    .sort((a, b) => (a === "main" ? -1 : b === "main" ? 1 : a.localeCompare(b)));

  const lane: Record<string, number> = {};
  let nextLane = 0;
  for (const b of branchOrder) {
    const myLane = b === "main" ? 0 : ++nextLane;
    let id: string | null = repo.branches[b];
    while (id && lane[id] === undefined) {
      lane[id] = myLane;
      const parent: string | undefined = repo.commits[id]?.parents[0];
      id = parent ?? null;
    }
  }
  // Коммиты, не покрытые ветками (например, после reset) — на свободные дорожки
  for (const id of ids) {
    if (lane[id] === undefined) lane[id] = ++nextLane;
  }

  const nodes: GraphNode[] = ids.map((id) => ({
    id,
    col: depth[id],
    lane: lane[id],
    message: repo.commits[id].message,
    isMerge: repo.commits[id].parents.length > 1,
  }));

  const edges: GraphEdge[] = [];
  for (const id of ids) {
    for (const parent of repo.commits[id].parents) {
      if (repo.commits[parent]) edges.push({ from: parent, to: id });
    }
  }

  const headId =
    repo.head.type === "detached" ? repo.head.commitId : repo.branches[repo.head.name] ?? null;

  const branchLabels: BranchLabel[] = branchOrder.map((name) => ({
    name,
    commitId: repo.branches[name]!,
    isHead: repo.head.type === "branch" && repo.head.name === name,
  }));

  const cols = Math.max(0, ...nodes.map((n) => n.col)) + 1;
  const lanes = Math.max(0, ...nodes.map((n) => n.lane)) + 1;

  return { nodes, edges, cols, lanes, branchLabels, headCommitId: headId };
}
