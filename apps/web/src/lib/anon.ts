/** Anonymous session id stored in localStorage. Used so anon players still
 *  get streaks and "already played today" lockout per browser. */
const KEY = "bmt:anon-id";

export function getAnonSessionId(): string {
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}
