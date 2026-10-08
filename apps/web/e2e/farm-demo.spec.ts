import { test, expect, type Page } from "@playwright/test";

const position = async (page: Page) => {
  const result = page.getByTestId("farm-position");
  return { x: Number(await result.getAttribute("data-x")), y: Number(await result.getAttribute("data-y")) };
};
async function start(page: Page) {
  await page.goto("/farm/demo");
  await expect(page.getByRole("button", { name: "Character", exact: true })).toBeEnabled();
  await expect(page.locator(".farm-viewport canvas")).toHaveCount(1);
  await page.getByTestId("farm-world").focus();
}

test.beforeEach(async ({ page }) => {
  await page.route("http://127.0.0.1:9/**", route => route.abort());
});

test("no login, one canvas, safe enter/exit and no E-key repeat loop", async ({ page }, testInfo) => {
  const errors: string[] = [], economic: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("request", request => { if (request.url().includes("/rest/v1/rpc/")) economic.push(request.url()); });
  await start(page);
  await page.keyboard.down("e");
  await expect(page.getByTestId("farm-location")).toContainText("Your house");
  await page.keyboard.down("e");
  await page.waitForTimeout(250);
  await expect(page.getByTestId("farm-location")).toContainText("Your house");
  await page.keyboard.up("e");
  await page.keyboard.press("e");
  await expect(page.getByTestId("farm-location")).toContainText("The yard");
  for (let i = 0; i < 2; i++) {
    await page.keyboard.press("e"); await expect(page.getByTestId("farm-location")).toContainText("Your house");
    await page.keyboard.press("e"); await expect(page.getByTestId("farm-location")).toContainText("The yard");
  }
  await page.screenshot({ path: testInfo.outputPath("farm.png"), fullPage: true });
  expect(errors).toEqual([]); expect(economic).toEqual([]);
});

test("movement, walls, blur release and pause", async ({ page }) => {
  await start(page);
  const before = await position(page);
  await page.keyboard.down("d");
  await expect.poll(async () => (await position(page)).x).toBeGreaterThan(before.x + 12);
  await page.keyboard.up("d");
  await page.getByRole("navigation", { name: "Preview jump points" }).getByRole("button", { name: "House door", exact: true }).click();
  await page.keyboard.down("ArrowUp"); await page.waitForTimeout(600); await page.keyboard.up("ArrowUp");
  expect((await position(page)).y).toBeGreaterThanOrEqual(614);
  await page.keyboard.down("d"); await page.waitForTimeout(200);
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await page.waitForTimeout(200); const stopped = await position(page);
  await page.waitForTimeout(250); expect(await position(page)).toEqual(stopped); await page.keyboard.up("d");
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(page.getByTestId("farm-position")).toHaveAttribute("data-paused", "true");
  const paused = await position(page); await page.keyboard.down("d"); await page.waitForTimeout(250); await page.keyboard.up("d");
  expect(await position(page)).toEqual(paused);
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await expect(page.getByTestId("farm-position")).toHaveAttribute("data-paused", "false");
});

test("menus trap focus, release movement, preserve typing and restore focus", async ({ page }) => {
  await start(page);
  await page.keyboard.down("d");
  await page.getByRole("button", { name: "Character", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  const stopped = await position(page);
  await page.getByLabel("Nickname (preview only)").fill("WASD farmer");
  await page.keyboard.press("ArrowRight"); await page.keyboard.press("e"); await page.waitForTimeout(250);
  expect(await position(page)).toEqual(stopped);
  await page.getByRole("button", { name: "shirt colour 2" }).click();
  await expect(page.getByRole("button", { name: "shirt colour 2" })).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Character", exact: true })).toBeFocused();
  await page.keyboard.up("d"); await page.waitForTimeout(250);
  expect(await position(page)).toEqual(stopped);
});

test("touch directions release both fingers on cancellation", async ({ page }) => {
  await start(page);
  const up = page.getByRole("button", { name: "Move down", exact: true }), right = page.getByRole("button", { name: "Move right", exact: true });
  await up.scrollIntoViewIfNeeded();
  const a = (await up.boundingBox())!, b = (await right.boundingBox())!;
  const finger1 = { id: 1, x: a.x + a.width / 2, y: a.y + a.height / 2 }, finger2 = { id: 2, x: b.x + b.width / 2, y: b.y + b.height / 2 };
  const cdp = await page.context().newCDPSession(page), before = await position(page);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [finger1, finger2] });
  await expect.poll(async () => (await position(page)).x).toBeGreaterThan(before.x + 8);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchCancel", touchPoints: [] });
  await page.waitForTimeout(200); const stopped = await position(page); await page.waitForTimeout(250);
  expect(await position(page)).toEqual(stopped); await cdp.detach();
});

