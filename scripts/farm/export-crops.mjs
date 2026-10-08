// Normalize the retained generated crop pack to the approved two-pixel scale.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
const require=createRequire(import.meta.url);
const sharp=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'sharp'):'sharp');
const root=path.resolve(import.meta.dirname,'../..'),out=path.join(root,'apps/web/public/farm-art/crops-v1');
await fs.mkdir(out,{recursive:true});
// Measured source rectangles retain generous gutters around each object.
const specs=[
 ['seed', [64,116,294,372],128,128,72,94,64,112],
 ['sprout',[432,224,326,250],128,192,42,38,64,160],
 ['growing',[764,154,374,324],128,192,58,66,64,160],
 ['watering-can',[1144,170,392,314],128,128,94,82,64,112],
 ['tomato-plant',[20,520,389,448],128,192,82,104,64,160],
 ['pepper-plant',[412,520,406,446],128,192,78,108,64,160],
 ['tomato',[880,628,280,280],128,128,90,94,64,112],
 ['pepper',[1224,564,302,370],128,128,76,98,64,112],
];
const manifest={version:'crops-v1',artPixelsPerWorldUnit:2,light:'upper-left',source:'art/farm/crops-v1/source/crops.png',assets:{}};
// Preserve the exact generated PNG in smaller Git transport parts. A locally
// restored PNG is optional; both paths must match the retained checksum.
const sourcePath=path.join(root,manifest.source),sourceDir=path.dirname(sourcePath);
const sourceMeta=JSON.parse(await fs.readFile(path.join(sourceDir,'parts.json'),'utf8'));
let source;
try{source=await fs.readFile(sourcePath);}catch(error){
 if(error.code!=='ENOENT')throw error;
 source=Buffer.concat(await Promise.all(sourceMeta.parts.map(name=>fs.readFile(path.join(sourceDir,name)))));
}
if(source.length!==sourceMeta.bytes || createHash('sha256').update(source).digest('hex')!==sourceMeta.sha256)throw Error('Crop source checksum mismatch');
for(const [id,rect,w,h,fitW,fitH,cx,bottom] of specs){
 const [left,top,width,height]=rect;
 const {data,info}=await sharp(source).extract({left,top,width,height}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 let x0=width,y0=height,x1=0,y1=0;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const i=(y*width+x)*4;data[i+3]=data[i+3]>=160?255:0;
  if(data[i+3]){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
 }
 if(x1<x0)throw Error('Empty source '+id);
 const sprite=await sharp(data,{raw:info}).extract({left:x0,top:y0,width:x1-x0+1,height:y1-y0+1})
  .resize(fitW,fitH,{fit:'inside',kernel:'nearest'}).png().toBuffer();
 const m=await sharp(sprite).metadata();
 await sharp({create:{width:w,height:h,channels:4,background:'#00000000'}})
  .composite([{input:sprite,left:Math.round(cx-m.width/2),top:bottom-m.height}]).png().toFile(path.join(out,id+'.png'));
 manifest.assets[id]={file:id+'.png',width:w,height:h,pivot:[cx,bottom],extraction:rect,opaqueAlphaThreshold:160};
}
await fs.writeFile(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log('Exported eight aligned crop/tool assets.');
