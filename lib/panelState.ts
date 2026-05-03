type Listener = (open: boolean) => void;

// Friends panel
const friendsListeners = new Set<Listener>();
let friendsPanelOpen = false;

export function setFriendsPanelOpen(open: boolean) {
  friendsPanelOpen = open;
  friendsListeners.forEach(fn => fn(open));
}
export function onFriendsPanelChange(fn: Listener) {
  friendsListeners.add(fn);
  fn(friendsPanelOpen);
  return () => friendsListeners.delete(fn);
}

// Chat dropdown
const chatListeners = new Set<Listener>();
let chatDropdownOpen = false;

export function setChatDropdownOpen(open: boolean) {
  chatDropdownOpen = open;
  chatListeners.forEach(fn => fn(open));
}
export function onChatDropdownChange(fn: Listener) {
  chatListeners.add(fn);
  fn(chatDropdownOpen);
  return () => chatListeners.delete(fn);
}
