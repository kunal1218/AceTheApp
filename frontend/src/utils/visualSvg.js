const WIDTH = 800;
const HEIGHT = 450;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const escapeText = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const estimateTextWidth = (value, size) => String(value).length * size * 0.56;

const truncateLine = (value, maxWidth, size) => {
  let trimmed = String(value);
  if (!trimmed) return trimmed;
  if (estimateTextWidth(trimmed, size) <= maxWidth) return trimmed;
  const ellipsis = "...";
  while (trimmed.length > 1 && estimateTextWidth(`${trimmed}${ellipsis}`, size) > maxWidth) {
    trimmed = trimmed.slice(0, -1);
  }
  return `${trimmed}${ellipsis}`;
};

const wrapText = (value, maxWidth, size, maxLines = Infinity) => {
  const raw = String(value ?? "").trim();
  if (!raw) return [];
  const words = raw.split(/\s+/);
  const lines = [];
  let lineText = "";

  const pushLine = () => {
    if (lineText) lines.push(lineText);
    lineText = "";
  };

  words.forEach((word) => {
    const next = lineText ? `${lineText} ${word}` : word;
    if (estimateTextWidth(next, size) <= maxWidth) {
      lineText = next;
      return;
    }
    if (!lineText) {
      let chunk = word;
      while (chunk.length > 1 && estimateTextWidth(chunk, size) > maxWidth) {
        const cut = Math.max(1, Math.floor(maxWidth / (size * 0.56)) - 1);
        lines.push(chunk.slice(0, cut));
        chunk = chunk.slice(cut);
        if (lines.length >= maxLines) break;
      }
      lineText = chunk;
      return;
    }
    pushLine();
    lineText = word;
  });

  if (lineText) lines.push(lineText);

  if (lines.length > maxLines) {
    const truncated = lines.slice(0, maxLines);
    truncated[maxLines - 1] = truncateLine(truncated[maxLines - 1], maxWidth, size);
    return truncated;
  }
  return lines;
};

