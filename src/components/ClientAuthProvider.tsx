'use client';

import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';

export function ClientAuthProvider({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
