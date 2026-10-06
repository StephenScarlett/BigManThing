import Phaser from "phaser";
import { FarmInput } from "./farm-input";
import { ART_PROPS, ART_ROOT, composeAvatar } from "./farm-avatar";
import { DEFAULT_APPEARANCE, TILE, WORLDS, cameraLayout, moveActor, nearestInteraction, propCanvas, transitionSpawn, safeFarmPosition, terrainTiles, type Actor, type Appearance, type Interaction, type Prop, type SceneId, type World, type FarmPosition } from "./farm-world";

export type FarmSnapshot = { scene: SceneId; actor: Actor; nearby: Interaction | null; zoom: number; paused: boolean; missingArt?: string[] };
export type FarmController = { destroy(): void; resize(width: number, height: number): void; releaseInput(): void; setPaused(paused: boolean): void; setAppearance(appearance: Appearance): void; jump(id: string): void };
type Options = { input: FarmInput; onSnapshot(snapshot: FarmSnapshot): void; onInspect(item: Interaction): void; onReady(): void; worlds?: Record<SceneId,World>; initialPosition?: FarmPosition };
const colour = (hex: string) => Number.parseInt(hex.replace("#", ""), 16);

/** Cosmetic movement renderer shared by the saved farm and isolated demo. */
export function mountFarm(host: HTMLElement, options: Options): FarmController {
  let scene: FarmScene | undefined, paused = false, destroyed = false;
  let appearance = { ...DEFAULT_APPEARANCE };
  const worlds=options.worlds ?? WORLDS, initial=safeFarmPosition(options.initialPosition ?? {scene:"farm",actor:worlds.farm.spawn},worlds);
  class FarmScene extends Phaser.Scene {
    private region: SceneId = initial.scene;
    private actor: Actor = { ...initial.actor };
    private player!: Phaser.GameObjects.Sprite;
    private shadow!: Phaser.GameObjects.Ellipse;
    private ground?: Phaser.Tilemaps.Tilemap;
    private lastPublished = 0;
    private walkTime = 0;
    private wasMoving = false;
    private nearbyId: string | null = null;
    private missingArt: string[] = [];
    constructor() { super("farm-preview"); }
    preload() {
      this.load.on("loaderror", (file: { key: string }) => this.missingArt.push(file.key));
      this.load.image("farm-avatar-source", ART_ROOT + "character-base.png");
      this.load.image("farm-hair-source", ART_ROOT + "hair.png");
      this.load.image("farm-terrain", ART_ROOT + "terrain.png");
      for (const id of ART_PROPS) this.load.image(`farm-art-${id}`, ART_ROOT + `${id}.png`);
    }
    create() {
      scene = this;
      this.makeGroundTextures();
      this.drawAvatar();
      this.buildRegion();
      this.scale.on("resize", this.fitCamera, this);
      this.events.once("shutdown", () => { this.scale.off("resize", this.fitCamera, this); options.input.clear(); });
      options.onReady(); this.publish(true);
    }
    private makeGroundTextures() {
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      const colours = [0x729259, 0x77965d, 0x78965b, 0xbea071, 0x598f9c, 0x638c99, 0xb89160, 0x425548];
      colours.forEach((c, i) => {
        const x = i * TILE;
        g.fillStyle(c).fillRect(x, 0, TILE, TILE);
        if (i < 3) {
          g.fillStyle(0x64844f).fillRect(x + 5, 21, 2, 3).fillRect(x + 7, 23, 2, 2);
          g.fillStyle(0x91a96b).fillRect(x + 24, 7, 2, 2);
        } else if (i === 3) {
          g.fillStyle(0xab8c60).fillRect(x + 4, 8, 3, 2).fillRect(x + 23, 25, 2, 2);
        } else if (i === 4 || i === 5) {
          g.fillStyle(0x7eb0b5).fillRect(x + 4, 10, 10, 2).fillRect(x + 18, 25, 7, 2);
        } else if (i === 6) {
          g.fillStyle(0x9b744a).fillRect(x, 0, TILE, 2).fillRect(x, 16, TILE, 1).fillRect(x + 14, 2, 1, 14);
        }
      });
      g.generateTexture("farm-ground", TILE * colours.length, TILE); g.destroy();
    }
    private buildRegion() {
      this.cameras.main.stopFollow();
      this.ground?.destroy(); this.ground = undefined;
      this.children.removeAll(true);
      const world = worlds[this.region];
      const tiles = terrainTiles(world).map(row=>row.map(tile=>this.textures.exists("farm-terrain")?tile:tile>7?7:tile));
      const density = this.textures.exists("farm-terrain") ? 2 : 1, groundKey = density === 2 ? "farm-terrain" : "farm-ground";
      this.ground = this.make.tilemap({ data: tiles, tileWidth: TILE*density, tileHeight: TILE*density });
      const tileset = this.ground.addTilesetImage(groundKey, groundKey, TILE*density, TILE*density, 0, 0)!;
      this.ground.createLayer(0, tileset, 0, 0)!.setScale(1/density).setDepth(-10000);
      for (const p of world.props) {
        const key = this.makePropTexture(p), canvas = propCanvas(p);
        this.add.image((p.x + p.w / 2) * TILE, (p.y + p.h) * TILE, key)
          .setOrigin(canvas.pivot.x / canvas.width, canvas.pivot.y / canvas.height)
          .setScale(key.startsWith("farm-art-") ? .5 : 1)
          .setDepth(["plot", "rug", "dock"].includes(p.kind) ? -100 : (p.y + p.h) * TILE);
      }
      if (this.region === "house") {
        const door=world.interactions.find(item=>item.transition==="farm")?.position ?? {x:world.spawn.x,y:world.spawn.y+22};
        if (this.textures.exists("farm-art-threshold")) this.add.image(door.x,door.y,"farm-art-threshold").setOrigin(.5,160/192).setScale(.5).setDepth(-10);
        else { this.add.rectangle(door.x,door.y + 2,TILE,10,0xcea877).setDepth(-10); this.add.rectangle(door.x,door.y - 7,40,18,0x78513e).setDepth(-10); }
      }
      this.shadow = this.add.ellipse(this.actor.x, this.actor.y - 1, 22, 8, 0x263b31, 0.24);
      this.player = this.add.sprite(this.actor.x, this.actor.y, "farm-avatar", `${this.actor.facing}-0`).setOrigin(0.5, 60 / 64).setScale(this.hasAvatarArt() ? .5 : 1);
      this.fitCamera();
      this.cameras.main.startFollow(this.player, true, 1, 1, 0, 24);
      this.cameras.main.centerOn(this.actor.x, this.actor.y - 24);
      this.walkTime = 0; this.wasMoving = false; this.nearbyId = null;
    }
    private makePropTexture(p: Prop): string {
      if (this.textures.exists(`farm-art-${p.kind}`)) return `farm-art-${p.kind}`;
      if (p.kind === "plot" && this.textures.exists("farm-terrain")) {
        const key = "farm-art-plot";
        if (!this.textures.exists(key)) {
          const texture = this.textures.createCanvas(key,128,192)!;
          texture.context.imageSmoothingEnabled=false;
          texture.context.drawImage(this.textures.get("farm-terrain").getSourceImage() as CanvasImageSource,8*64,0,64,64,32,96,64,64);
          texture.refresh();
        }
        return key;
      }
      const key = `farm-prop-${p.kind}-${p.w}-${p.h}`;
      if (this.textures.exists(key)) return key;
      const { width: w, height: h } = propCanvas(p), bottom = h - 16, left = 16, right = w - 16;
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      const r = (c: number, x: number, y: number, width: number, height: number) => g.fillStyle(c).fillRect(x, y, width, height);
      if (p.kind === "plot") {
        r(0x735438, 16, 48, 32, 32); r(0x997044, 18, 50, 28, 27);
        for (let y = 55; y < 77; y += 6) r(0x755137, 20, y, 24, 2);
      } else if (p.kind === "dock" || p.kind === "rug") {
        r(p.kind === "rug" ? 0xb34e3f : 0x815e3e, left, 48, right - left, bottom - 48);
        r(p.kind === "rug" ? 0xd79b63 : 0xb18a5c, left + 3, 51, right - left - 6, bottom - 54);
        for (let x = left + 8; x < right - 4; x += 16) r(p.kind === "rug" ? 0xb34e3f : 0x8b6844, x, 51, 2, bottom - 54);
      } else if (p.kind === "tree") {
        r(0x607b49, 9, bottom - 12, 45, 13); r(0x69513b, 27, 36, 10, bottom - 38); r(0x98734c, 30, 40, 3, bottom - 42);
        r(0x3f6846, 8, 12, 48, 33); r(0x416e47, 3, 22, 58, 24); r(0x578150, 12, 4, 40, 33); r(0x688c55, 18, 9, 18, 12); r(0x456f45, 8, 40, 45, 9);
      } else if (p.kind === "rock") {
        r(0x647168, 17, bottom - 20, 29, 19); r(0x909587, 22, bottom - 27, 19, 19); r(0xa7ab99, 24, bottom - 24, 10, 5);
      } else if (p.kind === "house") {
        r(0x70513e, left + 1, bottom - 68, right - left - 2, 68); r(0xe0c997, left + 3, bottom - 64, right - left - 6, 58);
        for (let y = bottom - 60; y < bottom - 7; y += 10) r(0xc3a77c, left + 3, y, right - left - 6, 2);
        r(0x74443a, 8, 27, w - 16, bottom - 94);
        for (let y = 28; y < bottom - 92; y += 10) { r(0xa25442, 10, y, w - 20, 8); r(0xb96850, 12, y, w - 24, 2); }
        r(0x5f3d34, 7, bottom - 96, w - 14, 8); r(0x77503b, w / 2 - 14, bottom - 39, 28, 39); r(0xdeb678, w / 2 + 6, bottom - 18, 3, 3);
        for (const x of [left + 19, right - 49]) { r(0x79553c, x, bottom - 54, 30, 28); r(0x86a8a5, x + 3, bottom - 51, 24, 21); r(0xe4c892, x + 14, bottom - 51, 2, 21); r(0xe4c892, x + 3, bottom - 41, 24, 2); }
        r(0x9f7954, left - 3, bottom - 5, right - left + 6, 5);
      } else if (p.kind === "stall") {
        r(0x70513b, left, bottom - 54, 5, 54); r(0x70513b, right - 5, bottom - 54, 5, 54);
        r(0xa95040, left - 4, bottom - 58, right - left + 8, 14); r(0xe5c484, left + 12, bottom - 58, 12, 14); r(0xe5c484, left + 40, bottom - 58, 12, 14);
        r(0x997548, left, bottom - 20, right - left, 20); r(0xc19c66, left - 2, bottom - 26, right - left + 4, 8);
        r(0xdfcd9e, left + 10, bottom - 38, 13, 12); r(0x63814e, left + 14, bottom - 35, 5, 6);
      } else if (p.kind === "board") {
        r(0x715239, 29, bottom - 40, 6, 40); r(0x735035, 8, bottom - 63, 48, 38); r(0xa58051, 12, bottom - 59, 40, 30); r(0xe5d8ae, 17, bottom - 54, 13, 20); r(0xe5d8ae, 33, bottom - 50, 12, 13);
      } else if (p.kind === "plant") {
        r(0x8b503b, 23, bottom - 19, 19, 19); r(0xba7150, 21, bottom - 22, 23, 5); r(0x51744a, 29, bottom - 47, 5, 26); r(0x668b53, 16, bottom - 43, 18, 8); r(0x517c4a, 31, bottom - 51, 16, 10);
      } else if (p.kind === "lamp") {
        r(0x785338, 26, bottom - 5, 13, 5); r(0x8c7548, 30, bottom - 51, 4, 47); r(0xdbbf79, 18, bottom - 64, 28, 18); r(0xe8d49c, 21, bottom - 66, 22, 7);
      } else if (p.kind === "bed") {
        r(0x79523a, left, 48, right - left, bottom - 48); r(0xe1c790, left + 4, 51, right - left - 8, bottom - 57); r(0xe9dcc3, left + 8, 57, right - left - 16, 19); r(0x638978, left + 5, 81, right - left - 10, bottom - 88); r(0x82a18b, left + 7, 84, right - left - 14, 5);
      } else {
        r(0x6b4b36, left + 3, bottom - 17, 5, 17); r(0x6b4b36, right - 8, bottom - 17, 5, 17);
        const tall = p.kind === "chest" ? 31 : p.kind === "chair" ? 37 : 23;
        r(0x815b3c, left, bottom - tall, right - left, tall - 7); r(0xb28b55, left, bottom - tall, right - left, 9);
        if (p.kind === "chair") { r(0x9c7547, left + 2, bottom - 47, right - left - 4, 19); r(0xc4a16d, left + 4, bottom - 45, right - left - 8, 5); }
        if (p.kind === "chest" || p.kind === "counter") { r(0x644735, left, bottom - 20, right - left, 3); r(0xe1c67e, w / 2 - 3, bottom - 21, 6, 8); }
      }
      g.generateTexture(key, w, h); g.destroy(); return key;
    }
    private hasAvatarArt() { return this.textures.exists("farm-avatar-source") && this.textures.exists("farm-hair-source"); }
    drawAvatar() {
      if (!this.hasAvatarArt()) { this.drawAvatarFallback(); return; }
      const sheet=composeAvatar(appearance,this.textures.get("farm-avatar-source").getSourceImage() as CanvasImageSource,this.textures.get("farm-hair-source").getSourceImage() as CanvasImageSource);
      const texture = !this.textures.exists("farm-avatar") ? this.textures.createCanvas("farm-avatar",320,512)! : this.textures.get("farm-avatar") as Phaser.Textures.CanvasTexture;
      texture.context.clearRect(0,0,320,512); texture.context.imageSmoothingEnabled=false; texture.context.drawImage(sheet,0,0);
      (["down","left","right","up"] as const).forEach((facing,row) => {
        for (let frame=0;frame<5;frame++) if (!texture.has(`${facing}-${frame}`)) texture.add(`${facing}-${frame}`,0,frame*64,row*128,64,128);
      });
      texture.refresh();
    }
    private drawAvatarFallback() {
      const texture = !this.textures.exists("farm-avatar") ? this.textures.createCanvas("farm-avatar", 160, 256)! : this.textures.get("farm-avatar") as Phaser.Textures.CanvasTexture;
      const ctx = texture.context; ctx.clearRect(0, 0, 160, 256);
      const facings = ["down", "left", "right", "up"] as const;
      facings.forEach((facing, row) => {
        for (let frame = 0; frame < 5; frame++) {
          const x = frame * 32, y = row * 64, step = frame === 0 ? 0 : [0, -2, 0, 2, 0][frame]!;
          const r = (c: string, a: number, b: number, w: number, h: number) => { ctx.fillStyle = c; ctx.fillRect(x + a, y + b, w, h); };
          r("#394a49", 10, 45, 5, 12 + step); r("#394a49", 18, 45, 5, 12 - step);
          r("#44372d", 9, 56 + step, 7, 4); r("#44372d", 18, 56 - step, 7, 4);
          r(appearance.skin, 7, 34, 4, 14 - step); r(appearance.skin, 22, 34, 4, 14 + step);
          r(appearance.shirt, 10, 30, 13, 16); r(appearance.shirt, 7, 31, 19, 6); r("#ead3a1", 12, 31, 9, 2);
          r(appearance.skin, 14, 27, 6, 5); r(appearance.skin, 10, 16, 13, 13);
          r(appearance.hair, 9, 12, 15, 8); r(appearance.hair, 8, 17, 4, 8);
          if (facing === "up") r(appearance.hair, 10, 17, 13, 11);
          else if (facing === "down") { r("#302a25", 13, 22, 2, 2); r("#302a25", 20, 22, 2, 2); r("#8c503c", 16, 27, 3, 1); }
          else { r(appearance.hair, facing === "left" ? 18 : 9, 18, 6, 11); r("#302a25", facing === "left" ? 11 : 21, 22, 2, 2); }
          const name = `${facing}-${frame}`;
          if (!texture.has(name)) texture.add(name, 0, x, y, 32, 64);
        }
      });
      texture.refresh();
    }
    fitCamera() {
      const { zoom, bounds } = cameraLayout(worlds[this.region], this.scale.width, this.scale.height);
      this.cameras.main.setZoom(zoom).setBounds(bounds.x, bounds.y, bounds.width, bounds.height);
      if (this.player) this.cameras.main.centerOn(this.actor.x, this.actor.y - 24);
      this.publish(true);
    }
    jump(id: string) {
      const item = worlds[this.region].interactions.find(i => i.id === id);
      if (!item) return;
      options.input.clear(); this.actor = { ...item.approach }; this.placePlayer(0); this.cameras.main.centerOn(this.actor.x, this.actor.y - 24); this.publish(true);
    }
    private placePlayer(frame: number) {
      this.player.setPosition(this.actor.x, this.actor.y).setFrame(`${this.actor.facing}-${frame}`).setDepth(this.actor.y + 0.01);
      this.shadow.setPosition(this.actor.x, this.actor.y - 1).setDepth(this.actor.y - 0.01);
    }
    publish(force = false) {
      const now = performance.now();
      if (!force && now - this.lastPublished < 100) return;
      this.lastPublished = now;
      options.onSnapshot({ scene: this.region, actor: { ...this.actor }, nearby: nearestInteraction(worlds[this.region], this.actor), zoom: this.cameras.main.zoom, paused, missingArt:[...this.missingArt] });
    }
    override update(_time: number, delta: number) {
      if (paused || destroyed) return;
      const before = this.actor, movement = options.input.movement();
      this.actor = moveActor(worlds[this.region], this.actor, movement, delta);
      const moving = Math.hypot(this.actor.x - before.x, this.actor.y - before.y) > 0.01;
      this.walkTime = moving ? this.walkTime + Math.min(delta, 100) : 0;
      this.placePlayer(moving ? 1 + Math.floor(this.walkTime / 130) % 4 : 0);
      const nearby = nearestInteraction(worlds[this.region], this.actor);
      if (options.input.consumeAction() && nearby) {
        options.input.clear();
        if (nearby.transition) { this.region = nearby.transition; this.actor = transitionSpawn(this.region,worlds); this.buildRegion(); }
        else options.onInspect(nearby);
        this.publish(true); return;
      }
      // Publish the final stop as well as throttled movement. Otherwise a menu
      // can reveal an older HUD position even though the actor already stopped.
      if (this.wasMoving && !moving) this.publish(true);
      else if (moving || nearby?.id !== this.nearbyId) this.publish();
      this.wasMoving = moving; this.nearbyId = nearby?.id ?? null;
    }
  }
  const game = new Phaser.Game({
    type: Phaser.AUTO, parent: host, width: Math.max(1, host.clientWidth), height: Math.max(1, host.clientHeight),
    backgroundColor: "#425548", pixelArt: true, roundPixels: true, antialias: false,
    banner: false, audio: { noAudio: true }, input: { keyboard: false, mouse: false, touch: false, gamepad: false },
    scale: { mode: Phaser.Scale.NONE }, scene: FarmScene,
  });
  return {
    destroy() { if (destroyed) return; destroyed = true; options.input.clear(); game.resume(); game.destroy(true); scene = undefined; },
    resize(width, height) { if (!destroyed) game.scale.resize(Math.max(1, Math.floor(width)), Math.max(1, Math.floor(height))); },
    releaseInput() { options.input.clear(); if (!destroyed) scene?.publish(true); },
    setPaused(value) { if (destroyed) return; paused = value; options.input.clear(); if (value) game.pause(); else game.resume(); scene?.publish(true); },
    setAppearance(value) { appearance = { ...value }; scene?.drawAvatar(); },
    jump(id) { if (!destroyed && !paused) scene?.jump(id); },
  };
}
