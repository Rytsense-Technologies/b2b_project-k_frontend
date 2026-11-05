/**
 * Decides which of several overlapping requests may update the screen.
 * A user reload supersedes everything before it. A silent poll supersedes older polls
 * but never a user reload still in flight: that reload brings fresher data anyway, and
 * dropping it for a poll that then fails would leave the page blank.
 */
export function createLatestRequest() {
  let lastId = 0;
  let currentId = 0;
  let foregroundPending = false;

  return {
    begin(silent = false) {
      lastId += 1;
      const id = lastId;
      if (!silent || !foregroundPending) currentId = id;
      if (!silent) foregroundPending = true;
      return {
        current: () => id === currentId,
        /** Returns true when this request was the current one. */
        finish: () => {
          if (id !== currentId) return false;
          if (!silent) foregroundPending = false;
          return true;
        },
      };
    },
  };
}
