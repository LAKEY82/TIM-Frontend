export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-svh flex-1 items-center justify-center bg-muted/40 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <span className="flex size-10 items-center justify-center rounded-lg bg-primary text-lg font-bold text-primary-foreground" aria-hidden>
            T
          </span>
          <p className="text-sm font-semibold tracking-tight">Theiavora Management System</p>
        </div>
        {children}
      </div>
    </main>
  );
}
