const { useParams } = ReactRouterDOM;
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function IncidentPage({ token }) {
  const { incidentId } = useParams();
  const { t } = useTranslation();
  const headers: any = token
    ? { Authorization: `Bearer ${token}`, 'content-type': 'application/json' }
    : { 'content-type': 'application/json' };
  const [incident, setIncident] = useState<any>(null);
  const [tab, setTab] = useState('overview');
  const [chat, setChat] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [tasks, setTasks] = useState<any[]>([]);
  const [newTask, setNewTask] = useState({
    role: 'IMO',
    assigneeUpn: '',
    title: '',
    description: '',
  });
  const [activity, setActivity] = useState<any[]>([]);

  useEffect(() => {
    fetch(`/incidents/${incidentId}`, { headers })
      .then((res) => res.json())
      .then(setIncident);
    fetch(`/incidents/${incidentId}/chat?limit=50`, { headers })
      .then((res) => res.json())
      .then(setChat);
    fetch(`/incidents/${incidentId}/tasks`, { headers })
      .then((res) => res.json())
      .then(setTasks);
    fetch(`/incidents/${incidentId}/activity`, { headers })
      .then((res) => res.json())
      .then(setActivity);
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${protocol}://${window.location.host}/rt`);
    ws.onmessage = (evt) => {
      let msg;
      try {
        msg = JSON.parse(evt.data);
      } catch {
        return;
      }
      if (msg.type === 'INCIDENT_CHAT' && msg.incidentId === incidentId) {
        setChat((c) => [
          ...c,
          {
            msg_id: msg.msgId,
            author_upn: msg.authorUpn,
            text: msg.text,
            created_at: msg.createdAt,
          },
        ]);
        setActivity((a) => [{ kind: 'chat', createdAt: msg.createdAt }, ...a]);
      }
      if (msg.type === 'INCIDENT_TASK_CREATED' && msg.incidentId === incidentId) {
        setTasks((ts) => [
          { task_id: msg.taskId, title: msg.title, status: msg.status },
          ...ts,
        ]);
        setActivity((a) => [{ kind: 'task', createdAt: new Date().toISOString() }, ...a]);
      }
      if (msg.type === 'INCIDENT_TASK_UPDATED' && msg.incidentId === incidentId) {
        setTasks((ts) =>
          ts.map((t) => (t.task_id === msg.taskId ? { ...t, status: msg.status } : t))
        );
        setActivity((a) => [{ kind: 'task', createdAt: new Date().toISOString() }, ...a]);
      }
    };
    return () => ws.close();
  }, [incidentId]);

  function sendChat(e: any) {
    e.preventDefault();
    fetch(`/incidents/${incidentId}/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ text }),
    })
      .then((res) => res.json())
      .then((msg) => {
        setChat((c) => [...c, msg]);
        setActivity((a) => [{ kind: 'chat', createdAt: msg.created_at }, ...a]);
        setText('');
      });
  }

  function createTask(e: any) {
    e.preventDefault();
    fetch(`/incidents/${incidentId}/tasks`, {
      method: 'POST',
      headers,
      body: JSON.stringify(newTask),
    })
      .then((res) => res.json())
      .then((task) => {
        setTasks((ts) => [task, ...ts]);
        setActivity((a) => [{ kind: 'task', createdAt: task.updated_at }, ...a]);
        setNewTask({ role: 'IMO', assigneeUpn: '', title: '', description: '' });
      });
  }

  function changeStatus(id: string, status: string) {
    fetch(`/incidents/${incidentId}/tasks/${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status }),
    })
      .then((res) => res.json())
      .then((task) => {
        setTasks((ts) => ts.map((t) => (t.task_id === id ? task : t)));
        setActivity((a) => [{ kind: 'task', createdAt: task.updated_at }, ...a]);
      });
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{incident?.title}</h2>
        <div className="text-sm">{incident?.status}</div>
      </div>
      <div className="border-b flex gap-4">
        {['overview', 'chat', 'tasks', 'playbooks', 'orders'].map((name) => (
          <button
            key={name}
            onClick={() => setTab(name)}
            className={`px-2 py-1 -mb-px border-b-2 ${
              tab === name ? 'border-blue-600' : 'border-transparent'
            }`}
          >
            {t(`incident.tabs.${name}`)}
          </button>
        ))}
      </div>
      {tab === 'overview' && (
        <ul className="space-y-1 text-sm">
          {activity.map((a, i) => (
            <li key={i}>
              {a.kind} - {a.createdAt}
            </li>
          ))}
        </ul>
      )}
      {tab === 'chat' && (
        <div className="flex flex-col border rounded p-2 h-96">
          <div className="flex-1 overflow-y-auto mb-2 space-y-1">
            {chat.map((m) => (
              <div key={m.msg_id} className="text-sm">
                <span className="font-semibold">{m.author_upn}: </span>
                <span>{m.text}</span>
              </div>
            ))}
          </div>
          <form onSubmit={sendChat} className="flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t('workspace.chat.placeholder')}
              className="flex-1 border rounded p-1"
            />
            <button className="bg-blue-600 text-white px-2 py-1 rounded">
              {t('workspace.chat.send')}
            </button>
          </form>
        </div>
      )}
      {tab === 'tasks' && (
        <div className="space-y-2">
          <form onSubmit={createTask} className="space-y-1 border p-2 rounded">
            <div className="flex gap-2">
              <input
                className="border p-1 flex-1"
                placeholder={t('workspace.tasks.assignee')}
                value={newTask.assigneeUpn}
                onChange={(e) =>
                  setNewTask((nt) => ({ ...nt, assigneeUpn: e.target.value }))
                }
              />
              <input
                className="border p-1 flex-1"
                placeholder={t('workspace.tasks.title')}
                value={newTask.title}
                onChange={(e) => setNewTask((nt) => ({ ...nt, title: e.target.value }))}
              />
            </div>
            <button className="bg-blue-600 text-white px-2 py-1 rounded">
              {t('workspace.tasks.new')}
            </button>
          </form>
          <ul className="space-y-1">
            {tasks.map((task) => (
              <li key={task.task_id} className="border rounded p-2 flex justify-between">
                <span>{task.title}</span>
                <select
                  value={task.status}
                  onChange={(e) => changeStatus(task.task_id, e.target.value)}
                  className="border p-1 text-sm"
                >
                  {['open', 'in_progress', 'done', 'cancelled'].map((s) => (
                    <option key={s} value={s}>
                      {t(`task.status.${s}`)}
                    </option>
                  ))}
                </select>
              </li>
            ))}
          </ul>
        </div>
      )}
      {tab === 'playbooks' && (
        <div className="text-sm text-gray-600">Playbook tab</div>
      )}
      {tab === 'orders' && (
        <div className="text-sm text-gray-600">Orders tab</div>
      )}
    </div>
  );
}
