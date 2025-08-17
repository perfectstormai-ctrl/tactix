export type Notify = {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  text: string;
  at: string;
};

export const notifyStore = (() => {
  const subs: ((n: Notify[]) => void)[] = [];
  let items: Notify[] = [];
  function publish() {
    subs.forEach((fn) => fn(items));
  }
  return {
    subscribe(fn: (n: Notify[]) => void) {
      subs.push(fn);
      fn(items);
      return () => {
        const i = subs.indexOf(fn);
        if (i >= 0) subs.splice(i, 1);
      };
    },
    push(n: Notify) {
      items = [n, ...items].slice(0, 50);
      publish();
    },
    dismiss(id: string) {
      items = items.filter((x) => x.id !== id);
      publish();
    },
  };
})();
