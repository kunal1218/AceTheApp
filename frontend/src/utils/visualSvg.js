const WIDTH = 800;
const HEIGHT = 450;

const escapeText = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const svgWrap = (content) =>
  `<svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">${content}</svg>`;

const rect = (x, y, w, h) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="white" stroke="black" stroke-width="2"/>`;

const line = (x1, y1, x2, y2) =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="black" stroke-width="2"/>`;

const arrowHead = (x, y, dx, dy) => {
  const size = 10;
  const nx = -dy;
  const ny = dx;
  const x1 = x - dx * size + nx * size * 0.6;
  const y1 = y - dy * size + ny * size * 0.6;
  const x2 = x - dx * size - nx * size * 0.6;
  const y2 = y - dy * size - ny * size * 0.6;
  return `<polygon points="${x},${y} ${x1},${y1} ${x2},${y2}" fill="black"/>`;
};

const text = (x, y, value, size = 18, anchor = "start") =>
  `<text x="${x}" y="${y}" font-size="${size}" text-anchor="${anchor}" fill="black" font-family="Arial">${escapeText(
    value
  )}</text>`;

const renderMemoryDiagram = (visual) => {
  const content = visual.content || {};
  const variables = Array.isArray(content.variables) ? content.variables : [];
  const arrays = variables.filter((variable) => variable.kind === "array");
  const pointers = variables.filter((variable) => variable.kind === "pointer");
  const parts = [];

  arrays.forEach((arrayVar, index) => {
    const cells = Array.isArray(arrayVar.cells) ? arrayVar.cells : [];
    const cellWidth = 70;
    const cellHeight = 50;
    const startX = 60;
    const startY = 80 + index * 140;
    parts.push(text(startX, startY - 16, `${arrayVar.name || "array"}`));
    cells.forEach((cell, cellIndex) => {
      const x = startX + cellIndex * (cellWidth + 6);
      const y = startY;
      parts.push(rect(x, y, cellWidth, cellHeight));
      if (cell.value !== undefined) {
        parts.push(text(x + cellWidth / 2, y + 30, String(cell.value), 18, "middle"));
      }
      parts.push(text(x + cellWidth / 2, y + cellHeight + 20, `idx ${cell.index}`, 14, "middle"));
      if (cell.address) {
        parts.push(text(x + cellWidth / 2, y - 8, String(cell.address), 12, "middle"));
      }
    });
  });

  if (arrays.length) {
    const baseY = 80;
    const pointerX = 560;
    const pointerY = baseY;
    pointers.forEach((pointer, idx) => {
      const y = pointerY + idx * 90;
      parts.push(rect(pointerX, y, 160, 50));
      parts.push(text(pointerX + 80, y + 30, pointer.name || "ptr", 18, "middle"));
      const targetLabel = pointer.points_to || "";
      if (targetLabel) {
        parts.push(text(pointerX + 80, y + 70, targetLabel, 12, "middle"));
      }
      const arrowStartX = pointerX;
      const arrowStartY = y + 25;
      const arrowEndX = 200;
      const arrowEndY = y + 25;
      parts.push(line(arrowStartX, arrowStartY, arrowEndX, arrowEndY));
      parts.push(arrowHead(arrowEndX, arrowEndY, 1, 0));
    });
  }

  return svgWrap(parts.join(""));
};

const renderTable = (visual) => {
  const content = visual.content || {};
  const headers = Array.isArray(content.headers) ? content.headers : [];
  const rows = Array.isArray(content.rows) ? content.rows : [];
  const cols = headers.length || (rows[0]?.length || 1);
  const cellWidth = 600 / cols;
  const startX = 100;
  const startY = 80;
  const parts = [];

  for (let c = 0; c < cols; c += 1) {
    const x = startX + c * cellWidth;
    parts.push(rect(x, startY, cellWidth, 40));
    parts.push(text(x + cellWidth / 2, startY + 26, headers[c] || "", 16, "middle"));
  }
  rows.forEach((row, rowIndex) => {
    const y = startY + 40 + rowIndex * 36;
    for (let c = 0; c < cols; c += 1) {
      const x = startX + c * cellWidth;
      parts.push(rect(x, y, cellWidth, 36));
      const value = Array.isArray(row) ? row[c] : "";
      parts.push(text(x + cellWidth / 2, y + 24, value || "", 15, "middle"));
    }
  });

  return svgWrap(parts.join(""));
};

