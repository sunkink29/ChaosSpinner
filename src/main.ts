import { setTimerCallback, TimerListener } from './timer.ts';
import { subListener, subGifedListener, massSubGiftedListener, cheerListener, tipListener } from "./eventListener.ts";

const hostname = 'localhost';
const port = 29763;
const commandPageSize = 100;
const commands: {[key: string]: Command} = {};


type Route = {[key: string]: (searchParams: URLSearchParams) => void}
const routes: Route = {
  '/msg': msgListener,
  '/timer': TimerListener,
  '/sub': subListener,
  '/subGifed': subGifedListener,
  '/massSubGifted': massSubGiftedListener,
  '/cheer': cheerListener,
  '/tip': tipListener,
}

function msgListener(searchParams: URLSearchParams) {
  commands['Send Message'].send([searchParams.get('text')??'blank']);
};

class Command {
  id: string;
  name: string;
  type: string;
  isEnabled: boolean;
  unlocked: boolean;
  groupName: string;

  constructor(
    obj: {
      ID: string; 
      Name: string; 
      Type: string;
      IsEnabled: boolean;
      Unlocked: boolean;
      GroupName: string;
    }
  ) {
    this.id = obj.ID;
    this.name = obj.Name;
    this.type = obj.Type;
    this.isEnabled = obj.IsEnabled;
    this.unlocked = obj.Unlocked;
    this.groupName = obj.GroupName;
  };

  send(args: string[]) {
    const url = `http://localhost:8911/api/v2/commands/${this.id}`;
    const response = fetch(url, {
      method: 'POST',
      headers: {"Content-Type": "application/json",},
      body: JSON.stringify({
        Platform: 'Twitch',
        Arguments: args.join(' | ')
      }),
    })
    response.then((res) => {
      if (res.status != 200) {
        console.log(res.status, url);
      }
    }).catch(()=> {
      console.error("Mix It Up is not currnetly running or the developer api service is not enabled");
    });
  }
}

async function getCommands() {
  // deno-lint-ignore no-explicit-any
  let rawCommands: any[] = [];
  let requestCommands = true;
  for (let i = 0; requestCommands && i < 10; i++) {
    const response = await fetch(`http://localhost:8911/api/v2/commands?skip=${i*commandPageSize}&pageSize=${commandPageSize}`, {method: 'GET'});
    const body = await response.json();
    rawCommands = rawCommands.concat(body.Commands);
    if (body.TotalCount <= commandPageSize) {
      requestCommands = false;
    }
  }
  rawCommands.forEach(elem => {
    commands[elem.Name] = new Command(elem)
  });
}

async function ensureMixItUpConnection() {
  while (true) {
    try {
      await fetch(`http://localhost:8911/api/v2/status/version`, {method: 'GET'});
    } catch (_e) {
      console.error("Mix It Up is not currnetly running or the developer api service is not enabled");
      alert("Press enter to try to connect to Mix It Up again");
      console.log("\n");
    }
    break;
  }
  console.log("Connected to Mix It Up");

  setInterval(() => { // check to see if mix it up is still connected
    const response = fetch(`http://localhost:8911/api/v2/status/version`, {method: 'GET'});
    response.catch(() => {
      console.error("Mix It Up is not currnetly running or the developer api service is not enabled");
    })
  }, 1000*60)
}

function handler(req: Request) {
  const url = new URL(req.url);
  url.searchParams
  const route = routes[url.pathname];
  if (route) {
    route(url.searchParams);
  } else {
    console.error(`Could not find route ${url.pathname}`);
  }
  return new Response();
}

setTimerCallback((timerDisplay: string) => console.log(timerDisplay));
// setTimerCallback((timerDisplay: string) => commands['Send Message'].send([timerDisplay]))
ensureMixItUpConnection().then(() => {
  getCommands().then(() => {
    // console.log(Object.keys(commands));
    // console.log(commands)
  });
})
Deno.serve({port, hostname, handler});