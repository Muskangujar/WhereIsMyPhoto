import Link from "next/link";
import { ArrowLeft, Lock } from "lucide-react";

export const metadata = {
  title: "Privacy Policy - WhereIsMyPhoto",
  description: "Privacy policy, data handling, and transient image processing principles of WhereIsMyPhoto.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white text-zinc-900 flex flex-col">
      <header className="border-b border-zinc-200 bg-white/95 sticky top-0 z-40 backdrop-blur">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-950 transition-colors font-medium"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Search Engine</span>
          </Link>
          <span className="font-title text-xl font-bold tracking-tight text-zinc-950">
            WhereIsMyPhoto
          </span>
        </div>
      </header>

      <main className="max-w-4xl w-full mx-auto px-6 py-12 space-y-10">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 border border-zinc-300 text-xs text-zinc-700">
            <Lock className="h-3.5 w-3.5" />
            <span>Data Protection & Transient Processing</span>
          </div>
          <h1 className="font-title text-4xl sm:text-5xl font-bold text-zinc-950 tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-sm text-zinc-500">
            Last Updated: September 2026
          </p>
        </div>

        <section className="space-y-4 text-sm text-zinc-700 leading-relaxed">
          <h2 className="font-title text-2xl font-bold text-zinc-950">
            1. Zero Image Storage Policy
          </h2>
          <p>
            When you submit a photograph to WhereIsMyPhoto, the image file is processed entirely in volatile temporary RAM to compute the SHA-256 cryptographic digest, perceptual hash, and perform reverse visual lookup queries.
          </p>
          <p>
            We <strong>do not permanently store, retain, or sell your original uploaded images</strong>. Once the search session is concluded or your browser window is refreshed, all transient memory buffers are cleared.
          </p>
        </section>

        <section className="space-y-4 text-sm text-zinc-700 leading-relaxed">
          <h2 className="font-title text-2xl font-bold text-zinc-950">
            2. Public Data Only
          </h2>
          <p>
            Our search pipeline queries only publicly accessible endpoints, indexed social media posts, public pins, forum posts, and open web blogs. We never attempt to access private accounts, locked profiles, or password-protected databases.
          </p>
        </section>

        <section className="space-y-4 text-sm text-zinc-700 leading-relaxed">
          <h2 className="font-title text-2xl font-bold text-zinc-950">
            3. Blockchain Attestations
          </h2>
          <p>
            If you elect to record a search verification to a blockchain testnet or smart contract, only one-way cryptographic hashes (such as the SHA-256 image digest and Merkle root) are published on-chain. The raw image itself is never uploaded to the public blockchain ledger.
          </p>
        </section>

        <section className="space-y-4 text-sm text-zinc-700 leading-relaxed">
          <h2 className="font-title text-2xl font-bold text-zinc-950">
            4. Contact & Compliance
          </h2>
          <p>
            If you have questions regarding data compliance, privacy concerns, or removal of public URLs from our indexed search cache, contact us directly through the project repository or administrative channels.
          </p>
        </section>
      </main>

      <footer className="border-t border-zinc-200 bg-zinc-50 py-8 text-center text-xs text-zinc-500 mt-auto">
        <p>WhereIsMyPhoto • Committed to user privacy and ethical data practices</p>
      </footer>
    </div>
  );
}
