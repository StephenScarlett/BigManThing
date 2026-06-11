import { useEffect, useRef, useState } from "react";
import { getSocket } from "./socket";
import { useDrawStore } from "./store";
import type { DrawEvent } from "@bmt/shared";

const COLORS = [
  "#0A0A0A",
  "#FFFFFF",
  "#7F7F7F",
  "#C0C0C0",
  "#E10600",
  "#9B1C1C",
  "#F59E0B",
  "#FACC15",
  "#22C55E",
  "#15803D",
  "#3B82F6",
  "#1E3A8A",
  "#A855F7",
  "#EC4899",
  "#92400E",
];
const SIZES = [3, 6, 10, 16, 24];
const CANVAS_W = 800;
const CANVAS_H = 500;
type Tool = "brush" | "fill";

export function Canvas({ canDraw }: { canDraw: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const events = useDrawStore((s) => s.events);
  const [color, setColor] = useState("#0A0A0A");
  const [size, setSize] = useState(6);
  const [tool, setTool] = useState<Tool>("brush");
  const stroke = useRef<{ x: number; y: number }[]>([]);
  const drawing = useRef(false);

  // Re-render whenever events change (replay-friendly).
  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    for (const e of events) {
      if (e.kind === "stroke") drawStroke(ctx, e);
      if (e.kind === "fill") floodFill(ctx, e.x, e.y, e.color);
    }
  }, [events]);

  function pointAt(ev: React.PointerEvent<HTMLCanvasElement>) {
    const c = canvasRef.current!;
    const rect = c.getBoundingClientRect();
    const x = ((ev.clientX - rect.left) / rect.width) * CANVAS_W;
    const y = ((ev.clientY - rect.top) / rect.height) * CANVAS_H;
    return { x: Math.round(x), y: Math.round(y) };
  }

  function onDown(ev: React.PointerEvent<HTMLCanvasElement>) {
    if (!canDraw) return;
    (ev.target as HTMLCanvasElement).setPointerCapture(ev.pointerId);
    if (tool === "fill") {
      const p = pointAt(ev);
      const evt: DrawEvent = { kind: "fill", color, x: p.x, y: p.y };
      useDrawStore.getState().appendEvent(evt);
      getSocket().emit("draw", evt);
      return;
    }
    drawing.current = true;
    stroke.current = [pointAt(ev)];
  }

  function onMove(ev: React.PointerEvent<HTMLCanvasElement>) {
    if (!canDraw || !drawing.current) return;
    const p = pointAt(ev);
    const last = stroke.current[stroke.current.length - 1];
    if (!last || Math.abs(p.x - last.x) + Math.abs(p.y - last.y) >= 2) {
      stroke.current.push(p);
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx && last) {
        ctx.strokeStyle = color;
        ctx.lineWidth = size;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(last.x, last.y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      }
    }
  }

  function onUp() {
    if (!canDraw || !drawing.current) return;
    drawing.current = false;
    if (stroke.current.length < 1) return;
    const evt: DrawEvent = { kind: "stroke", color, size, points: stroke.current };
    useDrawStore.getState().appendEvent(evt);
    getSocket().emit("draw", evt);
    stroke.current = [];
  }

  function clearCanvas() {
    if (!canDraw) return;
    const evt: DrawEvent = { kind: "clear" };
    useDrawStore.getState().appendEvent(evt);
    getSocket().emit("draw", evt);
  }

  function undo() {
    if (!canDraw) return;
    const evt: DrawEvent = { kind: "undo" };
    useDrawStore.getState().appendEvent(evt);
    getSocket().emit("draw", evt);
  }

  return (
    <div className="flex flex-col gap-2 min-h-0 flex-1">
      <div className="flex-1 min-h-0 min-w-0 flex items-center justify-center">
        <div
          className="rounded-2xl border border-line bg-white overflow-hidden shadow-sm h-full max-w-full"
          style={{ aspectRatio: `${CANVAS_W}/${CANVAS_H}` }}
        >
          <canvas
            ref={canvasRef}
            data-draw-canvas="1"
            width={CANVAS_W}
            height={CANVAS_H}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerLeave={onUp}
            className={`block w-full h-full ${canDraw ? (tool === "fill" ? "cursor-pointer" : "cursor-crosshair") : "cursor-not-allowed"}`}
            style={{ touchAction: "none" }}
          />
        </div>
      </div>
      {canDraw && (
        <div className="flex flex-wrap items-center gap-1.5 md:gap-2 shrink-0 justify-center">
          <div className="grid grid-cols-8 md:flex gap-1">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`h-8 w-8 md:h-7 md:w-7 rounded border-2 ${color === c ? "border-brand-red" : "border-line"}`}
                style={{ background: c }}
                aria-label={`Color ${c}`}
              />
            ))}
          </div>
          <div className="flex gap-1 md:ml-2">
            {SIZES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setSize(s);
                  setTool("brush");
                }}
                className={`h-8 w-8 md:h-7 md:w-7 rounded border-2 flex items-center justify-center ${size === s && tool === "brush" ? "border-brand-red" : "border-line"}`}
                aria-label={`Brush ${s}`}
              >
                <span
                  className="rounded-full bg-ink"
                  style={{ width: Math.min(s, 22), height: Math.min(s, 22) }}
                />
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setTool(tool === "fill" ? "brush" : "fill")}
            className={`h-8 md:h-7 rounded border-2 px-2 text-sm ${tool === "fill" ? "border-brand-red bg-brand-red/10 text-brand-red" : "border-line"}`}
            aria-label="Fill tool"
            title="Fill"
          >
            <span aria-hidden>🪣</span>
            <span className="hidden md:inline ml-1">Fill</span>
          </button>
          <button
            type="button"
            onClick={undo}
            className="rounded border border-line px-2 md:px-3 py-1 text-xs md:text-sm hover:bg-surface-2"
          >
            Undo
          </button>
          <button
            type="button"
            onClick={clearCanvas}
            className="rounded border border-line px-2 md:px-3 py-1 text-xs md:text-sm hover:bg-surface-2"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}

