import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function IncidentWorkspacePage({ incidentId, token, onBack }) {
  const { t } = useTranslation();
  const headers: any = token
    ? { Authorization: `Bearer ${token}`, 'content-type': 'application/json' }
    : { 'content-type': 'application/json' };
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
      <button onClick={onBack} className="text-blue-600 underline">
        &larr; Back
      </button>
      <h2 className="text-lg font-semibold">{t('workspace.title')}</h2>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2 flex flex-col border rounded p-2 h-96">
          <h3 className="font-semibold mb-2">{t('workspace.chat.title')}</h3>
          <div className="flex-1 overflow-y-auto mb-2 space-y-1">
            {chat.map((m) => (
              <div key={m.msg_id} className="text-sm">
                <span className="font-bold">{m.author_upn}</span>: {m.text}
              </div>
            ))}
          </div>
          <form onSubmit={sendChat} className="flex gap-2">
            <input
              className="border rounded p-1 flex-1"
              value={text}
              placeholder={t('workspace.chat.placeholder')}
              onChange={(e) => setText(e.target.value)}
            />
            <button className="bg-blue-600 text-white px-3 rounded" type="submit">
              {t('workspace.chat.send')}
            </button>
          </form>
        </div>
        <div className="border rounded p-2 flex flex-col h-96">
          <h3 className="font-semibold mb-2">{t('workspace.tasks.title')}</h3>
          <div className="flex-1 overflow-y-auto space-y-1">
            {tasks.map((tk) => (
              <div key={tk.task_id} className="flex justify-between items-center text-sm">
                <span>{tk.title}</span>
                <select
                  value={tk.status}
                  onChange={(e) => changeStatus(tk.task_id, e.target.value)}
                  className="border rounded p-1 text-xs"
                >
                  <option value="open">{t('task.status.open')}</option>
                  <option value="in_progress">{t('task.status.in_progress')}</option>
                  <option value="done">{t('task.status.done')}</option>
                  <option value="cancelled">{t('task.status.cancelled')}</option>
                </select>
              </div>
            ))}
          </div>
          <form onSubmit={createTask} className="space-y-1 pt-2 text-sm">
            <input
              className="border rounded p-1 w-full"
              placeholder={t('workspace.tasks.role')}
              value={newTask.role}
              onChange={(e) => setNewTask({ ...newTask, role: e.target.value })}
            />
            <input
              className="border rounded p-1 w-full"
              placeholder={t('workspace.tasks.assignee')}
              value={newTask.assigneeUpn}
              onChange={(e) => setNewTask({ ...newTask, assigneeUpn: e.target.value })}
            />
            <input
              className="border rounded p-1 w-full"
              placeholder={t('workspace.tasks.new')}
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
            />
            <textarea
              className="border rounded p-1 w-full"
              placeholder={t('workspace.tasks.new')}
              value={newTask.description}
              onChange={(e) =>
                setNewTask({ ...newTask, description: e.target.value })
              }
            />
            <button className="bg-blue-600 text-white px-2 rounded" type="submit">
              {t('workspace.tasks.new')}
            </button>
          </form>
        </div>
      </div>
      <div className="border rounded p-2 h-40 overflow-y-auto">
        <h3 className="font-semibold mb-2">{t('workspace.activity.title')}</h3>
        {activity.map((a, idx) => (
          <div key={idx} className="text-sm">
            {new Date(a.createdAt).toLocaleTimeString()} - {a.kind}
          </div>
        ))}
      </div>
    </div>
  );
}

