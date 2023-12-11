type Config = {
  subTime: number,
  bitMinimum: number,
  bitTime: number,
  tipMinimum: number,
  tipTime: number,
  maxDuration: number,
  initialDuration: number,
  timerAutoSaveFreq: number,
}

const defaultConfig: Config = {
  subTime: 5,
  bitMinimum: 500,
  bitTime: 5,
  tipMinimum: 5,
  tipTime: 5,
  maxDuration: 400,
  initialDuration: 1,
  timerAutoSaveFreq: 5,
}
export const config: Config = await readConfig();

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