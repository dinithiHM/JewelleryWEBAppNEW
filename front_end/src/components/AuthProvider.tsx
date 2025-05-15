"use client";

import { AuthProvider as CustomAuthProvider } from "@/contexts/AuthContext";

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CustomAuthProvider>{children}</CustomAuthProvider>;
}
