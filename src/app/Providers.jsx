'use client';
import { Provider } from 'react-redux';
import { store } from '@/store';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { Toaster } from 'react-hot-toast';

export default function Providers({ children }) {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        {children}
        {/* XB-009: top-right toasts covered each page's one main action (and the Alerts bell), and
            react-hot-toast pauses while hovered, so the action stayed blocked. Top-centre is free. */}
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1e293b',
              color: '#f1f5f9',
              border: '1px solid #334155',
              borderRadius: 'var(--radius-card, 8px)',
              fontSize: '14px',
              fontFamily: 'var(--font)',
            },
          }}
        />
      </QueryClientProvider>
    </Provider>
  );
}
