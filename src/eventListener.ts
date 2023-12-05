import { config } from './config.ts';
import { addTime } from "./timer.ts";

type Event = {
  type: string;
  user: string;
  time: number;
  amount: number;
};
const eventQueue: Event[] = [];

// deno-lint-ignore require-await
export async function subListener(pathname: string[], searchParams: URLSearchParams) {
  const user = searchParams.get('user')??'blank';
  addEventToQueue({type: 'timer', user, time: config.subTime, amount: 1});
}

// deno-lint-ignore require-await
export async function subGifedListener(pathname: string[], searchParams: URLSearchParams) {
  const user = searchParams.get('user')??'blank';
  setTimeout(() => {
    addEventToQueue({type: 'timer', user, time: config.subTime, amount: 1})
  }, 1000);
}

// deno-lint-ignore require-await
export async function massSubGiftedListener(pathname: string[], searchParams: URLSearchParams) {
  const user = searchParams.get('user')??'blank';
  const amountString = searchParams.get('amount')??'blank';
  const amount = parseInt(amountString);
  addEventToQueue({type: 'mass', user, time: config.subTime, amount: amount})
}

export async function cheerListener(pathname: string[], searchParams: URLSearchParams) {

}

export async function tipListener(pathname: string[], searchParams: URLSearchParams) {

}

function addEventToQueue(event: Event) {
  if (eventQueue.length == 0) {
    executeEvent(event);
  }
  eventQueue.push(event);
}

function executeEvent(event: Event) {
  const {type, user, time, amount} = event
  if (type === 'timer') {
    addTime(time)
    startNextQueuedEvent()

  } else if (type === 'mass') {
    setTimeout(() => {
      // remove single gifted events that are a part of a mass gifted
      let hits = 0;
      eventQueue.filter((value) => {
        if (value.user == user && hits <= amount) {
          hits++;
          return false;
        } else {
          return true;
        }
      })
      if (amount % 5 == 0) {
        addEventToQueue({type: 'spin', user, time: config.subTime*amount, amount: amount});
      } else if (amount % 2 == 0) {
        addEventToQueue({type: 'timer', user, time: -config.subTime*amount, amount: amount});
      } else {
        addEventToQueue({type: 'timer', user, time: config.subTime*amount, amount: amount});
      }
      startNextQueuedEvent();
    }, 3000)
    
  }
}

function startNextQueuedEvent() {
  eventQueue.shift();       // clears the last running event
  if (eventQueue.length > 0) {
    executeEvent(eventQueue[0]);
  }
}