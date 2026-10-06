import { Button } from "@csvora/ui";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-background text-foreground">
      <div className="flex flex-col items-center gap-4 text-center max-w-md">
        <h1 className="text-4xl font-bold tracking-tight">CSVora</h1>
        <p className="text-muted-foreground text-lg">Turn raw CSV data into beautiful tables.</p>
        <div className="pt-2">
          <Button variant="default">Get Started</Button>
        </div>
      </div>
    </main>
  );
}
