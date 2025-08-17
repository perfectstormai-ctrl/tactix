// React entry point for TACTIX UI
// Uses Tailwind CSS for styling

import LanguageSwitcher from './src/components/LanguageSwitcher.tsx';
import NewMessageCard from './src/components/NewMessageCard.tsx';
import EngChatPanel from './src/components/EngChatPanel.tsx';
import GlobalBanner from './src/components/GlobalBanner.tsx';
import IncidentWorkspacePage from './src/components/IncidentWorkspacePage.tsx';
import { notifyStore } from './src/lib/notify.ts';
import i18n from './src/i18n/index.ts';
import { formatTime } from './src/i18n/format.ts';

const { useEffect, useState, useRef } = React;
const { useTranslation, I18nextProvider } = ReactI18next;

function App() {
  const { t } = useTranslation();
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [refreshToken, setRefreshToken] = useState(
    localStorage.getItem('refreshToken') || ''
  );
  const [view, setView] = useState(token ? 'list' : 'login');
  const [detailId, setDetailId] = useState(null);

  function handleLogin(data) {
    setToken(data.token);
    setRefreshToken(data.refreshToken);
    localStorage.setItem('token', data.token);
    localStorage.setItem('refreshToken', data.refreshToken);
    setView('list');
  }

  function logout() {
    setToken('');
    setRefreshToken('');
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    setView('login');
  }

  // Periodically refresh JWT using refresh token
  useEffect(() => {
    if (!refreshToken) return;
    const id = setInterval(() => {
      fetch('/auth/refresh', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })
        .then((res) => (res.ok ? res.json() : Promise.reject()))
        .then((data) => {
          setToken(data.token);
          setRefreshToken(data.refreshToken);
          localStorage.setItem('token', data.token);
          localStorage.setItem('refreshToken', data.refreshToken);
        })
        .catch(() => logout());
    }, 10 * 60 * 1000); // refresh every 10 minutes
    return () => clearInterval(id);
  }, [refreshToken]);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${protocol}://${window.location.host}/rt`);
    ws.onmessage = (evt) => {
      let msg;
      try {
        msg = JSON.parse(evt.data);
      } catch {
        return;
      }
      if (msg.type === 'PLAYBOOK_NOTIFY') {
        notifyStore.push({
          id: crypto.randomUUID?.() || String(Date.now()),
          severity: msg.severity || 'info',
          title: msg.title || 'Playbook',
          text: msg.text || '',
          at: msg.occurredAt || new Date().toISOString(),
        });
      }
    };
    return () => ws.close();
  }, []);

  return (
    <div className="p-4 space-y-4">
      <GlobalBanner />
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold">TACTIX</h1>
        <div className="flex items-center gap-4">
          <nav className="hidden sm:flex gap-4 text-sm">
            <span>{t('nav.warlog')}</span>
            <span>{t('nav.quickWarlogEntry')}</span>
            <span>{t('nav.liveChat')}</span>
          </nav>
          <LanguageSwitcher />
        </div>
      </div>
      {view !== 'login' && (
        <>
          <NewMessageCard token={token} />
          {typeof window !== 'undefined' && (window as any).ENG_ENABLED && (
            <EngChatPanel token={token} />
          )}
        </>
      )}
      {view === 'login' && <Login onLogin={handleLogin} />}
      {view === 'list' && (
        <IncidentList
          token={token}
          onSelect={(id) => {
            setDetailId(id);
            setView('detail');
          }}
          onLogout={logout}
        />
      )}
      {view === 'detail' && (
        <IncidentDetail
          token={token}
          incidentId={detailId}
          onBack={() => setView('list')}
          onWorkspace={() => setView('workspace')}
        />
      )}
      {view === 'workspace' && (
        <IncidentWorkspacePage
          token={token}
          incidentId={detailId}
          onBack={() => setView('detail')}
        />
      )}
    </div>
  );
}

function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submit = (e) => {
    e.preventDefault();
    fetch('/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then(onLogin)
      .catch(() => setError('Login failed'));
  };

  return (
    <form onSubmit={submit} className="space-y-2 max-w-sm">
      {error && <div className="text-red-600 text-sm">{error}</div>}
      <input
        className="border rounded p-1 w-full"
        placeholder="username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <input
        className="border rounded p-1 w-full"
        type="password"
        placeholder="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button
        className="bg-blue-600 text-white px-3 py-1 rounded"
        type="submit"
      >
        Login
      </button>
    </form>
  );
}

