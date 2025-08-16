import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  token: string;
}

interface Message {
  fromInstanceId: string;
  text: string;
}

export default function EngChatPanel({ token }: Props) {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${proto}://${location.host}/eng/ws`);
    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        setMessages((m) => [...m, msg]);
      } catch {}
    };
    wsRef.current = ws;
    return () => ws.close();
  }, []);

  const send = (e: any) => {
    e.preventDefault();
    fetch('/eng/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ operationCode: 'default', text }),
    }).then(() => setText(''));
  };

  return (
    <div className="border p-2 rounded space-y-2">
      <h2 className="font-semibold">
        {t('eng.title')}{' '}
        <span className="text-xs bg-yellow-200 px-1">{t('eng.unofficial')}</span>
      </h2>
      <div className="h-48 overflow-y-auto bg-gray-100 p-1 text-sm space-y-1">
        {messages.map((m, i) => (
          <div key={i}>
            <span className="text-gray-500">{m.fromInstanceId}</span>: {m.text}
          </div>
        ))}
      </div>
      <form onSubmit={send} className="flex gap-2">
        <input
          className="border rounded p-1 flex-1"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button
          className="bg-blue-600 text-white px-3 rounded"
          disabled={!text}
          type="submit"
        >
          {t('eng.send')}
        </button>
      </form>
    </div>
  );
}
