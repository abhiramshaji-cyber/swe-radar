import fs from "node:fs";
import path from "node:path";
import { type BrowserWindow, app } from "electron";

const STATE = `[
  "window " + document.querySelector('[aria-label="Time window"] [aria-checked=true]').textContent,
  "region " + document.querySelector('[aria-label="Region"] [aria-checked=true]').firstChild.textContent,
  "header " + document.querySelector(".count").textContent,
  "tabs " + [...document.querySelectorAll('[aria-label="Region"] button')].map((b) => b.textContent).join(" "),
  "unscored " + (document.querySelector(".scoring summary")?.textContent || 0),
  "issues " + (document.querySelector(".sources-btn .issues")?.textContent ?? 0),
  "cards " + [...document.querySelectorAll("main > ul.grid .card")].slice(0, 3).map((c) => c.querySelector(".card-meta").textContent.slice(0, 40) + " " + c.querySelector(".when").textContent).join(" / "),
].join(" | ")`;

const click = (group: string, i: number) =>
  `document.querySelectorAll('[aria-label="${group}"] button')[${i}].click()`;

export async function smoke(win: BrowserWindow) {
  const js = (code: string) => win.webContents.executeJavaScript(code);
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const shots = process.env.SWE_RADAR_SHOTS;
  const shot = async (name: string) =>
    shots &&
    fs.writeFileSync(
      path.join(shots, name + ".png"),
      (await win.webContents.capturePage()).toPNG(),
    );
  const busy = () => js("document.getElementById('refresh').disabled");
  const sweep = async (tag: string, windows: number[]) => {
    const tabs: number = await js(`document.querySelectorAll('[aria-label="Region"] button').length`);
    for (const w of windows)
      for (let g = 0; g < tabs; g++) {
        await js(click("Time window", w) + ";" + click("Region", g));
        await sleep(1500);
        const state = await js(STATE);
        console.log("smoke: " + tag + " | " + state);
        await shot(
          tag +
            "-" +
            state.split(" | ").slice(0, 2).join("-").replace(/\W+/g, "_"),
        );
      }
  };

  await sleep(2000);
  if (process.env.SWE_RADAR_SMOKE === "refresh")
    await js("document.getElementById('refresh').click()");
  const started = Date.now();
  let n = 0;
  let idle = 0;
  do {
    console.log(
      "smoke: live " +
        Math.round((Date.now() - started) / 1000) +
        "s | " +
        (await js(STATE)),
    );
    if (++n % 15 === 0) await sweep("mid", [4]);
    await sleep(2000);
    idle = (await busy()) ? 0 : idle + 1;
  } while (idle < 3);
  await sweep("end", [0, 1, 2, 3, 4, 5]);
  await js(click("Time window", 4));
  for (const control of ["Best first", "Newest first", "Show filtered"]) {
    await js(`document.querySelector('[aria-label="${control}"]')?.click()`);
    await sleep(250);
    console.log(
      "smoke: toggled " +
        control +
        " | " +
        (await js(STATE)) +
        " | filtered group " +
        (await js(
          "document.querySelectorAll('main > section.group .card').length",
        )),
    );
  }
  if (shots)
    fs.writeFileSync(
      path.join(shots, "logs.txt"),
      (await js("window.radar.logs()")).join("\n"),
    );
  app.quit();
}
