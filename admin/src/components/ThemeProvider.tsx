'use client';

import { ThemeProvider as CustomThemeProvider } from '@/lib/themes';
import type { ReactNode } from 'react';

export function ThemeProvider({ children }: { children: ReactNode }) {
  return <CustomThemeProvider>{children}</CustomThemeProvider>;
}