const renderWrappedText = (
  x,
  y,
  value,
  maxWidth,
  size = 14,
  anchor = "start",
  maxLines = Infinity,
  lineHeight = size * 1.25
) => {
  const lines = wrapText(value, maxWidth, size, maxLines);
  return {
    lines,
    svg: lines.map((lineText, idx) => text(x, y + idx * lineHeight, lineText, size, anchor)).join(""),
    lineHeight,
  };
};

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
  const marginX = 60;
  const marginY = 70;
  const pointerColumnWidth = pointers.length ? 200 : 0;
  const arraysMaxWidth = WIDTH - marginX * 2 - pointerColumnWidth - (pointers.length ? 20 : 0);
  const cellGap = 12;
  const minCellWidth = 48;
  const maxCellWidth = 120;
  const cellHeight = 60;
  let currentY = marginY;
  const arrayTargets = [];

  arrays.forEach((arrayVar, index) => {
    const cells = Array.isArray(arrayVar.cells) ? arrayVar.cells : [];
    const safeCells = cells.length ? cells : [{ index: 0 }];
    const cellCount = safeCells.length;
    const maxCellsPerRow = Math.max(
      1,
      Math.floor((arraysMaxWidth + cellGap) / (minCellWidth + cellGap))
    );
    const cellsPerRow = Math.min(cellCount, maxCellsPerRow);
    const rowCount = Math.ceil(cellCount / cellsPerRow);
    const cellWidth = clamp(
      (arraysMaxWidth - (cellsPerRow - 1) * cellGap) / cellsPerRow,
      minCellWidth,
      maxCellWidth
    );

    const label = arrayVar.name || "array";
    const labelBlock = renderWrappedText(
      marginX,
      currentY,
      label,
      arraysMaxWidth,
      16,
      "start",
      2
    );
    parts.push(labelBlock.svg);
    const gridStartY = currentY + labelBlock.lines.length * 20 + 6;

    safeCells.forEach((cell, cellIndex) => {
      const row = Math.floor(cellIndex / cellsPerRow);
      const col = cellIndex % cellsPerRow;
      const x = marginX + col * (cellWidth + cellGap);
      const y = gridStartY + row * (cellHeight + 44);
      parts.push(rect(x, y, cellWidth, cellHeight));

      if (cell.value !== undefined) {
        const valueLines = wrapText(cell.value, cellWidth - 10, 14, 2);
        const lineHeight = 16;
        const blockHeight = valueLines.length * lineHeight;
        const valueStart = y + cellHeight / 2 - blockHeight / 2 + 6;
        parts.push(
          valueLines
            .map((lineText, idx) =>
              text(x + cellWidth / 2, valueStart + idx * lineHeight, lineText, 14, "middle")
            )
            .join("")
        );
      }

      const idxLabel = `idx ${cell.index ?? cellIndex}`;
      parts.push(text(x + cellWidth / 2, y + cellHeight + 18, idxLabel, 12, "middle"));

      if (cell.address) {
        const addressLines = wrapText(cell.address, cellWidth - 6, 11, 2);
        const addrLineHeight = 12;
        const addrStart = y - 6 - (addressLines.length - 1) * addrLineHeight;
        parts.push(
          addressLines
            .map((lineText, idx) =>
              text(x + cellWidth / 2, addrStart + idx * addrLineHeight, lineText, 11, "middle")
            )
            .join("")
        );
      }

      if (cellIndex === 0 && index === 0) {
        arrayTargets.push({ x: x + cellWidth / 2, y: y + cellHeight / 2 });
      }
    });

    currentY = gridStartY + rowCount * (cellHeight + 44) + 22;
  });

  if (arrays.length && pointers.length) {
    const pointerX = marginX + arraysMaxWidth + 20;
    const pointerBoxWidth = 170;
    const pointerBoxHeight = 54;
    const pointerY = marginY;
    pointers.forEach((pointer, idx) => {
      const y = pointerY + idx * 86;
      parts.push(rect(pointerX, y, pointerBoxWidth, pointerBoxHeight));
      parts.push(text(pointerX + pointerBoxWidth / 2, y + 32, pointer.name || "ptr", 16, "middle"));
      const targetLabel = pointer.points_to || "";
      if (targetLabel) {
        parts.push(text(pointerX + pointerBoxWidth / 2, y + 72, targetLabel, 11, "middle"));
      }
      const arrowStartX = pointerX;
      const arrowStartY = y + pointerBoxHeight / 2;
      const target = arrayTargets[0];
      const arrowEndX = target ? target.x : marginX + 20;
      const arrowEndY = target ? target.y : arrowStartY;
      parts.push(line(arrowStartX, arrowStartY, arrowEndX, arrowEndY));
      parts.push(arrowHead(arrowEndX, arrowEndY, arrowStartX > arrowEndX ? -1 : 1, 0));
    });
  }

  return svgWrap(parts.join(""));
};

const renderTable = (visual) => {
  const content = visual.content || {};
  const headers = Array.isArray(content.headers) ? content.headers : [];
  const rows = Array.isArray(content.rows) ? content.rows : [];
  const cols = headers.length || (rows[0]?.length || 1);
  const startX = 80;
  const startY = 70;
  const tableWidth = WIDTH - startX * 2;
  const cellWidth = tableWidth / cols;
  const paddingX = 8;
  const paddingY = 10;
  const lineHeight = 16;
  const parts = [];

  const headerLines = headers.map((header) =>
    wrapText(header, cellWidth - paddingX * 2, 14, 2)
  );
  const headerHeight = Math.max(1, ...headerLines.map((lines) => lines.length)) * lineHeight +
    paddingY * 2;

  for (let c = 0; c < cols; c += 1) {
    const x = startX + c * cellWidth;
    parts.push(rect(x, startY, cellWidth, headerHeight));
    const headerBlock = renderWrappedText(
      x + cellWidth / 2,
      startY + paddingY + lineHeight - 2,
      headers[c] || "",
      cellWidth - paddingX * 2,
      14,
      "middle",
      2,
      lineHeight
    );
    parts.push(headerBlock.svg);
  }

  let currentY = startY + headerHeight;
  rows.forEach((row) => {
    const rowValues = Array.isArray(row) ? row : [];
    const cellLines = rowValues.map((value) =>
      wrapText(value, cellWidth - paddingX * 2, 13, 3)
    );
    const rowHeight = Math.max(1, ...cellLines.map((lines) => lines.length)) * lineHeight +
      paddingY * 2;
    for (let c = 0; c < cols; c += 1) {
      const x = startX + c * cellWidth;
      parts.push(rect(x, currentY, cellWidth, rowHeight));
      const cellBlock = renderWrappedText(
        x + cellWidth / 2,
        currentY + paddingY + lineHeight - 2,
        rowValues[c] || "",
        cellWidth - paddingX * 2,
        13,
        "middle",
        3,
        lineHeight
      );
      parts.push(cellBlock.svg);
    }
    currentY += rowHeight;
  });

  return svgWrap(parts.join(""));
};

