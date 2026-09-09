import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const GITHUB_PAGES_BASE = '/SEP/';

function resolveBase(): string {
  const fromEnv = process.env.VITE_BASE_PATH?.replaceAll('\\', '/');

  if (fromEnv && fromEnv.includes('SEP')) {
    return GITHUB_PAGES_BASE;
  }

  if (process.env.GITHUB_ACTIONS === 'true') {
    return GITHUB_PAGES_BASE;
  }

  return '/';
}

export default defineConfig({
  base: resolveBase(),
  plugins: [react()],
});
