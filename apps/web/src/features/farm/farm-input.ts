import type { Point } from "./farm-world";
export type Direction = "up" | "down" | "left" | "right";
const keyDirections: Record<string, Direction> = { KeyW: "up", ArrowUp: "up", KeyS: "down", ArrowDown: "down", KeyA: "left", ArrowLeft: "left", KeyD: "right", ArrowRight: "right" };

/** Separate key/pointer ownership prevents one released finger clearing another. */
export class FarmInput {
  private keys = new Set<string>();
  private pointers = new Map<number, Direction>();
  private action = false;
  pressKey(code: string, repeat = false): boolean {
    if (code === "KeyE") { if (!repeat && !this.keys.has(code)) this.action = true; this.keys.add(code); return true; }
    if (!keyDirections[code]) return false;
    this.keys.add(code); return true;
  }
  releaseKey(code: string) { this.keys.delete(code); }
  pressPointer(id: number, direction: Direction) { this.pointers.set(id, direction); }
  releasePointer(id: number) { this.pointers.delete(id); }
  requestAction() { this.action = true; }
  consumeAction(): boolean { const action = this.action; this.action = false; return action; }
  movement(): Point {
    const directions = new Set([...this.keys].map(k => keyDirections[k]).filter((d): d is Direction => !!d));
    this.pointers.forEach(d => directions.add(d));
    return { x: Number(directions.has("right")) - Number(directions.has("left")), y: Number(directions.has("down")) - Number(directions.has("up")) };
  }
  clear() { this.keys.clear(); this.pointers.clear(); this.action = false; }
}

export function isTypingTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || !!target.closest("input,textarea,select,[contenteditable='true'],[role='textbox']"));
}
