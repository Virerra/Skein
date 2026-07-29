// Opt-in API key persistence. Deliberately its own module, not folded
// into settings.js -- that module is documented as never storing the
// key itself, and mixing "preferences" with "a credential" in the same
// blob makes it too easy to lose track of which one this is.
//
// Off by default. Turning it on writes the key to localStorage in
// plaintext, readable by any JS running on this page: a compromised
// dependency, a malicious browser extension with page access, or
// anyone else who uses this browser profile. Reasonable on a personal
// machine you trust; not reasonable on a shared or public computer.
// Turning the preference back off also forgets whatever was already
// saved, not just stops saving future keys.

const REMEMBER_FLAG_KEY = "skein-remember-api-key";
const KEY_STORAGE_KEY = "skein-remembered-api-key";

export function getRememberPreference() {
  try {
    return localStorage.getItem(REMEMBER_FLAG_KEY) === "true";
  } catch {
    return false;
  }
}

export function setRememberPreference(remember) {
  try {
    localStorage.setItem(REMEMBER_FLAG_KEY, remember ? "true" : "false");
    if (!remember) localStorage.removeItem(KEY_STORAGE_KEY);
  } catch {
    // localStorage unavailable (private browsing, quota, etc.) -- fail
    // silently, same fallback as everywhere else this app touches
    // storage; the key just won't persist, which is the safe default.
  }
}

export function loadRememberedApiKey() {
  try {
    return getRememberPreference() ? localStorage.getItem(KEY_STORAGE_KEY) || "" : "";
  } catch {
    return "";
  }
}

export function saveRememberedApiKey(key) {
  try {
    if (getRememberPreference()) localStorage.setItem(KEY_STORAGE_KEY, key);
  } catch {
    // see above
  }
}
