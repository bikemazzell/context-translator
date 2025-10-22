/**
 * Toast notification UI
 */

import { CONFIG } from '../../shared/config.js';

/**
 * Show toast notification
 * @param {string} message - Message to display
 * @param {'info'|'success'|'error'} type - Toast type
 * @param {number} duration - Duration in ms
 */
export function showToast(message, type = 'info', duration = CONFIG.ui.toastDuration) {
  const toast = document.createElement('div');
  toast.className = `ct-toast ct-${type}`;
  toast.textContent = message;

  document.body.appendChild(toast);

  setTimeout(() => {
    removeToast(toast);
  }, duration);
}

/**
 * Remove toast element
 * @param {HTMLElement} toastElement - Toast to remove
 */
export function removeToast(toastElement) {
  if (toastElement && toastElement.parentElement) {
    toastElement.parentElement.removeChild(toastElement);
  }
}
