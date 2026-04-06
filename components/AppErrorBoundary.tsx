"use client";

import ErrorBoundary from "./ErrorBoundary";

export default function AppErrorBoundary({ children }: { children: React.ReactNode }) {
  return <ErrorBoundary>{children}</ErrorBoundary>;
}
