const { useState, useEffect } = React;

function App() {
  const [incidents, setIncidents] = useState([]);
  const [selected, setSelected] = useState(null);
  const [incident, setIncident] = useState(null);
  const [warlog, setWarlog] = useState([]);
  const [comment, setComment] = useState('');

  useEffect(() => {
    fetch('/api/incidents')
      .then((res) => res.json())
      .then(setIncidents)
      .catch(() => setIncidents([]));
  }, []);

  useEffect(() => {
    if (selected === null) return;
    fetch(`/api/incidents/${selected}`)
      .then((res) => res.json())
      .then((data) => {
        setIncident(data);
        setWarlog(data.comments || []);
      });

    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${protocol}://${window.location.host}/rt`);
    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'subscribe', incidentId: selected }));
    };
    ws.onmessage = (evt) => {
      let msg;
      try {
        msg = JSON.parse(evt.data);
      } catch {
        return;
      }
      if (msg.type === 'COMMENT_ADDED' && msg.incidentId === selected) {
        setWarlog((prev) => [...prev, msg.text]);
      }
    };
    return () => ws.close();
  }, [selected]);

  const submit = (e) => {
    e.preventDefault();
    fetch(`/api/incidents/${selected}/comment`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ comment }),
    }).then(() => setComment(''));
  };

  if (selected === null) {
    return (
      <div className="p-4 space-y-2">
        <h1 className="text-xl font-bold">Incidents</h1>
        <ul className="list-disc pl-4">
          {incidents.map((i) => (
            <li key={i.id}>
              <button
                className="text-blue-600 underline"
                onClick={() => setSelected(i.id)}
              >
                {i.title}
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <button className="text-blue-600 underline" onClick={() => setSelected(null)}>
        &larr; Back
      </button>
      {incident && <h2 className="text-lg font-semibold">{incident.title}</h2>}
      <div className="bg-black text-green-200 p-2 rounded h-64 overflow-y-auto">
        {warlog.map((c, idx) => (
          <div key={idx} className="mb-1 whitespace-pre-wrap">
            {c}
          </div>
        ))}
      </div>
      <form onSubmit={submit} className="flex gap-2">
        <textarea
          className="border rounded p-1 flex-1"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        <button className="bg-blue-600 text-white px-3 rounded" type="submit">
          Save
        </button>
      </form>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
