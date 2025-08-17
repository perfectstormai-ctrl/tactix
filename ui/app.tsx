import MainLayout from './src/components/MainLayout.tsx';
import IncidentDashboard from './src/pages/IncidentDashboard.tsx';
import IncidentPage from './src/pages/IncidentPage.tsx';
import OperationsList from './src/pages/OperationsList.tsx';
import OperationOverview from './src/pages/OperationOverview.tsx';
import SchedulePage from './src/pages/SchedulePage.tsx';
import PlaybookPage from './src/pages/PlaybookPage.tsx';
import OrdersList from './src/pages/OrdersList.tsx';
import OrderDetail from './src/pages/OrderDetail.tsx';
import EngRooms from './src/pages/EngRooms.tsx';
import EngRoom from './src/pages/EngRoom.tsx';
import SettingsProfile from './src/pages/SettingsProfile.tsx';
import SettingsAdmin from './src/pages/SettingsAdmin.tsx';
import NotFound from './src/pages/NotFound.tsx';
import ErrorPage from './src/pages/ErrorPage.tsx';
import { notifyStore } from './src/lib/notify.ts';
import i18n from './src/i18n/index.ts';
import Button from './src/design/Button.tsx';
import FirstRun from './src/pages/FirstRun.tsx';

const { useEffect, useState } = React;
const { I18nextProvider, useTranslation } = ReactI18next;
const { BrowserRouter, Routes, Route, Navigate, useNavigate } = ReactRouterDOM;

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [refreshToken, setRefreshToken] = useState(
    localStorage.getItem('refreshToken') || ''
  );
  const [mode, setMode] = useState(undefined);
  const ENG_CHAT_ENABLED = (window as any).ENV?.ENG_CHAT_ENABLED !== false;

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

  useEffect(() => {
    fetch('/bootstrap/config')
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setMode(data.mode))
      .catch(() => setMode(null));
  }, []);

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

  if (mode === undefined) return null;

  return (
    <I18nextProvider i18n={i18n}>
      <BrowserRouter>
        {mode ? (
          <Routes>
            <Route path="/login" element={<Login onLogin={handleLogin} />} />
            <Route
              path="/*"
              element={
                <Protected>
                  <MainLayout onLogout={logout} mode={mode} />
                </Protected>
              }
            >
              <Route index element={<Navigate to="/operations" replace />} />
              <Route path="operations" element={<OperationsList />} />
              <Route path="operations/:opId/overview" element={<OperationOverview />} />
              <Route path="incidents" element={<IncidentDashboard token={token} />} />
              <Route
                path="incidents/:incidentId/workspace"
                element={<IncidentPage token={token} />}
              />
              <Route
                path="operations/:opId/schedule"
                element={<SchedulePage />}
              />
              <Route path="incidents/:incidentId/playbook" element={<PlaybookPage />} />
              <Route path="playbooks/:playbookId" element={<PlaybookPage />} />
              <Route path="orders" element={<OrdersList />} />
              <Route path="orders/:orderId" element={<OrderDetail />} />
              {ENG_CHAT_ENABLED && (
                <>
                  <Route path="eng" element={<EngRooms />} />
                  <Route path="eng/rooms/:roomId" element={<EngRoom />} />
                </>
              )}
              <Route path="settings/profile" element={<SettingsProfile />} />
              <Route path="settings/admin" element={<SettingsAdmin />} />
              <Route path="error" element={<ErrorPage />} />
              <Route path="*" element={<NotFound />} />
            </Route>
            <Route path="/first-run" element={<Navigate to="/login" replace />} />
          </Routes>
        ) : (
          <Routes>
            <Route path="/first-run" element={<FirstRun onComplete={setMode} />} />
            <Route path="*" element={<Navigate to="/first-run" replace />} />
          </Routes>
        )}
      </BrowserRouter>
    </I18nextProvider>
  );
}

function Login({ onLogin }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
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
      .then((data) => {
        onLogin(data);
        navigate('/operations');
      })
      .catch(() => setError(t('common.error')));
  };

  return (
    <form onSubmit={submit} className="space-y-2 max-w-sm m-auto p-4">
      <h2 className="text-lg font-semibold text-center">
        {t('auth.login.title')}
      </h2>
      {error && <div className="text-red-600 text-sm">{error}</div>}
      <input
        className="border rounded p-1 w-full"
        placeholder={t('auth.login.upn')}
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <input
        className="border rounded p-1 w-full"
        type="password"
        placeholder={t('auth.login.password')}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <Button type="submit" className="w-full">
        {t('auth.login.submit')}
      </Button>
    </form>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
