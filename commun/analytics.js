// Vercel Web Analytics — initialized with @vercel/analytics package
// This provides better functionality than the legacy inline script approach
import { inject } from '@vercel/analytics';

// Initialize analytics with auto mode detection
// - Production: sends events to Vercel servers
// - Development: logs events to console
inject({
  mode: 'auto',
  debug: false
});
