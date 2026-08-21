/**
 * Utility functions for debugging and fixing session issues
 * These functions can be called from the browser console
 */
import { localizeHref } from '@/data/config';

/**
 * Clears all session data - useful for fixing corrupted sessions
 * Usage: clearSession()
 */
export function clearSession(): void {
  if (typeof window !== 'undefined') {
    // The JWT lives in an httpOnly cookie now — clear it server-side.
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    localStorage.removeItem('user');
    localStorage.removeItem('cart');
    console.log('✅ Session cleared successfully. Please refresh the page.');
  }
}

/**
 * Validates current session and shows detailed information
 * Usage: checkSession()
 */
export function checkSession(): void {
  if (typeof window === 'undefined') return;

  const user = localStorage.getItem('user');
  const cart = localStorage.getItem('cart');

  console.log('📊 Session Summary:');
  console.log('👤 User Data:', user ? JSON.parse(user) : null);
  console.log('🔑 Access Token: (httpOnly cookie — not readable from JS)');
  console.log('🛒 Cart Data:', cart ? JSON.parse(cart) : null);
}

/**
 * Shows all localStorage keys related to propeller
 */
export function showPropellerStorage(): void {
  if (typeof window === 'undefined') return;

  const keys = Object.keys(localStorage);
  console.log('🔍 localStorage keys:', keys);
  keys.forEach(key => {
    const value = localStorage.getItem(key);
    console.log(`${key}:`, value);
  });
}

/**
 * Forces a re-login by navigating to login page
 */
export function forceReLogin(): void {
  clearSession();
  if (typeof window !== 'undefined') {
    const lang = localStorage.getItem('preferred_language') || 'NL';
    window.location.href = localizeHref('/login', lang);
  }
}

/**
 * Creates a backup of current localStorage
 */
export function backupLocalStorage(): Record<string, string | null> {
  if (typeof window === 'undefined') return {};

  const backup: Record<string, string | null> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      backup[key] = localStorage.getItem(key);
    }
  }
  console.log('💾 localStorage backup created:', backup);
  return backup;
}

/**
 * Restores localStorage from backup
 */
export function restoreLocalStorage(backup: Record<string, string | null>): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.clear();
    Object.entries(backup).forEach(([key, value]) => {
      if (value !== null) {
        localStorage.setItem(key, value);
      }
    });
    console.log('✅ localStorage restored from backup. Please refresh the page.');
  } catch (error) {
    console.error('❌ Failed to restore localStorage:', error);
  }
}

// Make functions available globally for console debugging
declare global {
  interface Window {
    clearSession: typeof clearSession;
    checkSession: typeof checkSession;
    showPropellerStorage: typeof showPropellerStorage;
    forceReLogin: typeof forceReLogin;
  }
}

// Attach to window for console access
if (typeof window !== 'undefined') {
  window.clearSession = clearSession;
  window.checkSession = checkSession;
  window.showPropellerStorage = showPropellerStorage;
  window.forceReLogin = forceReLogin;
}

// Make functions available globally in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  const sessionUtils = {
    clearSession,
    checkSession,
    showPropellerStorage,
    forceReLogin,
    backupLocalStorage,
    restoreLocalStorage
  };
  
  (window as typeof window & { sessionUtils: typeof sessionUtils }).sessionUtils = sessionUtils;

  console.log('🔧 Session utilities available at window.sessionUtils');
  console.log('📖 Usage:');
  console.log('  • window.sessionUtils.checkSession() - Check current session');
  console.log('  • window.sessionUtils.showPropellerStorage() - Show propeller data');
  console.log('  • window.sessionUtils.clearSession() - Clear all session data');
  console.log('  • window.sessionUtils.forceReLogin() - Navigate to login page');
}
