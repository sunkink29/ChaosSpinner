import { Application, Router } from "https://deno.land/x/oak@v12.6.1/mod.ts";
import { setTimerDisplayCallback, renderTimeString, timerRouter } from './timer.ts';
import { getCommands, commands, RunCommandStringWithContext } from "./commands.ts";
import { spinnerRouter } from "./spinner.ts";
import { configRouter } from "./config.ts";

const app = new Application();
const port = 29763;
const router = new Router();


router.get('/msg',(ctx) => {
  commands['Send Message'].send([ctx.request.url.searchParams.get('text')??'blank'], {});
})


async function ensureMixItUpConnection() {
  while (true) {
    try {
      await fetch(`http://localhost:8911/api/v2/status/version`, {method: 'GET'});
    } catch {
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
  }, 1000*60);
}

setTimerDisplayCallback((time: number) => console.log(renderTimeString(time)));
// setTimerCallback((timerDisplay: string) => commands['Send Message'].send([timerDisplay]))
ensureMixItUpConnection().then(() => {
  getCommands().then(() => {
    // console.log(Object.keys(commands));
    // console.log(commands)
    // RunCommandStringWithContext("run('Send Message', a-b); run('Send Message', a+b)", {a: '1', b: '2'})
  });
})

router.use('/timer', timerRouter.routes());
router.use('/spinner', spinnerRouter.routes());
router.use('/config', configRouter.routes())
app.use(router.routes());
app.use(router.allowedMethods());

console.log("Listening at http://localhost:" + port);
await app.listen({ port });