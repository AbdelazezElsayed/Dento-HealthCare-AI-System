export default function DentocadPage() {
  return (
    <div className="flex min-h-[calc(100vh-12rem)] items-center justify-center px-4">
      <div className="rounded-2xl border border-primary/20 bg-primary/5 px-10 py-12 text-center shadow-sm">
        <h1 className="inline-block rounded-lg bg-background px-5 py-2 text-4xl font-bold tracking-tight text-foreground shadow-sm">
          DentoCAD
        </h1>
        <p className="mx-auto mt-6 w-fit rounded-full bg-primary px-6 py-2 text-2xl font-bold text-primary-foreground shadow-sm">
          Coming Soon
        </p>
        <p className="mt-4 text-base font-semibold text-foreground/80">
          This feature is currently under development.
        </p>
      </div>
    </div>
  );
}
