import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

// Re-evaluation trigger
export default defineConfig(() => {
  return {
    base: '/',
    plugins: [react(), tailwindcss()],
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify('https://smddiufwpdpmzhvideto.supabase.co'),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNtZGRpdWZ3cGRwbXpodmlkZXRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNjMyMzMsImV4cCI6MjA4NzkzOTIzM30.HpEtvTqE3E0UgsbOXHRh3qpsyUMpFtPHuRD_GCSF_5o'),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        'lucide-react': path.resolve(__dirname, './src/utils/lucide-adapter.tsx'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