function drawStroke(
  ctx: CanvasRenderingContext2D,
  e: Extract<DrawEvent, { kind: "stroke" }>,
) {
  if (e.points.length < 1) return;
  ctx.strokeStyle = e.color;
  ctx.lineWidth = e.size;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  const first = e.points[0]!;
  ctx.moveTo(first.x, first.y);
  for (let i = 1; i < e.points.length; i++) {
    const p = e.points[i]!;
    ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();
  if (e.points.length === 1) {
    ctx.fillStyle = e.color;
    ctx.beginPath();
    ctx.arc(first.x, first.y, e.size / 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function floodFill(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  fillColor: string,
) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  if (x < 0 || y < 0 || x >= w || y >= h) return;
  const img = ctx.getImageData(0, 0, w, h);
  const data = img.data;
  const startIdx = (y * w + x) * 4;
  const sr = data[startIdx]!,
    sg = data[startIdx + 1]!,
    sb = data[startIdx + 2]!,
    sa = data[startIdx + 3]!;
  const target = parseColor(fillColor);
  if (!target) return;
  const [tr, tg, tb] = target;
  if (sr === tr && sg === tg && sb === tb && sa === 255) return;

  const tol = 16;
  const matches = (i: number) =>
    Math.abs(data[i]! - sr) <= tol &&
    Math.abs(data[i + 1]! - sg) <= tol &&
    Math.abs(data[i + 2]! - sb) <= tol &&
    Math.abs(data[i + 3]! - sa) <= tol;

  // Iterative scan-line BFS
  const stack: number[] = [x, y];
  const visited = new Uint8Array(w * h);
  while (stack.length) {
    const cy = stack.pop()!;
    const cx = stack.pop()!;
    if (cx < 0 || cy < 0 || cx >= w || cy >= h) continue;
    const pos = cy * w + cx;
    if (visited[pos]) continue;
    const i = pos * 4;
    if (!matches(i)) continue;
    visited[pos] = 1;
    data[i] = tr;
    data[i + 1] = tg;
    data[i + 2] = tb;
    data[i + 3] = 255;
    stack.push(cx + 1, cy, cx - 1, cy, cx, cy + 1, cx, cy - 1);
  }
  ctx.putImageData(img, 0, 0);
}

function parseColor(hex: string): [number, number, number] | null {
  const m = hex.match(/^#?([0-9a-f]{6})$/i);
  if (!m) return null;
  const v = parseInt(m[1]!, 16);
  return [(v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff];
}
