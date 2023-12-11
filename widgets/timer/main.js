const socket = new WebSocket(`ws://localhost:29763/timer/websocket`);
const messageQueue = [{}];

socket.onopen = () => {
  clearMessage();
}

socket.onmessage = (m) => {
  const event = JSON.parse(m.data);
  if (event.type === "time") {
    updateTimer(parseInt(event.time));
  } else if (event.type === "message") {
    addMessageToQueue(event.message, event.amount);
  }
};

socket.onclose = () => {
  document.getElementById('event').innerHTML = 'Widget Disconnected';
  $('.eventContainer').show().animate({ height: "50px" });
  $('#event').show();
}

function updateTimer(time) {
  const days = Math.floor(time / (1000 * 60 * 60 * 24));
  const hours = Math.floor((time % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((time % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((time % (1000 * 60)) / 1000);
  const timerDisplay = days + "d " + hours + "h " + minutes + "m " + seconds + "s";
  document.getElementById('countdown').innerHTML = timerDisplay;
}

function addMessageToQueue(message, amount) {
  messageQueue.push({message, amount});
  if (messageQueue.length === 1) {
    displayMessage(message, amount);
  }
}

function displayMessage(message, amount) {
  document.getElementById('event').innerHTML = message;
  $('.eventContainer').show().animate({ height: "50px" });
  setTimeout(function () {
    clearMessage();
  }, amount*1000);
}

function clearMessage() {
  $('.eventContainer').animate({ height: "0px" }, 400, 'swing', () => {
    $('.eventContainer').hide();
    messageQueue.shift();
    if (messageQueue.length != 0) {
      const {message, amount} = messageQueue[0];
      displayMessage(message, amount);
    }
  });
  
}