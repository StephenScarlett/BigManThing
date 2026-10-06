import type { Appearance } from "./farm-world";

export const ART_ROOT = `${import.meta.env.BASE_URL}farm-art/v1/`;
export const AVATAR_FRAME = { width: 64, height: 128, feetX: 32, feetY: 120 } as const;
export const ART_PROPS = ["house", "tree", "rock", "stall", "counter", "board", "dock", "bed", "table", "chair", "chest", "plant", "rug", "lamp", "threshold"] as const;
export type Material = "skin" | "shirt" | "pants" | "shoes";
const rgb = (hex: string) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
const clamp = (x: number) => Math.max(0, Math.min(255, Math.round(x)));

/** Palette ramps preserve the source shading while keeping identity colours free. */
export function shadePixel(hex: string, light: number): [number, number, number] {
  const c = rgb(hex), scale = Math.max(0.28, Math.min(1.55, light));
  return c.map((v, i) => clamp(scale > 1 ? v + (255 - v) * (scale - 1) * 0.8 : v * scale + (i === 2 ? (1 - scale) * 12 : 0))) as [number,number,number];
}
export function sourceMaterial(r: number, g: number, b: number, y: number): Material | null {
  // These selectors apply only to the retained ochre/denim/peach source rig.
  // Future garments provide authored masks instead of changing these thresholds.
  if (y >= 103 && r > g * 1.1 && r > b * 1.04) return "shoes";
  if (y > 66 && b > r * 1.15 && b > g * 1.04) return "pants";
  if (y >= 38 && y < 77 && r > b * 1.6 && g > b * 1.85 && r / Math.max(1, g) < 1.65) return "shirt";
  if (r > b * 1.35 && r > g * 1.15 && g > b * 1.05 && y < 105) return "skin";
  return null;
}
const bodyWidth = (a: Appearance, y: number) => {
  if (y < 39 || y >= 116) return 1;
  const full = a.bodyType === "broad" ? 1.16 : a.bodyType === "slim" ? 0.88 : 1;
  // Blend toward neck and feet so the head and boots never change anchor.
  return 1 + (full - 1) * Math.min(1, (y - 38) / 12, (116 - y) / 12);
};
function makeCanvas(w: number, h: number) { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; }
const materialLight: Record<Material, number> = { skin: 185, shirt: 149, pants: 94, shoes: 77 };
export function composeAvatar(appearance: Appearance, base: CanvasImageSource, hair: CanvasImageSource): HTMLCanvasElement {
  const original = makeCanvas(320,512), o = original.getContext("2d", { willReadFrequently: true })!;
  o.imageSmoothingEnabled = false; o.drawImage(base,0,0);
  const pixels = o.getImageData(0,0,320,512);
  for (let y = 0; y < 512; y++) for (let x = 0; x < 320; x++) {
    const index = (y * 320 + x) * 4;
    if (pixels.data[index + 3]! < 80) { pixels.data[index + 3] = 0; continue; }
    // Fixed source masks, not predicates on the player's selected colour.
    const localY = y % 128, material = sourceMaterial(pixels.data[index]!,pixels.data[index+1]!,pixels.data[index+2]!,localY);
    if (!material) continue;
    const colour = material === "pants" && appearance.bottomStyle === "shorts" && localY >= 91 && localY < 106 ? appearance.skin : appearance[material];
    const light = (pixels.data[index]! * .3 + pixels.data[index+1]! * .5 + pixels.data[index+2]! * .2) / materialLight[material];
    const [r,g,b] = shadePixel(colour, light); pixels.data[index] = r; pixels.data[index+1] = g; pixels.data[index+2] = b;
  }
  o.putImageData(pixels,0,0);
  // Generated profile contact poses are close to each other. Use the same
  // neutral lower body for passing poses, giving a readable stride/return
  // without pretending the starting sheet was a hand-authored perfect cycle.
  for (let row=0;row<4;row++) for (const frame of [2,4]) {
    o.clearRect(frame*64,row*128+78,64,50);
    o.drawImage(original,0,row*128+78,64,50,frame*64,row*128+78,64,50);
  }
  const result = makeCanvas(320,512), resultCtx = result.getContext("2d")!; resultCtx.imageSmoothingEnabled = false;
  const tintedHair = makeCanvas(256,256), hctx = tintedHair.getContext("2d", { willReadFrequently:true })!;
  hctx.drawImage(hair,0,0); const hp = hctx.getImageData(0,0,256,256);
  for (let i = 0; i < hp.data.length; i += 4) if (hp.data[i+3]! > 80) {
    const [r,g,b] = shadePixel(appearance.hair,(hp.data[i]!*.3 + hp.data[i+1]!*.5 + hp.data[i+2]!*.2)/85);
    hp.data[i]=r; hp.data[i+1]=g; hp.data[i+2]=b;
  }
  hctx.putImageData(hp,0,0);
  for (let row = 0; row < 4; row++) for (let frame = 0; frame < 5; frame++) {
    const ox = frame * 64, oy = row * 128;
    // A broad contact pose can reach the frame edge. Clip each composed
    // frame independently so its pixels never spill into a neighbour's idle.
    const cell = makeCanvas(64,128), ctx = cell.getContext("2d")!; ctx.imageSmoothingEnabled = false;
    for (let y = 0; y < 128; y++) {
      const width = Math.round(64 * bodyWidth(appearance,y));
      ctx.drawImage(original,ox,oy+y,64,1,Math.round((64-width)/2),y,width,1);
    }
    const rect = (colour: string,x: number,y: number,w: number,h: number) => { ctx.fillStyle=colour; ctx.fillRect(x,y,w,h); };
    // Small authored face/collar overlays use the same pixel grid as the rig.
    const front = row === 0, back = row === 3;
    if (!back) {
      const eyeXs = front ? [26,36] : row === 1 ? [27] : [36];
      for (const x of eyeXs) {
        rect(appearance.skin,x-1,27,5,7); rect("#3a2930",x,29,3,appearance.eyeStyle === "round" ? 5 : 3);
        rect(appearance.eyes,x+1,30,2,appearance.eyeStyle === "sharp" ? 1 : 3); rect("#f4e7c6",x,29,1,1);
        if (appearance.eyeStyle === "sharp") rect("#3a2930",x-1,28,5,1);
      }
    }
    if (appearance.topStyle !== "tee" && front) {
      rect("#e6d7b5",26,45,4,4); rect("#e6d7b5",34,45,4,4);
      rect("#6b4936",31,49,2,24);
      for (const y of [52,59,66]) rect("#f4deb0",32,y,1,1);
      if (appearance.topStyle === "overshirt") { rect("#ede2c8",30,50,4,21); rect("#694735",25,56,5,1); }
    }
    if (appearance.hairStyle !== "bald") {
      const col = ["crop","curls","bob","ponytail"].indexOf(appearance.hairStyle);
      const overlay=makeCanvas(64,64), hc=overlay.getContext("2d")!;
      hc.drawImage(tintedHair,col*64,row*64,64,64,0,0,64,64);
      // Shared face opening prevents a loose generated bang from covering
      // the player's eye/identity choices; rear hair remains intact.
      if (!back) {
        hc.clearRect(front?25:row===1?21:36,24,front?16:8,12);
      }
      ctx.drawImage(overlay,0,0);
    }
    if (appearance.hatStyle === "cap") {
      rect("#332b31",21,8,22,9); rect(appearance.hat,22,9,20,8); rect("#bfc6ac",25,10,9,2);
      rect(appearance.hat,row===1?18:row===2?35:20,17,front?25:back?23:12,3);
    }
    resultCtx.drawImage(cell,ox,oy);
  }
  return result;
}

let sources: Promise<{ base: HTMLImageElement; hair: HTMLImageElement }> | undefined;
export function loadAvatarSources() {
  sources ??= Promise.all(["character-base.png","hair.png"].map(file => new Promise<HTMLImageElement>((resolve,reject) => {
    const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(Error(`Could not load ${file}`)); image.src=ART_ROOT+file;
  }))).then(([base,hair]) => ({base:base!,hair:hair!})).catch(error => { sources=undefined; throw error; });
  return sources;
}