const renderFlowchart = (visual) => {
  const content = visual.content || {};
  const nodes = Array.isArray(content.nodes) ? content.nodes : [];
  const edges = Array.isArray(content.edges) ? content.edges : [];
  const parts = [];
  const startX = 140;
  const startY = 70;
  const boxWidth = 520;
  const gap = 26;
  const nodeLayouts = [];
  let currentY = startY;
  const lineHeight = 16;

  nodes.forEach((node) => {
    const nodeText = node.text || node.id;
    const textBlock = wrapText(nodeText, boxWidth - 24, 14, 3);
    const height = textBlock.length * lineHeight + 20;
    nodeLayouts.push({ id: node.id, y: currentY, height, textLines: textBlock });
    currentY += height + gap;
  });

  nodeLayouts.forEach((layout, index) => {
    const y = layout.y;
    parts.push(rect(startX, y, boxWidth, layout.height));
    const textStart = y + 16;
    parts.push(
      layout.textLines
        .map((lineText, idx) =>
          text(startX + boxWidth / 2, textStart + idx * lineHeight, lineText, 14, "middle")
        )
        .join("")
    );
  });

  edges.forEach((edge) => {
    const fromIndex = nodeLayouts.findIndex((node) => node.id === edge.from);
    const toIndex = nodeLayouts.findIndex((node) => node.id === edge.to);
    if (fromIndex === -1 || toIndex === -1) return;
    const x = startX + boxWidth / 2;
    const y1 = nodeLayouts[fromIndex].y + nodeLayouts[fromIndex].height;
    const y2 = nodeLayouts[toIndex].y;
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
    const titleLines = wrapText(event.t || `Step ${index + 1}`, 140, 12, 2);
    const titleLineHeight = 14;
    const titleStart = midY - 20 - (titleLines.length - 1) * titleLineHeight;
    parts.push(
      titleLines
        .map((lineText, idx) =>
          text(x, titleStart + idx * titleLineHeight, lineText, 12, "middle")
        )
        .join("")
    );
    const bodyLines = wrapText(event.text || "", 140, 12, 2);
    const bodyLineHeight = 14;
    const bodyStart = midY + 26;
    parts.push(
      bodyLines
        .map((lineText, idx) =>
          text(x, bodyStart + idx * bodyLineHeight, lineText, 12, "middle")
        )
        .join("")
    );
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
    const labelLines = wrapText(node.label || node.id, 60, 11, 2);
    const labelLineHeight = 12;
    const labelStart = node._y - (labelLines.length - 1) * labelLineHeight + 4;
    parts.push(
      labelLines
        .map((lineText, idx) =>
          text(node._x, labelStart + idx * labelLineHeight, lineText, 11, "middle")
        )
        .join("")
    );
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
  const startX = 70;
  const startY = 56;
  const columnGap = 40;
  const columnWidth = (WIDTH - startX * 2 - columnGap) / 2;
  const lineHeight = 16;
  const rowGap = 6;
  const maxY = HEIGHT - 20;
  let currentY = startY + 22;

  parts.push(text(startX, startY, "Code", 16));
  parts.push(text(startX + columnWidth + columnGap, startY, "Trace", 16));

  const rowCount = Math.max(code.length, steps.length);
  for (let i = 0; i < rowCount; i += 1) {
    const codeText = code[i] !== undefined ? `${i + 1}. ${code[i]}` : "";
    const traceText = steps[i]
      ? `L${steps[i].line}: ${steps[i].state}`
      : "";
    const codeLines = wrapText(codeText, columnWidth, 12, 3);
    const traceLines = wrapText(traceText, columnWidth, 12, 3);
    const rowHeight = Math.max(codeLines.length, traceLines.length, 1) * lineHeight + rowGap;

    if (currentY + rowHeight > maxY) {
      parts.push(text(startX, maxY, "...", 12));
      break;
    }

    codeLines.forEach((lineText, idx) => {
      parts.push(text(startX, currentY + idx * lineHeight, lineText, 12));
    });
    traceLines.forEach((lineText, idx) => {
      parts.push(
        text(startX + columnWidth + columnGap, currentY + idx * lineHeight, lineText, 12)
      );
    });
    currentY += rowHeight;
  }
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
