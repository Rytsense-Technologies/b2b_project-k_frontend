/**
 * SECB-009: runs before any app module. react-hot-toast styles through goober, which creates its
 * <style id="_goober"> at import time and stamps it with window.__nonce__; without the nonce the
 * CSP blocks the toast styles. Next's own scripts carry this page's nonce (browsers hide the
 * attribute, the property keeps it).
 */
if (typeof window !== 'undefined' && !window.__nonce__) {
  const el = document.querySelector('script[nonce]');
  const nonce = el && (el.nonce || el.getAttribute('nonce'));
  if (nonce) window.__nonce__ = nonce;
}
