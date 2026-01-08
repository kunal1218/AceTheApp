import test from "node:test";
import assert from "node:assert/strict";
import {
  detectDomains,
  extractVisualAnchors,
  validateVisualOutput
} from "../services/visuals";

const buildBaseVisual = () => ({
  id: "V1",
  type: "table" as const,
  anchor_quote: "for example",
  title: "Example",
  caption: "Shows the example.",
  content: { headers: ["a"], rows: [["1"]] }
});

test("anchor_quote must be substring", () => {
  const transcript = "Here is an example. for example we show it.";
  const visuals = [
    buildBaseVisual(),
    {
      id: "V2",
      type: "table" as const,
      anchor_quote: "not in transcript",
      title: "Bad",
      caption: "Should fail.",
      content: { headers: ["a"], rows: [["2"]] }
    }
  ];
  const result = validateVisualOutput(visuals, transcript, ["for example"], 1);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes("anchor_quote")));
});

test("type whitelist enforced", () => {
  const transcript = "for example we show it.";
  const visuals = [
    buildBaseVisual(),
    {
      id: "V2",
      type: "photo" as never,
      anchor_quote: "for example",
      title: "Bad",
      caption: "Should fail.",
      content: {}
    }
  ];
  const result = validateVisualOutput(visuals, transcript, ["for example"], 1);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes("not allowed")));
});

test("visual count range enforced", () => {
  const transcript = "for example we show it.";
  const visuals = [buildBaseVisual()];
  const result = validateVisualOutput(visuals, transcript, ["for example"], 1);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes("2-6")));
});

test("visual count meets example count", () => {
  const transcript = "for example we show it.";
  const visuals = [buildBaseVisual()];
  const result = validateVisualOutput(visuals, transcript, ["for example"], 2);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes(">= number of examples")));
});

test("array indices must be contiguous", () => {
  const transcript = "for example we show it.";
  const visuals = [
    {
      id: "V1",
      type: "memory_diagram" as const,
      anchor_quote: "for example",
      title: "Array",
      caption: "Shows array.",
      content: {
        variables: [
          {
            name: "arr",
            kind: "array",
            cells: [
              { index: 0, value: 1 },
              { index: 2, value: 3 }
            ]
          }
        ]
      }
    },
    buildBaseVisual()
  ];
  const result = validateVisualOutput(visuals, transcript, ["for example"], 1);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes("contiguous")));
});

test("pointer arrows must originate from pointer", () => {
  const transcript = "for example we show it.";
  const visuals = [
    {
      id: "V1",
      type: "memory_diagram" as const,
      anchor_quote: "for example",
      title: "Pointer",
      caption: "Shows pointer.",
      content: {
        variables: [
          { name: "arr", kind: "array", cells: [{ index: 0, value: 1 }] },
          { name: "p", kind: "pointer", points_to: "arr[0]" }
        ],
        arrows: [{ from: "arr", to_address: "arr[0]" }]
      }
    },
    buildBaseVisual()
  ];
  const result = validateVisualOutput(visuals, transcript, ["for example"], 1);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes("pointer")));
});

test("array points to pointer phrasing rejected", () => {
  const transcript = "for example we show it.";
  const visuals = [
    {
      id: "V1",
      type: "table" as const,
      anchor_quote: "for example",
      title: "Array points to pointer",
      caption: "Array points to pointer.",
      content: { headers: ["a"], rows: [["1"]] }
    },
    buildBaseVisual()
  ];
  const result = validateVisualOutput(visuals, transcript, ["for example"], 1);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes("array points to pointer")));
});

test("cs_arch domain detection", () => {
  const transcript = "We use a pointer and stack memory.";
  const detection = detectDomains(transcript, ["int *p = arr;"]);
  assert.ok(detection.selected.includes("cs_arch"));
});

test("anchor extraction counts examples", () => {
  const transcript = "For example, suppose arr[3] = {1,2,3}.";
  const { exampleCount, anchors } = extractVisualAnchors(transcript, []);
  assert.ok(exampleCount >= 1);
  assert.ok(anchors.length >= 1);
});
