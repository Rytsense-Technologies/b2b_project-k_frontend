'use client';

/**
 * Shared overlay stack for QuirriModal, DetailDrawer and FormDrawer.
 * - Esc closes only the topmost overlay.
 * - Tab / Shift+Tab stay inside the topmost overlay.
 * - Focus moves into the overlay on open and returns to the opener on close.
 * - Body scroll is locked while any overlay is open.
 */
import { useEffect, useRef } from 'react';

const stack = [];
let listening = false;
let lockCount = 0;
let savedOverflow = '';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function focusables(root) {
  if (!root) return [];
  return Array.from(root.querySelectorAll(FOCUSABLE)).filter(
    (el) => el.offsetParent !== null || el === document.activeElement,
  );
}

function onDocKeyDown(e) {
  const top = stack[stack.length - 1];
  if (!top) return;
  if (e.key === 'Escape') {
    // A dropdown that handled Esc itself wins; native video controls mark
    // Esc as handled too, but there it should still close the dialog.
    const fromMedia = e.target instanceof HTMLMediaElement;
    if (e.defaultPrevented && !fromMedia) return;
    if (top.busyRef.current) return;
    e.preventDefault();
    top.closeRef.current?.();
    return;
  }
  if (e.key !== 'Tab') return;
  const root = top.ref.current;
  if (!root) return;
  const list = focusables(root);
  if (list.length === 0) {
    e.preventDefault();
    root.focus();
    return;
  }
  const first = list[0];
  const last = list[list.length - 1];
  const active = document.activeElement;
  const inside = root.contains(active);
  if (e.shiftKey) {
    if (!inside || active === first || active === root) {
      e.preventDefault();
      last.focus();
    }
  } else if (!inside || active === last) {
    e.preventDefault();
    first.focus();
  }
}

// A focused <video>/<audio> handles keys itself (Esc, Tab inside native controls), so the bubbling
// listener never sees them. Catch those two keys first, but only when a media element has focus.
function onMediaKeyCapture(e) {
  if (!(e.target instanceof HTMLMediaElement)) return;
  if (e.key !== 'Escape' && e.key !== 'Tab') return;
  onDocKeyDown(e);
  // Handled here; stop the bubbling listener from closing a second layer.
  e.stopPropagation();
}

function lockScroll() {
  if (lockCount === 0) {
    savedOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  lockCount += 1;
}

function unlockScroll() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) document.body.style.overflow = savedOverflow || '';
}

// Child-index path from <body>, so focus can go back to the "same" button
// when the list re-rendered and replaced the original opener node.
function pathOf(el) {
  const path = [];
  let node = el;
  while (node && node !== document.body && node.parentElement) {
    path.unshift(Array.prototype.indexOf.call(node.parentElement.children, node));
    node = node.parentElement;
  }
  return node === document.body ? path : null;
}

function fromPath(path) {
  if (!path) return null;
  let node = document.body;
  for (const i of path) {
    node = node?.children?.[i];
    if (!node) return null;
  }
  return node;
}

function restoreFocus(opener, path, label) {
  let target = opener && document.contains(opener) ? opener : null;
  if (!target) {
    const candidate = fromPath(path);
    if (candidate && candidate.tagName === opener?.tagName
      && (candidate.getAttribute('aria-label') || candidate.textContent) === label) target = candidate;
    // Same spot, re-rendered with a slightly different label: still the best guess.
    else if (candidate && candidate.tagName === opener?.tagName && typeof candidate.focus === 'function') target = candidate;
  }
  if (target && typeof target.focus === 'function') target.focus();
}

// Last element that had focus outside any overlay. List pages often re-render
// their rows the moment a drawer opens, so the clicked "View" button is gone
// (and activeElement is <body>) by the time the overlay effect runs.
let lastFocus = null;
if (typeof document !== 'undefined') {
  document.addEventListener('focusin', (e) => {
    const el = e.target;
    if (!(el instanceof HTMLElement) || el === document.body) return;
    if (el.closest('[role="dialog"]')) return;
    lastFocus = { el, path: pathOf(el), label: el.getAttribute('aria-label') || el.textContent, tag: el.tagName };
  }, true);
}

/** True when `ref` belongs to the topmost open overlay. */
export function isTopOverlay(ref) {
  const top = stack[stack.length - 1];
  return Boolean(top && top.ref === ref);
}

/**
 * @param {boolean} open
 * @param {React.RefObject<HTMLElement>} ref  the dialog element
 * @param {() => void} onClose
 * @param {{ busy?: boolean, initialFocus?: string }} [opts]
 */
export function useOverlay(open, ref, onClose, opts = {}) {
  const closeRef = useRef(onClose);
  const busyRef = useRef(Boolean(opts.busy));
  closeRef.current = onClose;
  busyRef.current = Boolean(opts.busy);
  const initialFocus = opts.initialFocus;

  useEffect(() => {
    if (!open || typeof document === 'undefined') return undefined;
    const entry = { ref, closeRef, busyRef };
    stack.push(entry);
    if (!listening) {
      document.addEventListener('keydown', onDocKeyDown);
      document.addEventListener('keydown', onMediaKeyCapture, true);
      listening = true;
    }
    lockScroll();
    const active = document.activeElement && document.activeElement !== document.body
      ? document.activeElement : null;
    const remembered = !active && lastFocus ? lastFocus : null;
    const opener = active || remembered?.el || null;
    const openerPath = active ? pathOf(active) : remembered?.path || null;
    const openerLabel = active
      ? (active.getAttribute('aria-label') || active.textContent)
      : remembered?.label ?? null;
    const t = setTimeout(() => {
      const root = ref.current;
      if (!root || root.contains(document.activeElement)) return;
      const preferred = initialFocus ? root.querySelector(initialFocus) : null;
      const field = preferred
        || root.querySelector('input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled]), button.quirri-dd__trigger:not([disabled])');
      if (field) field.focus();
      else root.focus();
    }, 30);
    return () => {
      clearTimeout(t);
      const i = stack.indexOf(entry);
      if (i >= 0) stack.splice(i, 1);
      if (stack.length === 0 && listening) {
        document.removeEventListener('keydown', onDocKeyDown);
        document.removeEventListener('keydown', onMediaKeyCapture, true);
        listening = false;
      }
      unlockScroll();
      if (opener) {
        // Defer so a parent overlay re-rendering does not steal it back, and so
        // a list that re-rendered its rows has its new opener node in place.
        setTimeout(() => restoreFocus(opener, openerPath, openerLabel), 0);
      }
    };
  }, [open, ref, initialFocus]);
}
