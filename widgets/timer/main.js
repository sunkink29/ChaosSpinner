
const socket = new WebSocket(
  `ws://localhost:8080/timer/start_websocket`,
);

socket.onmessage = (m) => {
  document.getElementById('countdown').innerHTML = m.data;
};