test("resizing and route round trips retain one renderer and no economic calls", async ({ page }) => {
  const errors: string[] = [], economic: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("request", request => { if (request.url().includes("/rest/v1/rpc/")) economic.push(request.url()); });
  await start(page);
  for (const size of [{ width: 320, height: 740 }, { width: 900, height: 600 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(size);
    await expect.poll(async () => Math.round((await page.locator(".farm-viewport canvas").boundingBox())!.width)).toBeLessThanOrEqual(size.width);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(size.width);
  }
  for (let i = 0; i < 3; i++) {
    await page.getByRole("link", { name: "Room collection preview" }).click();
    await expect(page.locator(".farm-viewport canvas")).toHaveCount(0);
    await page.getByRole("link", { name: "Try the walkable farm preview" }).click();
    await expect(page.getByRole("button", { name: "Character", exact: true })).toBeEnabled();
    await expect(page.locator(".farm-viewport canvas")).toHaveCount(1);
  }
  expect(errors).toEqual([]); expect(economic).toEqual([]);
});

test("Canvas fallback draws the world and keeps the dock outside blocked water", async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...args: unknown[]) {
      if (["webgl", "webgl2", "experimental-webgl"].includes(type)) return null;
      return Reflect.apply(original, this, [type, ...args]);
    } as typeof original;
  });
  await start(page);
  await page.getByRole("navigation", { name: "Preview jump points" }).getByRole("button", { name: "Fishing dock", exact: true }).click();
  const startPoint = await position(page);
  await page.keyboard.down("ArrowRight"); await page.waitForTimeout(650); await page.keyboard.up("ArrowRight");
  const end = await position(page); expect(end.x).toBeGreaterThan(startPoint.x); expect(end.x).toBeLessThanOrEqual(1242);
  expect(await page.locator(".farm-viewport canvas").evaluate(canvas => {
    const context = (canvas as HTMLCanvasElement).getContext("2d")!;
    const data = context.getImageData(0, 0, (canvas as HTMLCanvasElement).width, (canvas as HTMLCanvasElement).height).data;
    const colours = new Set<number>(); for (let i = 0; i < data.length; i += 128) colours.add((data[i]! << 16) + (data[i + 1]! << 8) + data[i + 2]!);
    return colours.size;
  })).toBeGreaterThan(10);
});

test("detailed art loads and starter customization changes the aligned four-facing rig", async ({ page }, testInfo) => {
  const errors:string[]=[]; page.on("pageerror",error=>errors.push(error.message));
  await start(page);
  await expect(page.getByText("Some artwork could not load",{exact:false})).toHaveCount(0);
  const manifest=await (await page.request.get("/farm-art/v1/manifest.json")).json();
  expect(manifest.artPixelsPerWorldUnit).toBe(2); expect(manifest.character.frame).toEqual([64,128]);
  const stopped=await position(page);
  await page.getByRole("button",{name:"Character",exact:true}).click();
  await page.getByRole("button",{name:"Show idle",exact:true}).click();
  const preview=page.getByTestId("farm-character-preview");
  const signature=()=>preview.evaluate(element=>{
    const c=element as HTMLCanvasElement, data=c.getContext("2d")!.getImageData(0,0,c.width,c.height).data;
    let hash=2166136261; for(let i=0;i<data.length;i++) hash=Math.imul(hash^data[i]!,16777619);
    return hash>>>0;
  });
  await expect.poll(()=>preview.evaluate(element=>{
    const c=element as HTMLCanvasElement, data=c.getContext("2d")!.getImageData(0,0,c.width,c.height).data;
    let opaque=0; for(let i=3;i<data.length;i+=4) if(data[i]!>128) opaque++; return opaque;
  })).toBeGreaterThan(500);
  const select=async(label:string,value:string)=>{ const before=await signature(); await page.getByRole("combobox",{name:label,exact:true}).selectOption(value); await expect.poll(signature).not.toBe(before); };
  await select("Body build","broad"); await select("Body build","slim");
  for(const style of ["crop","curls","bob","bald","ponytail"]) await select("Hairstyle",style);
  await select("Eye shape","sharp"); await select("Top","work-shirt"); await select("Top","overshirt");
  await select("Bottoms","shorts"); await select("Hat","cap");
  for(const slot of ["skin","hair","shirt","eyes","pants","shoes","hat"]) {
    const before=await signature();
    await page.getByRole("button",{name:`${slot} colour ${slot==="hair"?3:2}`,exact:true}).click();
    await expect.poll(signature).not.toBe(before);
  }
  expect(await position(page)).toEqual(stopped);
  await preview.screenshot({path:testInfo.outputPath("character.png")});
  await page.keyboard.press("Escape"); await page.getByTestId("farm-world").focus(); await page.keyboard.press("e");
  await expect(page.getByTestId("farm-location")).toContainText("Your house");
  await page.screenshot({path:testInfo.outputPath("house.png"),fullPage:true});
  expect(errors).toEqual([]);
});

test("missing artwork has a readable fallback and does not break movement or doors", async({page})=>{
  const errors:string[]=[]; page.on("pageerror",error=>errors.push(error.message));
  await page.route("**/farm-art/v1/*.png",route=>route.abort());
  await start(page); await expect(page.getByRole("status").filter({hasText:"Some artwork could not load"})).toBeVisible();
  const before=await position(page); await page.keyboard.down("d");
  await expect.poll(async()=> (await position(page)).x).toBeGreaterThan(before.x+8); await page.keyboard.up("d");
  await page.getByRole("navigation",{name:"Preview jump points"}).getByRole("button",{name:"House door",exact:true}).click();
  await page.keyboard.press("e"); await expect(page.getByTestId("farm-location")).toContainText("Your house");
  expect(errors).toEqual([]);
});
