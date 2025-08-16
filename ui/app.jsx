// React entry point for TACTIX UI
// Uses Tailwind CSS for styling

const { useEffect, useState } = React;

function App() {
  const [feed, setFeed] = useState('Connecting...');

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${protocol}://${window.location.host}/api/realtime/`);
    ws.onopen = () => setFeed('Connected');
    ws.onmessage = (evt) => setFeed((prev) => `${prev}\n${evt.data}`.trim());
    ws.onerror = () => setFeed('WebSocket error');
    ws.onclose = () => setFeed((prev) => `${prev}\nDisconnected`);
    return () => ws.close();
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">TACTIX</h1>
      <pre
        id="feed"
        className="bg-black text-green-200 p-2 rounded text-xs whitespace-pre-wrap"
      >
        {feed}
      </pre>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);

