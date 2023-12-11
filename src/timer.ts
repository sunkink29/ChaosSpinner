import { Router } from "https://deno.land/x/oak@v12.6.1/mod.ts";
import { config } from './config.ts';

const files: {[key: string]:string} = {
  ""          : "/index.html",
  "style.css" : "/style.css",
  "main.js"   : "/main.js"
}

let countDownTimer: number;
let timerId = 0;
let autoSaveId = 0;
let storedTime = 0;
let timerDisplayCallback : (time: number) => void;

let timerSocket: WebSocket | null = null;

// deno-lint-ignore no-explicit-any
export function initalizeTimerRoutes(router: Router<Record<string,any>>) {
  router.get('/timer/websocket', (ctx) => {
    if (timerSocket !== null) {
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

  router.get('/timer/:file?', (ctx) => {
    const url = ctx.request.url;
    const filename = ctx?.params?.file ?? '';
    const timerOption = url.searchParams.get('option');
    const amountString = url.searchParams.get('amount')??'0';
    const amount = parseInt(amountString) ?? 1;
    const message = url.searchParams.get('message')??'';
    const filePath = TimerListener(filename, timerOption, amount, message);
    if (filePath) {
      return ctx.send({root: `${Deno.cwd()}/widgets/timer`, path:filePath});
    }
  });
}

export function setTimerDisplayCallback(callback: (time: number) => void) {
  timerDisplayCallback = callback;
}

export function TimerListener(fileName: string, timerOption: string | null, amount: number, message: string): void | string {
  if (timerOption === null) {
    return files[fileName];
  } else if (timerOption === 'start') {
    startTimer();
  } else if (timerOption === 'stop') {
    stopTimer();
  } else if (timerOption === 'add') {
    addTime(amount);
  } else if (timerOption === 'save') {
    saveTimer();
  } else if (timerOption === 'load') {
    loadTimer();
  } else if (timerOption === 'reset') {
    resetTimer();
  } else if (timerOption === 'message') {
    sendMessage(message, amount); 
  }
}

export function startTimer() {
  if (timerId != 0 ) return;  // prevents two intervals from running at the same time

  if (autoSaveId == 0) startTimerAutoSave();

  if (storedTime != 0) {
    countDownTimer = Date.now() + storedTime;
  } else {
    countDownTimer = Date.now() + (config.initialDuration * 1000 * 60 * 60);
  }
  timerId = setInterval(() => updateTimeDisplay(), 1000);
}

export function stopTimer() {
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

export function addTime(minutes: number) {
  // if (autoSaveId == 0) return   // don't allow time to be added before the inital is added to the timer

  const milliseconds = minutes * 60000;
  countDownTimer += milliseconds;
  storedTime += milliseconds;
  updateTimeDisplay();
}

export function saveTimer() {
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

export function loadTimer() {
  Deno.readTextFile("./timer.txt").then((savedTimeText) => {
    const savedTime = parseInt(savedTimeText);
    storedTime = savedTime;
    countDownTimer = Date.now() + savedTime;
    updateTimeDisplay();
  });
}

export function resetTimer() {
  stopTimer();
  storedTime = 0;
}

export function sendMessage(message: string, amount: number) {
  const event = {type: 'message', message, amount};
  timerSocket?.send(JSON.stringify(event));
}