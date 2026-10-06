export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-center py-32 px-16 bg-white dark:bg-black sm:items-start gap-4">
        <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Launch CF1004 Header Logging
        </h1>
        <p className="text-lg leading-8 text-zinc-600 dark:text-zinc-400">
          Scratch app for reproducing and diagnosing Launch&apos;s{" "}
          <code>CF1004</code> (request header exceeds size limit) error and
          logging header sizes at each hop, since Launch doesn&apos;t log raw
          header content or values for security reasons.
        </p>
      </main>
    </div>
  );
}
