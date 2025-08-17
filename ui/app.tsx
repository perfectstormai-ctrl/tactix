import EngChatPanel from './src/components/EngChatPanel.tsx';
import MainLayout from './src/components/MainLayout.tsx';
import IncidentDashboard from './src/pages/IncidentDashboard.tsx';
import IncidentPage from './src/pages/IncidentPage.tsx';
import { notifyStore } from './src/lib/notify.ts';
import i18n from './src/i18n/index.ts';

const { useEffect, useState } = React;
const { I18nextProvider } = ReactI18next;
const { BrowserRouter, Routes, Route, Navigate } = ReactRouterDOM;

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [refreshToken, setRefreshToken] = useState(
    localStorage.getItem('refreshToken') || ''
  );

  function handleLogin(data) {
    setToken(data.token);
    setRefreshToken(data.refreshToken);
    localStorage.setItem('token', data.token);
    localStorage.setItem('refreshToken', data.refreshToken);
  }

  function logout() {
    setToken('');
    setRefreshToken('');
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
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
    }, 10 * 60 * 1000);
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

  const Protected = ({ children }) => {
    if (!token) return <Navigate to="/login" replace />;
    return children;
  };

  return (
    <I18nextProvider i18n={i18n}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login onLogin={handleLogin} />} />
          <Route
            path="/*"
            element={
              <Protected>
                <MainLayout onLogout={logout} />
              </Protected>
            }
          >
            <Route index element={<IncidentDashboard token={token} />} />
            <Route
              path="incidents/:incidentId"
              element={<IncidentPage token={token} />}
            />
            <Route path="chat" element={<EngChatPanel token={token} />} />
            <Route path="playbooks" element={<div className="text-sm">Playbooks</div>} />
            <Route path="orders" element={<div className="text-sm">Orders</div>} />
            <Route path="schedule" element={<div className="text-sm">Schedule</div>} />
            <Route path="notifications" element={<div className="text-sm">Notifications</div>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </I18nextProvider>
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
    <form onSubmit={submit} className="space-y-2 max-w-sm m-auto p-4">
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

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