function IncidentList({ token, onSelect, onLogout }) {
  const { t } = useTranslation();
  const [incidents, setIncidents] = useState([]);
  const [title, setTitle] = useState('');
  const [severity, setSeverity] = useState('');
  const [description, setDescription] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [q, setQ] = useState('');

  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  useEffect(() => {
    let url = '/incidents';
    if (q) url += `?q=${encodeURIComponent(q)}`;
    fetch(url, { headers })
      .then((res) => res.json())
      .then(setIncidents)
      .catch(() => setIncidents([]));
  }, [q, token]);

  const createIncident = (e) => {
    e.preventDefault();
    fetch('/incidents', {
      method: 'POST',
      headers: { ...headers, 'content-type': 'application/json' },
      body: JSON.stringify({ title, severity, description }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((incident) => {
        setTitle('');
        setSeverity('');
        setDescription('');
        onSelect(incident.id);
      })
      .catch(() => {});
  };

  const search = (e) => {
    e.preventDefault();
    setQ(searchInput);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Incidents</h2>
        <button
          className="text-sm text-blue-600 underline"
          onClick={onLogout}
        >
          Logout
        </button>
      </div>
      <form onSubmit={search} className="flex gap-2">
        <input
          className="border rounded p-1 flex-1"
          placeholder={t('global.search')}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <button className="bg-gray-200 px-2 rounded" type="submit">
          {t('global.search')}
        </button>
      </form>
      <ul className="space-y-1">
        {incidents.map((i) => (
          <li key={i.id}>
            <button
              className="text-blue-600 underline"
              onClick={() => onSelect(i.id)}
            >
              {i.title} – {i.status}
            </button>
          </li>
        ))}
      </ul>
      <div>
        <h3 className="font-semibold">Create Incident</h3>
        <form onSubmit={createIncident} className="space-y-2 max-w-md">
          <input
            className="border rounded p-1 w-full"
            placeholder="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <input
            className="border rounded p-1 w-full"
            placeholder="severity"
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            required
          />
          <textarea
            className="border rounded p-1 w-full"
            placeholder="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <button
            className="bg-blue-600 text-white px-3 py-1 rounded"
            type="submit"
          >
            Create
          </button>
        </form>
      </div>
    </div>
  );
}

function IncidentDetail({ token, incidentId, onBack, onWorkspace }) {
  const { t } = useTranslation();
  const [incident, setIncident] = useState(null);
  const [comment, setComment] = useState('');
  const [warlog, setWarlog] = useState([]);
  const logRef = useRef<HTMLDivElement | null>(null);
  const [pbOpen, setPbOpen] = useState(false);
  const [playbooks, setPlaybooks] = useState([]);
  const [pbId, setPbId] = useState('');
  const [pbMsg, setPbMsg] = useState('');
  const [pbSeverity, setPbSeverity] = useState('info');

  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  useEffect(() => {
    fetch(`/incidents/${incidentId}`, { headers })
      .then((res) => res.json())
      .then((data) => {
        setIncident(data);
        const log = [
          {
            time: new Date(data.createdAt).toISOString(),
            title: 'CREATED',
            text: data.title,
          },
          ...data.comments.map((c) => ({
            time: '',
            title: 'COMMENT',
            text: c,
          })),
        ];
        setWarlog(log);
      });
  }, [incidentId]);

  useEffect(() => {
    const div = logRef.current;
    if (div) {
      div.scrollTop = div.scrollHeight;
    }
  }, [warlog]);

  useEffect(() => {
    if (!pbOpen) return;
    fetch('/playbooks', { headers })
      .then((res) => res.json())
      .then((data) => setPlaybooks(data.playbooks || []));
  }, [pbOpen]);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${protocol}://${window.location.host}/rt`);
    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'subscribe', incidentId }));
    };
    ws.onmessage = (evt) => {
      let msg;
      try {
        msg = JSON.parse(evt.data);
      } catch {
        return;
      }
      if (msg.type === 'snapshot') {
        setIncident(msg.incident);
        const log = [
          {
            time: new Date(msg.incident.createdAt).toISOString(),
            title: 'CREATED',
            text: msg.incident.title,
          },
          ...msg.incident.comments.map((c) => ({
            time: '',
            title: 'COMMENT',
            text: c,
          })),
        ];
        setWarlog(log);
      } else if (msg.type === 'COMMENT_ADDED') {
        setIncident((prev) => ({
          ...prev,
          comments: [...(prev?.comments || []), msg.payload.comment],
        }));
        setWarlog((prev) => [
          ...prev,
          {
            time: new Date().toISOString(),
            title: 'COMMENT',
            text: msg.payload.comment,
          },
        ]);
      } else if (msg.type === 'STATUS_CHANGED') {
        setWarlog((prev) => [
          ...prev,
          {
            time: new Date().toISOString(),
            title: 'STATUS',
            text: msg.payload.status,
          },
        ]);
      } else if (msg.type === 'CREATED') {
        setWarlog((prev) => [
          ...prev,
          {
            time: new Date().toISOString(),
            title: 'CREATED',
            text: msg.payload.title,
          },
        ]);
      }
    };
    return () => ws.close();
  }, [incidentId]);

  const submit = (e) => {
    e.preventDefault();
    fetch(`/incidents/${incidentId}/comment`, {
      method: 'POST',
      headers: { ...headers, 'content-type': 'application/json' },
      body: JSON.stringify({ comment }),
    }).then(() => setComment(''));
  };

  const triggerPb = (e) => {
    e.preventDefault();
    if (!pbId) return;
    fetch(`/playbooks/${pbId}/trigger`, {
      method: 'POST',
      headers: { ...headers, 'content-type': 'application/json', 'X-Actor-Upn': 'do@example.com' },
      body: JSON.stringify({ incidentId, message: pbMsg || undefined, severity: pbSeverity }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then(() => {
        alert(t('playbook.triggered'));
        setPbOpen(false);
        setPbMsg('');
        setPbSeverity('info');
        setPbId('');
      });
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button className="text-blue-600 underline" onClick={onBack}>
          &larr; Back
        </button>
        <button
          className="text-blue-600 underline"
          onClick={onWorkspace}
        >
          {t('workspace.title')}
        </button>
      </div>
      {incident && (
        <div>
          <h2 className="text-lg font-semibold">{incident.title}</h2>
          <p>
            {t('global.severity')}: {incident.severity}
          </p>
          <p>
            {t('global.status')}: {incident.status}
          </p>
          <button
            className="mt-2 bg-amber-500 text-white px-2 py-1 rounded"
            onClick={() => setPbOpen(true)}
          >
            {t('playbook.trigger')}
          </button>
        </div>
      )}
      <div>
        <h3 className="font-semibold">{t('warlog.title')}</h3>
        <div
          ref={logRef}
          className="bg-black text-green-200 p-2 rounded text-xs h-64 overflow-y-auto"
        >
          {warlog.length === 0 && <div>{t('warlog.empty')}</div>}
          {warlog.map((e, idx) => (
            <div
              key={idx}
              className="grid grid-cols-[auto_auto_1fr] gap-2 mb-1 whitespace-pre-wrap"
            >
              <div className="text-gray-400">{e.time ? formatTime(new Date(e.time), i18n.language) : ''}</div>
              <div className="font-bold">{e.title}</div>
              <div>{e.text}</div>
            </div>
          ))}
        </div>
      </div>
      <form onSubmit={submit} className="flex flex-col gap-2">
        <h3 className="font-semibold">{t('warlog.quickEntryTitle')}</h3>
        <div className="flex gap-2">
          <input
            className="border rounded p-1 flex-1"
            placeholder={t('chat.typingPlaceholder')}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <button className="bg-blue-600 text-white px-3 rounded" type="submit">
            {t('chat.send')}
          </button>
        </div>
      </form>
      {pbOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <form onSubmit={triggerPb} className="bg-white p-4 rounded space-y-2 w-80">
            <h3 className="font-semibold">{t('playbook.trigger')}</h3>
            <select
              className="border rounded p-1 w-full"
              value={pbId}
              onChange={(e) => setPbId(e.target.value)}
            >
              <option value="">{t('playbook.select')}</option>
              {playbooks.map((pb) => (
                <option key={pb.id} value={pb.id}>
                  {pb.name}
                </option>
              ))}
            </select>
            <textarea
              className="border rounded p-1 w-full"
              placeholder={t('playbook.message')}
              value={pbMsg}
              onChange={(e) => setPbMsg(e.target.value)}
            />
            <select
              className="border rounded p-1 w-full"
              value={pbSeverity}
              onChange={(e) => setPbSeverity(e.target.value)}
            >
              <option value="info">info</option>
              <option value="warning">warning</option>
              <option value="critical">critical</option>
            </select>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setPbOpen(false)}>
                {t('playbook.cancel')}
              </button>
              <button type="submit" className="bg-blue-600 text-white px-3 rounded">
                {t('playbook.submit')}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <I18nextProvider i18n={i18n}>
    <App />
  </I18nextProvider>
);

