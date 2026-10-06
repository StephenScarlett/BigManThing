// Deterministic packing/conversion of the retained generated PNG sources.
// Requires sharp, available in the Codex primary runtime or installed locally.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const sharp = require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES ? path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES, 'sharp') : 'sharp');
const root = path.resolve(import.meta.dirname, '../..');
const source = path.join(root, 'art/farm/v1/source');
const output = path.join(root, 'apps/web/public/farm-art/v1');
await fs.mkdir(output, { recursive: true });
const transparent = (w, h) => sharp({ create: { width: w, height: h, channels: 4, background: '#00000000' } });
// Image generation placed these objects with variable gutters. Review measured
// extraction rectangles, rather than pretending the source is a perfect grid.
const regions = {
  outside: [[42,42,504,600],[620,420,290,220],[990,188,520,440],[22,690,504,272],[535,660,240,300],[790,708,740,270]],
  inside: [[130,16,320,494],[520,170,436,322],[1000,140,240,352],[1280,210,390,282],[130,542,280,314],[446,498,220,355],[700,512,578,342],[1320,635,340,207]],
};
async function cell(name, cols, rows, index) {
  const file = path.join(source, `${name}.png`), m = await sharp(file).metadata();
  if (regions[name]) {
    const [left,top,width,height]=regions[name][index];
    return sharp(file).extract({left,top,width,height});
  }
  const c = index % cols, r = Math.floor(index / cols);
  const left = Math.round(c * m.width / cols), top = Math.round(r * m.height / rows);
  return sharp(file).extract({ left, top, width: Math.round((c + 1) * m.width / cols) - left, height: Math.round((r + 1) * m.height / rows) - top });
}
async function trimmed(image, mainOnly = false) {
  const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let x0 = info.width, y0 = info.height, x1 = 0, y1 = 0;
  if (mainOnly) {
    // A detached source pixel below the right-idle boot must not become the
    // feet anchor. Find the connected figure, not every nonzero-alpha speck.
    const seen=new Uint8Array(info.width*info.height); let largest=0, keep=[];
    for(let start=0;start<seen.length;start++) {
      if(seen[start] || data[start*4+3]<160) continue;
      const queue=[start]; seen[start]=1; let ax=info.width,ay=info.height,bx=0,by=0;
      for(let p=0;p<queue.length;p++) {
        const point=queue[p],x=point%info.width,y=Math.floor(point/info.width);
        ax=Math.min(ax,x);ay=Math.min(ay,y);bx=Math.max(bx,x);by=Math.max(by,y);
        for(let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++) {
          const nx=x+dx,ny=y+dy,n=ny*info.width+nx;
          if(nx<0 || ny<0 || nx>=info.width || ny>=info.height || seen[n] || data[n*4+3]<160) continue;
          seen[n]=1;queue.push(n);
        }
      }
      if(queue.length>largest) { largest=queue.length;keep=queue;x0=ax;y0=ay;x1=bx;y1=by; }
    }
    const figure=new Uint8Array(seen.length);for(const p of keep)figure[p]=1;
    for(let p=0;p<figure.length;p++) data[p*4+3]=figure[p]?255:0;
    return sharp(data,{raw:info}).extract({left:x0,top:y0,width:x1-x0+1,height:y1-y0+1});
  }
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    if (data[(y * info.width + x) * 4 + 3] < 160) continue;
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
  }
  if (x0 > x1 || y0 > y1) throw Error('Empty source sprite');
  return sharp(data, { raw: info }).extract({ left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 });
}
const layers = [], headAnchors = [];
for (let i = 0; i < 20; i++) {
  const sprite = await trimmed(await cell('character', 5, 4, i), true);
  const input = await sprite.png().toBuffer();
  const m = await sharp(input).metadata(), width = Math.round(m.width * 110 / m.height);
  const resized = await sharp(input).resize(width, 110, { kernel: 'nearest' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  // Anchor to the head, rather than the bounding box of a swinging arm/leg.
  let min = width, max = 0;
  for (let y = 0; y < 29; y++) for (let x = 0; x < width; x++) if (resized.data[(y * width + x) * 4 + 3] > 160) { min = Math.min(min, x); max = Math.max(max, x); }
  const left = 32 - Math.round((min + max) / 2), top = 10;
  const png = await sharp(resized.data, { raw: resized.info }).png().toBuffer();
  layers.push({ input: png, left: (i % 5) * 64 + left, top: Math.floor(i / 5) * 128 + top });
  headAnchors.push({ frame: i, head: [32, 23], feet: [32, 120] });
}
await transparent(320, 512).composite(layers).png({palette:true,colours:128,dither:0}).toFile(path.join(output, 'character-base.png'));

const hairs = [], hairSizes = [[28, 26], [34, 31], [29, 35], [31, 37]];
for (let i = 0; i < 16; i++) {
  const [w, h] = hairSizes[i % 4];
  const input = await (await trimmed(await cell('hair', 4, 4, i))).resize(w, h, { fit: 'fill', kernel: 'nearest' }).png().toBuffer();
  hairs.push({ input, left: (i % 4) * 64 + 32 - Math.floor(w / 2), top: Math.floor(i / 4) * 64 + 5 });
}
await transparent(256, 256).composite(hairs).png({palette:true,colours:128,dither:0}).toFile(path.join(output, 'hair.png'));

const ground = [];
for (let i = 0; i < 12; i++) ground.push({ input: await (await cell('terrain', 4, 3, i)).resize(64, 64, { kernel: 'nearest' }).png().toBuffer(), left: i * 64, top: 0 });
await transparent(768, 64).composite(ground).png({palette:true,colours:256,dither:0}).toFile(path.join(output, 'terrain.png'));

// Canvas, pivot, visual extent and footprint stay explicit; no auto collision.
const specs = [
  ['house','house',1,1,0,6,4,420,312],
  ['tree','outside',3,2,0,1,1,124,176],
  ['rock','outside',3,2,1,1,1,62,44],
  ['stall','outside',3,2,2,2,1,142,116],
  ['counter','outside',3,2,3,2,1,128,72],
  ['board','outside',3,2,4,1,1,88,120],
  ['dock','outside',3,2,5,7,2,448,128],
  ['bed','inside',4,2,0,2,3,128,200],
  ['table','inside',4,2,1,2,1,130,72],
  ['chair','inside',4,2,2,1,1,60,78],
  ['chest','inside',4,2,3,2,1,124,68],
  ['plant','inside',4,2,4,1,1,66,116],
  ['lamp','inside',4,2,5,1,1,54,140],
  ['rug','inside',4,2,6,3,2,192,128],
  ['threshold','inside',4,2,7,1,1,64,32],
];
const props = {};
for (const [id, name, cols, rows, index, w, h, artW, artH] of specs) {
  const width = w * 64 + 64, height = h * 64 + 128, pivot = [width / 2, height - 32];
  const src = name === 'house' ? sharp(path.join(source, 'house.png')) : await cell(name, cols, rows, index);
  const image = await (await trimmed(src)).resize(artW, artH, { fit: 'fill', kernel: 'nearest' }).png().toBuffer();
  await transparent(width, height).composite([{ input: image, left: Math.round((width - artW) / 2), top: pivot[1] - artH }]).png({palette:true,colours:128,dither:0}).toFile(path.join(output, `${id}.png`));
  props[id] = { image: `${id}.png`, canvas: [width,height], pivot, footprint: [w,h], groundY: pivot[1] };
}
await fs.writeFile(path.join(output, 'manifest.json'), JSON.stringify({
  visualVersion: 'farm-detail-v1', artPixelsPerWorldUnit: 2, worldTile: 32, artTile: 64,
  character: { image: 'character-base.png', frame: [64,128], sheet: [320,512], rows: ['down','left','right','up'], columns: ['idle','walk-contact-a','walk-pass-a','walk-contact-b','walk-pass-b'], pivot:[32,120], headAnchors },
  hair: { image: 'hair.png', frame:[64,64], styles:['crop','curls','bob','ponytail'], rows:['down','left','right','up'] },
  terrain: { image:'terrain.png', frame:[64,64], tiles:['grass-a','grass-b','grass-c','path','water-a','water-b','floor','perimeter','soil','wet-soil','wall','decking'] },
  props, source: 'Original built-in image generation; retained PNG sources/prompts. Normalized with nearest sampling; customization is composed in farm-avatar.ts.'
}, null, 2)+'\n');
console.log(`Exported character/hair, 12 terrain tiles and ${specs.length} props to ${output}`);
