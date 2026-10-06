import { describe, expect, it } from "vitest";
import { FarmInput } from "./farm-input";
import { WALK_SPEED, WORLDS, cameraLayout, isWalkable, moveActor, nearestInteraction, propCanvas, transitionSpawn, type World } from "./farm-world";

describe("F0 farm geometry", () => {
  it("keeps every spawn and interaction approach safe", () => {
    for (const world of Object.values(WORLDS)) {
      expect(isWalkable(world, world.spawn)).toBe(true);
      for (const item of world.interactions) {
        expect(isWalkable(world, item.approach), item.id).toBe(true);
        expect(nearestInteraction(world, item.approach)?.id, item.id).toBe(item.id);
      }
      expect(new Set(world.props.map(p => p.id)).size).toBe(world.props.length);
    }
  });
  it("normalises diagonal movement and retains four readable facings", () => {
    const world: World = { ...WORLDS.farm, blockers: [] }, start = { x: 200, y: 200, facing: "down" as const };
    const straight = moveActor(world, start, { x: 1, y: 0 }, 100), diagonal = moveActor(world, start, { x: 1, y: 1 }, 100);
    expect(Math.hypot(diagonal.x - 200, diagonal.y - 200)).toBeCloseTo(WALK_SPEED / 10);
    expect(straight.x - 200).toBeCloseTo(WALK_SPEED / 10);
    expect(straight.facing).toBe("right"); expect(diagonal.facing).toBe("down");
  });
  it("slides along foot-level blockers without tunnelling after a long frame", () => {
    const world: World = { ...WORLDS.farm, blockers: [{ x: 220, y: 0, width: 32, height: 1500 }] };
    const next = moveActor(world, { x: 210, y: 200, facing: "down" }, { x: 1, y: 1 }, 10000);
    expect(next.x).toBeLessThanOrEqual(214); expect(next.y).toBeGreaterThan(200); expect(isWalkable(world, next)).toBe(true);
    expect(Math.hypot(next.x - 210, next.y - 200)).toBeLessThanOrEqual(12.8);
  });
  it("blocks water, furniture and world edges but leaves the dock and rugs walkable", () => {
    expect(isWalkable(WORLDS.farm, { x: 37 * 32, y: 22 * 32 })).toBe(false);
    expect(isWalkable(WORLDS.farm, { x: 38 * 32, y: 26 * 32 })).toBe(true);
    expect(isWalkable(WORLDS.farm, { x: 39.5 * 32, y: 26 * 32 })).toBe(false);
    expect(isWalkable(WORLDS.house, { x: 2 * 32, y: 2 * 32 })).toBe(false);
    expect(isWalkable(WORLDS.house, { x: 4 * 32, y: 5 * 32 })).toBe(true);
    expect(isWalkable(WORLDS.farm, { x: 0, y: 0 })).toBe(false);
  });
  it("does not let invalid input poison positions and recovers an unsafe spawn", () => {
    const world = WORLDS.farm;
    expect(moveActor(world, world.spawn, { x: NaN, y: 0 }, 16)).toEqual(world.spawn);
    expect(moveActor(world, { x: NaN, y: 0, facing: "up" }, { x: 0, y: 0 }, 16)).toEqual(world.spawn);
    expect(moveActor(world, world.spawn, { x: 1, y: 0 }, -1)).toEqual(world.spawn);
  });
  it("makes door round trips deterministic rather than triggering an entry loop", () => {
    expect(transitionSpawn("house")).toEqual(WORLDS.house.spawn);
    expect(isWalkable(WORLDS.farm, transitionSpawn("farm"))).toBe(true);
    expect(nearestInteraction(WORLDS.farm, transitionSpawn("farm"))?.id).toBe("home-door");
    // A transition is requested by a fresh action, never by proximity alone.
    const input = new FarmInput(); input.requestAction(); expect(input.consumeAction()).toBe(true); expect(input.consumeAction()).toBe(false);
  });
  it("matches the square-tile art pivots and centres a small house inside a large viewport", () => {
    expect(propCanvas({ w: 2, h: 1 })).toEqual({ width: 96, height: 96, pivot: { x: 48, y: 80 } });
    const layout = cameraLayout(WORLDS.house, 1200, 600);
    expect(layout.zoom).toBe(2); expect(layout.bounds.x).toBe(-140); expect(layout.bounds.width).toBe(600);
    expect(cameraLayout(WORLDS.farm, 390, 450).zoom).toBe(1);
  });
  it("has walkable routes from each spawn to every interactable", () => {
    for (const world of Object.values(WORLDS)) {
      // Eight-pixel grid uses the same collision function as actual movement.
      const origin = { x: Math.round(world.spawn.x / 8), y: Math.round(world.spawn.y / 8) };
      const queue = [origin], visited = new Set([`${origin.x},${origin.y}`]);
      for (let i = 0; i < queue.length; i++) {
        const p = queue[i]!;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const q = { x: p.x + dx!, y: p.y + dy! }, key = `${q.x},${q.y}`;
          if (!visited.has(key) && isWalkable(world, { x: q.x * 8, y: q.y * 8 })) { visited.add(key); queue.push(q); }
        }
      }
      for (const item of world.interactions) expect([...visited].some(key => { const [x, y] = key.split(",").map(Number); return Math.hypot(x! * 8 - item.position.x, y! * 8 - item.position.y) <= 24; }), item.id).toBe(true);
    }
  });
});

describe("F0 input ownership", () => {
  it("keeps a keyboard direction held when a pointer releases", () => {
    const input = new FarmInput(); input.pressKey("KeyD"); input.pressPointer(1, "right"); input.releasePointer(1);
    expect(input.movement()).toEqual({ x: 1, y: 0 }); input.releaseKey("KeyD"); expect(input.movement()).toEqual({ x: 0, y: 0 });
  });
  it("keeps a second finger held and clears everything on blur/modal/unmount", () => {
    const input = new FarmInput(); input.pressPointer(1, "up"); input.pressPointer(2, "right"); input.releasePointer(1);
    expect(input.movement()).toEqual({ x: 1, y: 0 }); input.requestAction(); input.clear();
    expect(input.movement()).toEqual({ x: 0, y: 0 }); expect(input.consumeAction()).toBe(false);
  });
  it("does not repeat an interaction while E is held", () => {
    const input = new FarmInput(); input.pressKey("KeyE"); expect(input.consumeAction()).toBe(true);
    input.pressKey("KeyE", true); expect(input.consumeAction()).toBe(false);
    input.releaseKey("KeyE"); input.pressKey("KeyE"); expect(input.consumeAction()).toBe(true);
  });
  it("cancels opposite directions and ignores unrelated keys", () => {
    const input = new FarmInput(); input.pressKey("KeyA"); input.pressPointer(1, "right");
    expect(input.movement()).toEqual({ x: 0, y: 0 }); expect(input.pressKey("Space")).toBe(false);
  });
});
