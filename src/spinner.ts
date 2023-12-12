import { Router } from "https://deno.land/x/oak@v12.6.1/mod.ts";
import { config } from "./config.ts";

export type Spinner = {
  size: number
  innerRadius: number
  textSize: number
  pins: number
  duration: number
  spins: number
  wheelImage: string
  segments: {
    label: string
    color: string
    weight: number
    command: string
    args: string[]
  }[];
}

const files: {[key: string]:string} = {
  "style.css" : "/style.css",
  "main.js"   : "/main.js"
}

const sockets:  {[key: string]:WebSocket | undefined} = {};

// deno-lint-ignore no-explicit-any
export function initalizeSpinnerRoutes(router: Router<Record<string,any>>) {
  router.get('/spinner/websocket', (ctx) => {

    const name = ctx.request.url.searchParams.get('name');
    if (name === null) {
      console.log("Error: Websocket doesn't have a name (This shouldn't happen)");
      return;
    } else if (sockets[name] !== undefined) {
      console.log(`Error: Spinner with name ${name} is already connected`);
      return;
    } else if (config.spinnerConfig[name] === undefined) {
      console.log(`Error: Spinner named ${name} does not exist in the config`);
      return;
    }

    const socket = ctx.upgrade();
  
    socket.onopen = () => {
      console.log(`${name} (Spinner) Socket Conneted`);
      sockets[name] = socket;
      const event = {
        type: "config",
        config: config.spinnerConfig[name],
      }
      socket.send(JSON.stringify(event));
    };
  
    socket.onclose = () => {
      console.log(`${name} (Spinner) Socket disconnected`);
      sockets[name] = undefined;
    };
  });

  router.get('/spinner/:file?', async (ctx) => {
    const url = ctx.request.url;
    const option = url.searchParams.get('option')?? '';
    let name = url.searchParams.get('name');
    if (option === '') {
      const filename = ctx?.params?.file ?? '';
      if (filename === '') {
        if (name === null) {
          console.log("Error: Spinner url doesn't have spinner name param");
          return;
        }
        let html = await Deno.readTextFile(`${Deno.cwd()}/widgets/spinner/index.html`);
        html = html.replace('$name', name);
        ctx.response.type = "html";
        ctx.response.body = html;
      }
      const filePath = files[filename]
      if (filePath) {
        return ctx.send({root: `${Deno.cwd()}/widgets/spinner`, path:filePath});
      }
    } else if (option === 'spin') {
      name = name?.replace('+', ' ') ?? null;
      if (name === null) {
        console.log(`Error: Spin command does not contain name`);
        return
      } else if (sockets[name] === undefined) {
        console.log(`Error: Can't spin spinner with name "${name}" as it is not connected`);
      }

      const event = {
        type: "spin"
      }
      sockets[name]?.send(JSON.stringify(event));
    }
  });
}

export function updateSpinnerConfigs() {
  Object.keys(sockets).forEach((name) => {
    const event = {
      type: "config",
      config: config.spinnerConfig[name],
    }
    sockets[name]?.send(JSON.stringify(event));
  })
}


/*
 {
    "wheel1": {
      "size": 412,
      "innerRadius": 70,
      "textSize": 20,
      "pins": 30,
      "duration": 3,
      "spins": 5,
      "wheelImage": "",
      "segments": [
        {"label":"Wheel1","color":"#ff0000","weight":1,"command": "spin","args": ["wheel 2", "$name"]},
        {"label":"Wheel2","color":"#00ff00","weight":1,"command": "spin","args": ["wheel 3", "$name"]}
      ]
  }}
*/