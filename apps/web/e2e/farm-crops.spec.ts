import {test,expect} from "@playwright/test";
import {CROP_PILOT_CATALOG} from "@bmt/shared";
import {A,B,backend,ready,makeFarm,session} from "./farm-fixture";
async function cropMenu(page:import('@playwright/test').Page){await page.getByRole('button',{name:'Crops',exact:true}).click();return page.getByRole('dialog');}
async function owned(page:import('@playwright/test').Page){const b=await backend(page,true);await page.goto('/farm');await ready(page);await expect(page.getByTestId('crop-overview')).toContainText('6 mystery seeds');return b;}

test('saved crop grows offline, stays hidden until ready, then can be harvested, kept, stored and sold',async({page},info)=>{
 const b=await owned(page);let dialog=await cropMenu(page),p1=dialog.getByTestId('plot-1');
 await p1.getByRole('button',{name:'Plant 1 seed',exact:true}).click();await expect(p1).toContainText('needs water');
 await p1.getByRole('button',{name:'Water once',exact:true}).click();await expect(p1).toContainText('24 hours');
 await expect(p1).not.toContainText('Tomato');expect(b.cropStates.get(A)!.plots[0]!.crop!.reveal).toBeNull();
 const id=b.cropStates.get(A)!.plots[0]!.crop!.id;
 await page.keyboard.press('Escape');await page.reload();await ready(page);dialog=await cropMenu(page);
 await expect(dialog.getByTestId('plot-1')).toContainText('No more watering needed');
 expect(b.cropStates.get(A)!.plots[0]!.crop!.id).toBe(id);
 const c=b.cropStates.get(A)!.plots[0]!.crop!;c.watered_at=new Date(Date.now()-90000000).toISOString();c.ready_at=new Date(Date.now()-10000).toISOString();
 await dialog.getByRole('button',{name:'Refresh crops',exact:true}).click();
 await dialog.getByRole('button',{name:'Harvest Tomato',exact:true}).click();await expect(dialog.getByTestId('plot-1')).toContainText('Empty plot');
 await dialog.getByRole('button',{name:'Bag',exact:true}).click();await expect(dialog).toContainText('Tomato × 1');
 await dialog.getByRole('button',{name:'Store in chest',exact:true}).click();await expect(dialog).toContainText('No harvested produce');
 await dialog.getByRole('button',{name:'House chest',exact:true}).click();await expect(dialog).toContainText('Tomato × 1');
 await page.keyboard.press('Escape');await page.reload();await ready(page);dialog=await cropMenu(page);await dialog.getByRole('button',{name:'House chest',exact:true}).click();
 await expect(dialog).toContainText('Tomato × 1');await dialog.getByRole('button',{name:'Return to bag',exact:true}).click();
 await dialog.getByRole('button',{name:'Sell',exact:true}).click();await dialog.getByRole('button',{name:'Sell 1 for 14 coins',exact:true}).click();
 await expect(dialog).toContainText('This uses that produce');await dialog.getByRole('button',{name:'Keep it',exact:true}).click();expect(b.cropStates.get(A)!.coins).toBe(90);
 await dialog.getByRole('button',{name:'Sell 1 for 14 coins',exact:true}).click();await dialog.getByRole('button',{name:'Confirm sale',exact:true}).click();
 await expect(dialog.getByTestId('crop-wallet')).toContainText('104 Lime Coins');expect(b.cropStates.get(A)!.goods).toHaveLength(0);
 await page.screenshot({path:info.outputPath('crop-sale.png'),fullPage:true});
});

test('a lost watering response retains its original request through refresh and retries just once',async({page})=>{
 const b=await owned(page),dialog=await cropMenu(page),p1=dialog.getByTestId('plot-1');
 await p1.getByRole('button',{name:'Plant 1 seed',exact:true}).click();await expect(p1.getByRole('button',{name:'Water once',exact:true})).toBeEnabled();
 b.dropCrop=true;await p1.getByRole('button',{name:'Water once',exact:true}).click();
 await expect(dialog.getByRole('button',{name:'Retry crop action',exact:true})).toBeVisible();
 const stamp=b.cropStates.get(A)!.plots[0]!.crop!.ready_at;
 await dialog.getByRole('button',{name:'Refresh crops',exact:true}).click();
 await expect(dialog.getByRole('button',{name:'Retry crop action',exact:true})).toBeVisible();
 await expect(dialog.getByTestId('plot-2').getByRole('button',{name:'Plant 1 seed',exact:true})).toBeDisabled();
 await dialog.getByRole('button',{name:'Retry crop action',exact:true}).click();await expect(dialog).toContainText('Watered.');
 const calls=b.calls.filter(c=>c.name==='bmt_farm_crop_action' && c.args.p_action.kind==='water');expect(calls).toHaveLength(2);expect(calls[0]!.args).toEqual(calls[1]!.args);
 expect(b.cropStates.get(A)!.plots[0]!.crop!.ready_at).toBe(stamp);expect(b.cropStates.get(A)!.seed_quantity).toBe(5);
});

test('a lost sale response retries its immutable quote without a second coin credit',async({page})=>{
 const b=await owned(page),s=b.cropStates.get(A)!;s.goods=[{...CROP_PILOT_CATALOG[0]!,location:'bag',quantity:1}];
 const dialog=await cropMenu(page);await dialog.getByRole('button',{name:'Refresh crops',exact:true}).click();await dialog.getByRole('button',{name:'Sell',exact:true}).click();
 await dialog.getByRole('button',{name:'Sell 1 for 14 coins',exact:true}).click();b.dropCrop=true;await dialog.getByRole('button',{name:'Confirm sale',exact:true}).click();
 await expect(dialog.getByRole('button',{name:'Retry crop action',exact:true})).toBeVisible();expect(s.coins).toBe(104);
 await dialog.getByRole('button',{name:'Retry crop action',exact:true}).click();await expect(dialog.getByTestId('crop-wallet')).toContainText('104 Lime Coins');
 const calls=b.calls.filter(c=>c.name==='bmt_farm_crop_action' && c.args.p_action.kind==='sell');expect(calls).toHaveLength(2);expect(calls[0]!.args).toEqual(calls[1]!.args);expect(s.goods).toHaveLength(0);
});

