/**
 * Utility functions for the application
 */

// Combine class names with proper precedence
export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

// Format large numbers for display
export function formatNumber(number, options = {}) {
  const { precision = 2, currency = false } = options;
  
  if (!number && number !== 0) return '—';
  
  if (currency) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: precision,
      maximumFractionDigits: precision,
    }).format(number);
  }
  
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  }).format(number);
}

// Calculate percentage change
export function calculatePercentChange(current, previous) {
  if (!previous || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

// Format percentage for display
export function formatPercent(percent, options = {}) {
  const { precision = 2, includeSign = true } = options;
  
  if (percent === null || percent === undefined) return '—';
  
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
    signDisplay: includeSign ? 'exceptZero' : 'auto',
  }).format(percent / 100);
  
  return formatted;
}

// Truncate text with ellipsis
export function truncateText(text, maxLength = 50) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  
  return `${text.substring(0, maxLength)}...`;
}

// Format date
export function formatDate(date, format = 'medium') {
  if (!date) return '';
  
  const dateObj = new Date(date);
  
  if (isNaN(dateObj.getTime())) return '';
  
  const options = {
    short: { month: 'short', day: 'numeric' },
    medium: { month: 'short', day: 'numeric', year: 'numeric' },
    long: { month: 'long', day: 'numeric', year: 'numeric' },
    full: { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' },
  };
  
  return new Intl.DateTimeFormat('en-US', options[format] || options.medium)
    .format(dateObj);
}

// Sleep utility for async operations
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Detect if in browser environment
export const isBrowser = typeof window !== 'undefined';

// Local storage helpers with error handling
export const localStorage = {
  get: (key, defaultValue = null) => {
    if (!isBrowser) return defaultValue;
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error(`Error getting item ${key} from localStorage:`, error);
      return defaultValue;
    }
  },
  
  set: (key, value) => {
    if (!isBrowser) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error setting item ${key} in localStorage:`, error);
    }
  },
  
  remove: (key) => {
    if (!isBrowser) return;
    try {
      window.localStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing item ${key} from localStorage:`, error);
    }
  },
  
  clear: () => {
    if (!isBrowser) return;
    try {
      window.localStorage.clear();
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  },
};