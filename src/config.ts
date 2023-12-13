import { Router } from "https://deno.land/x/oak@v12.6.1/mod.ts";
import { Spinner, updateSpinnerConfigs } from "./spinner.ts";

type Config = {
  initialDuration: number
  timerAutoSaveFreq: number
  spinnerConfig: {[key: string]: Spinner}
}

const defaultConfig: Config = {
  initialDuration: 1,
  timerAutoSaveFreq: 5,
  spinnerConfig: {
    "wheel 1": {
      "size": 412,
      "innerRadius": 70,
      "textSize": 20,
      "pins": 30,
      "duration": 3,
      "spins": 5,
      "wheelImage": "",
      "segments": [
        {"label":"Wheel1","color":"#ff0000","weight":1,"command": "spinner","args": ["spin" ,"wheel 2", "$name"]},
        {"label":"Wheel2","color":"#00ff00","weight":1,"command": "spinner","args": ["spin" ,"wheel 3", "$name"]}
      ]
  }}
}
export let config: Config = await readConfig();
export const configRouter = new Router();

async function readConfig(): Promise<Config> {
  let text: string;
  try {
    text = await Deno.readTextFile("./config.json");
  } catch {
    await Deno.writeTextFile("./config.json", JSON.stringify(defaultConfig));
    return defaultConfig;
  }
  const parsedText = JSON.parse(text);
  if (Object.keys(parsedText).length != Object.keys(defaultConfig).length) {
    console.log('Error: Incorrect number of config options')
    await Deno.writeTextFile("./defaultConfig.json", JSON.stringify(defaultConfig));
    return defaultConfig;
  }
  return parsedText as Config;  // Make sure to check to make sure the config is correct
}

configRouter.get('/', async (ctx) => {
  const option = ctx.request.url.searchParams.get('option')?? '';
  if (option === 'update') {
    config = await readConfig();
    updateSpinnerConfigs();
    console.log("Config updated");
  }
});