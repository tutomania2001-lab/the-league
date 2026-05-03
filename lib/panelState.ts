type Listener = (open: boolean) => void;
const listeners = new Set<Listener>();
let friendsPanelOpen = false;

export function setFriendsPanelOpen(open: boolean) {
  friendsPanelOpen = open;
  listeners.forEach(fn => fn(open));
}

export function onFriendsPanelChange(fn: Listener) {
  listeners.add(fn);
  fn(friendsPanelOpen);
  return () => listeners.delete(fn);
}
