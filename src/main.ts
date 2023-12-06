import { Application, Router } from "https://deno.land/x/oak@v12.6.1/mod.ts";
import { setTimerCallback, TimerListener } from './timer.ts';
import { subListener, subGifedListener} from "./eventListener.ts";

const commandPageSize = 100;
const commands: {[key: string]: Command} = {};

const app = new Application();
const port = 8080;
const router = new Router();

let timerConnected = false;

// const routes: Route = {
//   'msg': msgListener,
//   'timer': TimerListener,
//   'sub': subListener,
//   'subGifed': subGifedListener,
//   'massSubGifted': massSubGiftedListener,
//   'cheer': cheerListener,
//   'tip': tipListener,
// }

router.get('/msg',(ctx) => {
  commands['Send Message'].send([ctx.request.url.searchParams.get('text')??'blank']);
})
router.get('/timer/start_websocket', (ctx) => {
  const socket = ctx.upgrade();
  if (timerConnected) {
    socket.close(1008, 'Timer is already running');
    return;
  }

  socket.onopen = () => {
    if (!timerConnected) {
      console.log('Timer Socket Conneted');
      timerConnected = true;
      setTimerCallback((timerDisplay: string) => socket.send(timerDisplay));
    }
  };

  socket.onclose = () => {
    if (timerConnected) {
      console.log('Timer Socket disconnected');
      timerConnected = false;
      setTimerCallback((timerDisplay: string) => console.log(timerDisplay));
    }
  };
})
router.get('/timer/:file?', (ctx) => {
  const url = ctx.request.url;
  const filename = ctx?.params?.file ?? '';
  const timerOption = url.searchParams.get('option');
  const amountString = url.searchParams.get('amount')??'0';
  const amount = parseInt(amountString);
  const filePath = TimerListener(filename, timerOption, amount);
  if (filePath) {
    return ctx.send({root: `${Deno.cwd()}/widgets/timer`, path:filePath});
  }
})
router.get('/sub', (ctx) => {
  const user = ctx.request.url.searchParams.get('user') ?? 'Blank';
  subListener(user);
})
router.get('/subGifted', (ctx) => {
  const user = ctx.request.url.searchParams.get('user') ?? 'Blank';
  subGifedListener(user);
})


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

setTimerCallback((timerDisplay: string) => console.log(timerDisplay));
// setTimerCallback((timerDisplay: string) => commands['Send Message'].send([timerDisplay]))
ensureMixItUpConnection().then(() => {
  getCommands().then(() => {
    // console.log(Object.keys(commands));
    // console.log(commands)
  });
})


app.use(router.routes());
app.use(router.allowedMethods());

console.log("Listening at http://localhost:" + port);
await app.listen({ port });