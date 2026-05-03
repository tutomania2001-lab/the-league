// Global mini-chat state — any screen can call openMiniChat() to pop it open

type MiniChatFriend = {
  id: string;
  name: string;
  avatarUrl: string | null;
};

type Listener = (friend: MiniChatFriend | null) => void;

const listeners = new Set<Listener>();
let current: MiniChatFriend | null = null;

export function openMiniChat(friend: MiniChatFriend) {
  current = friend;
  listeners.forEach(fn => fn(friend));
}

export function closeMiniChat() {
  current = null;
  listeners.forEach(fn => fn(null));
}

export function onMiniChatChange(fn: Listener) {
  listeners.add(fn);
  fn(current); // emit current state immediately
  return () => listeners.delete(fn);
}
