import { Router } from "https://deno.land/x/oak@v12.6.1/mod.ts";
import { config } from './config.ts';
import { addCommand, Command } from "./commands.ts";

const files: {[key: string]:string} = {
  ""          : "/index.html",
  "style.css" : "/style.css",
  "main.js"   : "/main.js"
}

export const timerRouter = new Router();

addCommand('timer', new Command({
  ID: '',
  Name: 'timer',
  Type: 'custom',
  IsEnabled: true,
  Unlocked: false,
  GroupName: '',
  sendFunc: timerCommands
}))

let countDownTimer: number;
let timerId = 0;
let autoSaveId = 0;
let storedTime = 0;
let timerDisplayCallback : (time: number) => void;

let timerSocket: WebSocket | null = null;

timerRouter.get('/websocket', (ctx) => {
  if (timerSocket) {
    return;
  }
  const socket = ctx.upgrade();

  socket.onopen = () => {
    console.log('Timer Socket Conneted');
    timerSocket = socket;
    setTimerDisplayCallback((time: number) => {
      const event = {type: "time", time: time};
      socket.send(JSON.stringify(event));
    });
    sendMessage('Widget Connected', 3);
  };

  socket.onclose = () => {
    console.log('Timer Socket disconnected');
    timerSocket = null;
    setTimerDisplayCallback((time: number) => console.log(renderTime(time)));
  };
});

timerRouter.get('/:file?', (ctx) => {
  const url = ctx.request.url;
  const option = url.searchParams.get('option');
  const filename = ctx?.params?.file ?? '';
  if (!option) {
    const filePath = files[filename];
    return ctx.send({root: `${Deno.cwd()}/widgets/timer`, path:filePath});
  }
  const amountString = url.searchParams.get('amount')??'0';
  const message = url.searchParams.get('message')??'';
  timerCommands([option, amountString, message]);
});

export function setTimerDisplayCallback(callback: (time: number) => void) {
  timerDisplayCallback = callback;
}

function timerCommands(args: string[]) {
  const [option, amountString, message] = args;
  const amount = parseInt(amountString)

  if (option === 'start') {
    startTimer();
  } else if (option === 'stop') {
    stopTimer();
  } else if (option === 'add') {
    addTime(amount);
  } else if (option === 'save') {
    saveTimer();
  } else if (option === 'load') {
    loadTimer();
  } else if (option === 'reset') {
    resetTimer();
  } else if (option === 'message') {
    sendMessage(message, amount); 
  } else if (option === 'disconnect') {
    if (timerSocket) timerSocket.close();
  }
}

function startTimer() {
  if (timerId != 0 ) return;  // prevents two intervals from running at the same time

  if (autoSaveId == 0) startTimerAutoSave();

  if (storedTime != 0) {
    countDownTimer = Date.now() + storedTime;
  } else {
    countDownTimer = Date.now() + (config.initialDuration * 1000 * 60 * 60);
  }
  timerId = setInterval(() => updateTimeDisplay(), 1000);
}

function stopTimer() {
  if (timerId == 0 ) return; // prevents stored time from being overwritten when timer is stopped

  const now = Date.now();
  storedTime = countDownTimer - now;
  clearInterval(timerId);
  timerId = 0;
}

function updateTimeDisplay() {
  const now = Date.now();
  let time;
  if (timerId != 0) {
    time = countDownTimer - now;
  } else {
    time = storedTime;
  }
  if (time <= 0) {
    time = 0;
    stopTimer();
  }
  if (timerDisplayCallback) {
    timerDisplayCallback(time);
  }
}

export function renderTime(time: number): string {
  const days = Math.floor(time / (1000 * 60 * 60 * 24));
  const hours = Math.floor((time % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((time % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((time % (1000 * 60)) / 1000);
  const timerDisplay = days + "d " + hours + "h " + minutes + "m " + seconds + "s";
  return timerDisplay;
}

function addTime(minutes: number) {
  // if (autoSaveId == 0) return   // don't allow time to be added before the inital is added to the timer

  const milliseconds = minutes * 60000;
  countDownTimer += milliseconds;
  storedTime += milliseconds;
  updateTimeDisplay();
}

function saveTimer() {
  const oldTimerId = timerId; // store the id to prevent it from getting cleared to check if the timer needs to be started again
    stopTimer();
    const currentStoredTime = storedTime;
    if (oldTimerId != 0)
      startTimer();

    Deno.writeTextFile("./timer.txt", currentStoredTime.toString()).then();
}

function startTimerAutoSave() {
  autoSaveId = setInterval(() => saveTimer(), 1000*60*config.timerAutoSaveFreq);
}

function loadTimer() {
  Deno.readTextFile("./timer.txt").then((savedTimeText) => {
    const savedTime = parseInt(savedTimeText);
    storedTime = savedTime;
    countDownTimer = Date.now() + savedTime;
    updateTimeDisplay();
  });
}

function resetTimer() {
  stopTimer();
  storedTime = 0;
}

function sendMessage(message: string, amount: number) {
  const event = {type: 'message', message, amount};
  timerSocket?.send(JSON.stringify(event));
}