test('crop conflicts need refresh, and purchases disclose odds/price without repeating the daily seed grant',async({page})=>{
 const b=await owned(page),dialog=await cropMenu(page);b.cropStates.get(A)!.revision++;
 await dialog.getByTestId('plot-1').getByRole('button',{name:'Plant 1 seed',exact:true}).click();await expect(dialog.getByRole('alert')).toContainText('another tab');
 await expect(dialog.getByTestId('plot-2').getByRole('button',{name:'Plant 1 seed',exact:true})).toBeDisabled();
 await dialog.getByRole('button',{name:'Refresh crops',exact:true}).click();await dialog.getByRole('button',{name:'Seeds',exact:true}).click();
 await expect(dialog).toContainText('75% chance');await expect(dialog).toContainText('25% chance');await expect(dialog).toContainText('24 hours');
 await dialog.getByRole('button',{name:'Buy 1 seed for 10 coins',exact:true}).click();await expect(dialog.getByTestId('crop-wallet')).toContainText('80 Lime Coins · 7 mystery seeds');
 await dialog.getByRole('button',{name:'Claim 2 free seeds',exact:true}).click();await expect(dialog.getByRole('button',{name:'Today’s free seeds claimed',exact:true})).toBeDisabled();
 await expect(dialog.getByTestId('crop-wallet')).toContainText('9 mystery seeds');
});

test('changing the device clock cannot reveal a saved crop or enable harvest',async({page})=>{
 await owned(page);const dialog=await cropMenu(page),p1=dialog.getByTestId('plot-1');
 await p1.getByRole('button',{name:'Plant 1 seed',exact:true}).click();await p1.getByRole('button',{name:'Water once',exact:true}).click();
 await expect(p1).toContainText('No more watering needed');
 await page.clock.setFixedTime(new Date('2040-01-01T00:00:00Z'));await dialog.getByRole('button',{name:'Refresh crops',exact:true}).click();
 await expect(p1).toContainText('No more watering needed');await expect(p1.getByRole('button',{name:/Harvest/})).toHaveCount(0);await expect(p1).not.toContainText('Tomato');
});

test('an account switch discards a pending crop request and ignores the old response',async({page})=>{
 const b=await owned(page);b.farms.set(B,makeFarm(B,'Second Farmer'));const dialog=await cropMenu(page);
 let release!:()=>void;b.holdCrop=new Promise<void>(r=>release=r);
 await dialog.getByTestId('plot-1').getByRole('button',{name:'Plant 1 seed',exact:true}).click();
 await expect.poll(()=>b.calls.filter(c=>c.name==='bmt_farm_crop_action').length).toBe(1);
 await page.evaluate(async(data)=>{const modulePath='/src/lib/supabase.ts';const {supabase}=await import(/* @vite-ignore */ modulePath);await supabase.auth.setSession({access_token:data.access_token,refresh_token:data.refresh_token});},session(B));
 await ready(page);await expect(page.getByRole('heading',{level:1})).toContainText('Second Farmer');release();await page.waitForTimeout(200);
 await expect(page.getByTestId('crop-overview')).toContainText('6 mystery seeds');expect(b.cropStates.get(B)!.plots.every(p=>!p.crop)).toBe(true);
});

test('crop-load failure is recoverable without automatic creation or spend',async({page})=>{
 const b=await backend(page,true);b.failCrops=true;await page.goto('/farm');await ready(page);const dialog=await cropMenu(page);
 await expect(dialog.getByRole('alert')).toBeVisible();expect(b.calls.some(c=>c.name==='bmt_farm_crop_action')).toBe(false);
 b.failCrops=false;await dialog.getByRole('button',{name:'Refresh crops',exact:true}).click();
 await expect(dialog.getByTestId('plot-1').getByRole('button',{name:'Plant 1 seed',exact:true})).toBeEnabled();
});

test('quick crop demo shows growth/reveal/action art and never calls an economic API',async({page},info)=>{
 test.setTimeout(60000);const rpc:string[]=[];page.on('request',r=>{if(r.url().includes('/rpc/'))rpc.push(r.url());});
 await page.clock.install();await page.goto('/farm/demo');await ready(page);const dialog=await cropMenu(page),p1=dialog.getByTestId('plot-1');
 await expect(dialog).toContainText('45 seconds');await p1.getByRole('button',{name:'Plant 1 seed',exact:true}).click();await p1.getByRole('button',{name:'Water once',exact:true}).click();
 await page.clock.fastForward(46000);await expect(p1.getByRole('button',{name:/Harvest/})).toBeEnabled();
 await page.keyboard.press('Escape');await page.getByRole('navigation',{name:'Preview jump points'}).getByRole('button',{name:'Plot 1',exact:true}).click();
 await page.screenshot({path:info.outputPath('ripe-crop-demo.png'),fullPage:true});
 await page.getByTestId('farm-world').focus();await page.keyboard.press('e');await page.getByRole('dialog').getByRole('button',{name:/Harvest/}).click();
 await expect(page.getByRole('dialog')).toHaveCount(0);await page.clock.fastForward(1000);
 await page.getByRole('button',{name:'Bag',exact:true}).click();await expect(page.getByRole('dialog')).toContainText(/Tomato × 1|Hot pepper × 1/);expect(rpc).toEqual([]);
});
