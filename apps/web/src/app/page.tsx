import { CsvIngestionWorkspace } from "@/features/csv-ingestion";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 sm:p-12 bg-background text-foreground">
      <div className="w-full max-w-2xl flex flex-col items-center gap-8 text-center">
        <header className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">CSVora</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Turn raw CSV data into beautiful tables.
          </p>
        </header>

        <section className="w-full">
          <CsvIngestionWorkspace />
        </section>
      </div>
    </main>
  );
}
