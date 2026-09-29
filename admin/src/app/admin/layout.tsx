import ThemeProvider from '@/components/ThemeProvider';
import { ToastProvider } from '@/components/Toast';

export default function AdminLayout({ children }: LayoutProps<'/admin'>) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AdminShell>{children}</AdminShell>
      </ToastProvider>
    </ThemeProvider>
  );
}
