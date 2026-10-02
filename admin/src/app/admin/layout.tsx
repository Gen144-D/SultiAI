import AdminShell from '@/components/AdminShell';
import { ToastProvider } from '@/components/Toast';

// ThemeProvider is mounted once in the root layout, which already wraps every
// route including /admin. Mounting a second one here would shadow the root
// context for the whole admin subtree.
export default function AdminLayout({ children }: LayoutProps<'/admin'>) {
  return (
    <ToastProvider>
      <AdminShell>{children}</AdminShell>
    </ToastProvider>
  );
}
