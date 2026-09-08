import AdminShell from '@/components/AdminShell';
import { ToastProvider } from '@/components/Toast';

export default function AdminLayout({ children }: LayoutProps<'/admin'>) {
  return (
    <ToastProvider>
      <AdminShell>{children}</AdminShell>
    </ToastProvider>
  );
}
