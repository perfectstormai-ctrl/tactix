// Basic client-side UI logic for TACTIX

function updateStatuses() {
  document.querySelectorAll('.service').forEach((el) => {
    const url = el.dataset.url;
    fetch(url)
      .then((res) => res.text())
      .then((text) => {
        el.querySelector('.status').textContent = text;
      })
      .catch(() => {
        el.querySelector('.status').textContent = 'error';
      });
  });
}

function initWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const ws = new WebSocket(`${protocol}://${window.location.host}/rt`);
  const feed = document.getElementById('feed');
  ws.onopen = () => {
    feed.textContent = 'Connected';
  };
  ws.onmessage = (evt) => {
    feed.textContent = `${feed.textContent}\n${evt.data}`.trim();
  };
  ws.onerror = () => {
    feed.textContent = 'WebSocket error';
  };
  ws.onclose = () => {
    feed.textContent = `${feed.textContent}\nDisconnected`;
  };
}

document.addEventListener('DOMContentLoaded', () => {
  updateStatuses();
  initWebSocket();
});
