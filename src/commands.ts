const commandPageSize = 100;
export const commands: {[key: string]: Command} = {};

export class Command {
  id: string
  name: string
  type: string
  isEnabled: boolean
  unlocked: boolean
  groupName: string
  sendFunc: ((args: string[]) => Promise<void> | void) | undefined

  constructor(
    obj: {
      ID: string
      Name: string 
      Type: string
      IsEnabled: boolean
      Unlocked: boolean
      GroupName: string
      sendFunc: ((args: string[]) => Promise<void> | void) | undefined
    }
  ) {
    this.id = obj.ID;
    this.name = obj.Name;
    this.type = obj.Type;
    this.isEnabled = obj.IsEnabled;
    this.unlocked = obj.Unlocked;
    this.groupName = obj.GroupName;
    this.sendFunc = obj.sendFunc;
  };

  send(args: string[]) {
    if (this.sendFunc !== undefined) {
      this.sendFunc(args)?.then();
      return;
    }

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

export async function getCommands() {
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
    commands[elem.Name] = new Command(elem);
  });
}

export function addCommand(name: string, command: Command) {
  commands[name] = command;
}