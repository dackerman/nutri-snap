/**
 * Application configuration
 * This file centralizes environment-specific settings
 */

// Determine the environment
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

// Base URL configuration
let baseUrl: string;

if (process.env.APP_BASE_URL) {
  // If explicitly set in environment, use that
  baseUrl = process.env.APP_BASE_URL;
} else if (isProduction) {
  // In production, default to the deployed Replit domain
  if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
    baseUrl = `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
  } else {
    baseUrl = 'https://your-app-domain.com'; // Fallback production URL
  }
} else {
  // In development, use Replit development URL or localhost
  if (process.env.REPL_ID) {
    baseUrl = `https://${process.env.REPL_ID}.id.replit.app`;
  } else {
    baseUrl = 'http://localhost:5000';
  }
}

// Auth-specific configuration
const authConfig = {
  // Session settings
  sessionSecret: process.env.SESSION_SECRET || 'nutrisnap-session-secret',
  cookieMaxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  
  // Google OAuth settings
  googleCallbackUrl: `${baseUrl}/api/auth/google/callback`,
  
  // Other auth settings
  passwordMinLength: 6,
};

// General application settings
const appConfig = {
  port: parseInt(process.env.PORT || '5000', 10),
  isDevelopment,
  isProduction,
  baseUrl,
  auth: authConfig,
  
  // Database settings can be added here
  
  // API rate limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
  },
};

export default appConfig;