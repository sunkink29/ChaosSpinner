import { config } from './config.ts';

let countDownTimer: number;
let timerId = 0;
let autoSaveId = 0;
let storedTime = 0;
let timerCallback : (timerDisplay: string) => void;

export function setTimerCallback(callback: (timerDisplay: string) => void) {
  timerCallback = callback;
}

export function TimerListener(searchParams: URLSearchParams) {
  const timerOption = searchParams.get('option')??'start';
  if (timerOption === 'start') {
    startTimer();
  } else if (timerOption === 'stop') {
    stopTimer();
  } else if (timerOption === 'add') {
    const amountString = searchParams.get('amount')??'0'
    const amount = parseInt(amountString);
    addTime(amount);
  } else if (timerOption === 'save') {
    saveTimer();
  } else if (timerOption === 'load') {
    loadTimer();
  } else if (timerOption === 'reset') {
    resetTimer();
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
  timerId = setInterval(() => displayTime(), 1000);
}

function stopTimer() {
  if (timerId == 0 ) return; // prevents stored time from being overwritten when timer is stopped

  const now = Date.now();
  storedTime = countDownTimer - now;
  clearInterval(timerId);
  timerId = 0;
}

function displayTime() {
  const now = Date.now();
  let time;
  if (timerId != 0) {
    time = countDownTimer - now;
  } else {
    time = storedTime;
  }
  const days = Math.floor(time / (1000 * 60 * 60 * 24));
  const hours = Math.floor((time % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((time % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((time % (1000 * 60)) / 1000);
  const timerDisplay = days + "d " + hours + "h " + minutes + "m " + seconds + "s";
  if (timerCallback) {
    timerCallback(timerDisplay);
  }
}

export function addTime(minutes: number) {
  if (autoSaveId == 0) return   // don't allow time to be added before the inital is added to the timer

  const milliseconds = minutes * 60000;
  countDownTimer += milliseconds;
  storedTime += milliseconds;
  displayTime();
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
    displayTime();
  });
}

function resetTimer() {
  stopTimer();
  storedTime = 0;
}