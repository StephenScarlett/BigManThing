import test from 'node:test';
import assert from 'node:assert/strict';
import { homeFootprint, homePlacementError } from '../dist/index.js';

const furniture={id:'wide',label:'Wide seat',kind:'furniture',width:3,height:1,layer:1};
const chair={...furniture,id:'seat',width:1};
const rug={...furniture,id:'rug',width:2,height:2,layer:0};
const catalog=[furniture,chair,rug];
const at=(item,x,y,rotation=0,id=item)=>({instance_id:id,item_id:item,x,y,rotation});

test('placement uses the rotated footprint at the room edge, not just the selected tile',()=>{
  assert.deepEqual(homeFootprint(furniture,{rotation:1}),{w:1,h:3});
  assert.match(homePlacementError(at('wide',7,5),[],catalog),/outside/);
  assert.equal(homePlacementError(at('wide',7,5,1),[],catalog),null);
  assert.match(homePlacementError(at('wide',7,6,1),[],catalog),/outside/);
});
test('movement ignores its own old instance, but prevents solid overlap and permits rugs underneath',()=>{
  const existing=[at('seat',2,2,0,'one'),at('seat',3,2,0,'two'),at('rug',0,0)];
  assert.equal(homePlacementError(at('seat',0,0,0,'one'),existing,catalog),null);
  assert.match(homePlacementError(at('seat',3,2,0,'one'),existing,catalog),/already/);
  assert.equal(homePlacementError(at('seat',4,2,0,'one'),existing,catalog),null);
  assert.match(homePlacementError(at('rug',1,1,0,'second-rug'),existing,catalog),/already/);
});
test('invalid preview coordinates or unknown items cannot become placements',()=>{
  assert.match(homePlacementError(at('unknown',0,0),[],catalog),/Choose furniture/);
  for(const [x,y] of [[-1,0],[0,-1],[0,8],[.5,0],[NaN,0]])assert.match(homePlacementError(at('seat',x,y),[],catalog),/outside/);
});
