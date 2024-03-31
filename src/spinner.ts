import { Router } from "https://deno.land/x/oak@v12.6.1/mod.ts";
import { config } from "./config.ts";
import { Command, addCommand, RunCommandStringWithContext } from "./commands.ts";

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
  }[];
}

const files: {[key: string]:string} = {
  "style.css" : "/style.css",
  "main.js"   : "/main.js"
}

export const spinnerRouter = new Router();

addCommand('spinner', new Command({
  ID: '',
  Name: 'Spinner',
  Type: 'custom',
  IsEnabled: true,
  Unlocked: false,
  GroupName: '',
  sendFunc: spinnerCommands
}))

const sockets:  {[key: string]:WebSocket | undefined} = {};

spinnerRouter.get('/websocket', (ctx) => {
  const name = ctx.request.url.searchParams.get('name');
  if (!name) {
    console.log("Error: Websocket doesn't have a name (This shouldn't happen)");
    return;
  } else if (sockets[name]) {
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

  socket.onmessage = (ev) => {
    const message = JSON.parse(ev.data);
    const command = config.spinnerConfig[name].segments[message.result-1].command;
    RunCommandStringWithContext(command, message.context);
  }
});

spinnerRouter.get('/:file?', async (ctx) => {
  const url = ctx.request.url;
  const option = url.searchParams.get('option');
  const name = url.searchParams.get('name');
  if (!option) {
    const filename = ctx?.params?.file;
    if (!filename) {
      if (!name) {
        console.log("Error: Spinner url doesn't have spinner name param");
        return;
      }
      let html = await Deno.readTextFile(`${Deno.cwd()}/widgets/spinner/index.html`);
      html = html.replace('$name', name);
      ctx.response.type = "html";
      ctx.response.body = html;
      return;
    }
    const filePath = files[filename]
    return ctx.send({root: `${Deno.cwd()}/widgets/spinner`, path:filePath});
  }
  const context = Object.fromEntries(ctx.request.url.searchParams.entries());
  spinnerCommands([option, name??''], context)
});

function spinnerCommands(args: string[], context?: {[k: string]: string}) {
  const [option, name] = args;

  if (!name){
    console.log(`Error: Spinner command does not contain name`);
    return
  }

  const newName = name.replace('+', ' ');
  if (!sockets[newName]) {
    console.log(`Error: Can't run comand on spinner with name "${newName}" as it is not connected`);
  }

  if (option === 'spin') {
    const event = {
      type: "spin",
      context,
    }
    sockets[newName]?.send(JSON.stringify(event));
  } else if (option === 'disconnect') {
    sockets[newName]?.close();
  }
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