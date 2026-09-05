import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white text-zinc-900 flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full p-8 rounded-2xl white-card space-y-6">
        <div className="h-16 w-16 mx-auto rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center">
          <Search className="h-7 w-7 text-zinc-600" />
        </div>

        <div className="space-y-2">
          <h1 className="font-title text-5xl font-bold tracking-tight text-zinc-950">
            404
          </h1>
          <p className="font-title text-2xl text-zinc-700">
            Page Not Found
          </p>
          <p className="text-sm text-zinc-500 leading-relaxed">
            The page or report you are looking for does not exist or may have been moved.
          </p>
        </div>

        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 w-full px-5 py-3 rounded-xl bg-zinc-900 text-white font-semibold text-sm hover:bg-black transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Return to Image Search</span>
        </Link>
      </div>
    </div>
  );
}
