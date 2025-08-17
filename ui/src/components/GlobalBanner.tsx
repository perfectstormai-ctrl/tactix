import { useEffect, useState } from 'react';
import { notifyStore, type Notify } from '../lib/notify.ts';

export default function GlobalBanner() {
  const [items, setItems] = useState<Notify[]>([]);
  useEffect(() => notifyStore.subscribe(setItems), []);
  if (items.length === 0) return null;
  const item = items[0];
  const color =
    item.severity === 'critical'
      ? 'bg-red-600'
      : item.severity === 'warning'
      ? 'bg-amber-500'
      : 'bg-blue-600';
  return (
    <div className={`${color} text-white px-4 py-2 flex justify-between items-center`}> 
      <div className="font-semibold mr-4">
        {item.title}: {item.text}
      </div>
      <button onClick={() => notifyStore.dismiss(item.id)} className="font-bold">×</button>
    </div>
  );
}