const renderFlowchart = (visual) => {
  const content = visual.content || {};
  const nodes = Array.isArray(content.nodes) ? content.nodes : [];
  const edges = Array.isArray(content.edges) ? content.edges : [];
  const parts = [];
  const startX = 140;
  const startY = 80;
  const boxWidth = 520;
  const boxHeight = 50;
  const gap = 30;

  nodes.forEach((node, index) => {
    const y = startY + index * (boxHeight + gap);
    parts.push(rect(startX, y, boxWidth, boxHeight));
    parts.push(text(startX + boxWidth / 2, y + 30, node.text || node.id, 16, "middle"));
  });

  edges.forEach((edge) => {
    const fromIndex = nodes.findIndex((node) => node.id === edge.from);
    const toIndex = nodes.findIndex((node) => node.id === edge.to);
    if (fromIndex === -1 || toIndex === -1) return;
    const x = startX + boxWidth / 2;
    const y1 = startY + fromIndex * (boxHeight + gap) + boxHeight;
    const y2 = startY + toIndex * (boxHeight + gap);
    parts.push(line(x, y1, x, y2));
    parts.push(arrowHead(x, y2, 0, 1));
    if (edge.label) {
      parts.push(text(x + 10, (y1 + y2) / 2, edge.label, 14));
    }
  });

  return svgWrap(parts.join(""));
};

const renderTimeline = (visual) => {
  const content = visual.content || {};
  const events = Array.isArray(content.events) ? content.events : [];
  const parts = [];
  const startX = 100;
  const endX = 700;
  const midY = 220;
  parts.push(line(startX, midY, endX, midY));
  const step = events.length > 1 ? (endX - startX) / (events.length - 1) : 0;
  events.forEach((event, index) => {
    const x = startX + index * step;
    parts.push(`<circle cx="${x}" cy="${midY}" r="8" fill="white" stroke="black" stroke-width="2"/>`);
    parts.push(text(x, midY - 18, event.t || `Step ${index + 1}`, 14, "middle"));
    parts.push(text(x, midY + 30, event.text || "", 14, "middle"));
  });
  return svgWrap(parts.join(""));
};

const renderGraph = (visual) => {
  const content = visual.content || {};
  const nodes = Array.isArray(content.nodes) ? content.nodes : [];
  const edges = Array.isArray(content.edges) ? content.edges : [];
  const parts = [];
  const centerX = 400;
  const centerY = 220;
  const radius = 140;
  nodes.forEach((node, index) => {
    const angle = (Math.PI * 2 * index) / Math.max(nodes.length, 1);
    node._x = centerX + Math.cos(angle) * radius;
    node._y = centerY + Math.sin(angle) * radius;
    parts.push(`<circle cx="${node._x}" cy="${node._y}" r="26" fill="white" stroke="black" stroke-width="2"/>`);
    parts.push(text(node._x, node._y + 6, node.label || node.id, 14, "middle"));
  });
  edges.forEach((edge) => {
    const from = nodes.find((node) => node.id === edge.from);
    const to = nodes.find((node) => node.id === edge.to);
    if (!from || !to) return;
    parts.push(line(from._x, from._y, to._x, to._y));
    if (edge.label) {
      parts.push(text((from._x + to._x) / 2, (from._y + to._y) / 2, edge.label, 12, "middle"));
    }
  });
  return svgWrap(parts.join(""));
};

const renderCodeTrace = (visual) => {
  const content = visual.content || {};
  const code = Array.isArray(content.code) ? content.code : [];
  const steps = Array.isArray(content.steps) ? content.steps : [];
  const parts = [];
  const startX = 80;
  const startY = 60;
  parts.push(text(startX, startY, "Code", 18));
  code.forEach((lineText, index) => {
    parts.push(text(startX, startY + 28 + index * 22, `${index + 1}. ${lineText}`, 14));
  });
  const stateX = 430;
  parts.push(text(stateX, startY, "Trace", 18));
  steps.forEach((step, index) => {
    parts.push(text(stateX, startY + 28 + index * 22, `L${step.line}: ${step.state}`, 14));
  });
  return svgWrap(parts.join(""));
};

export const renderVisualToSvg = (visual) => {
  if (!visual || !visual.type) return "";
  switch (visual.type) {
    case "memory_diagram":
      return renderMemoryDiagram(visual);
    case "table":
      return renderTable(visual);
    case "flowchart":
      return renderFlowchart(visual);
    case "timeline":
      return renderTimeline(visual);
    case "graph":
      return renderGraph(visual);
    case "code_trace":
      return renderCodeTrace(visual);
    default:
      return "";
  }
};
