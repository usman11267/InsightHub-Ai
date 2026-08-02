import Link from "next/link";
import Image from "next/image";

/**
 * Split layout for all Clerk screens: brand panel on the left (desktop),
 * the auth form on the right.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel — hidden on mobile where it would only push the form down */}
      <div className="relative hidden overflow-hidden gradient-brand lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-white/10 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 -left-16 size-96 rounded-full bg-black/10 blur-3xl"
        />

        <Link href="/" className="relative flex items-center gap-2 text-white">
          <div className="flex size-8 items-center justify-center overflow-hidden rounded-lg bg-white/20 backdrop-blur">
            <Image
              src="/logo-icon.png"
              alt="InsightHub AI logo"
              width={24}
              height={24}
              className="size-6 object-contain"
            />
          </div>
          <span className="text-base font-semibold tracking-tight">InsightHub AI</span>
        </Link>

        <div className="relative max-w-md">
          <blockquote className="text-2xl font-medium leading-snug text-white">
            &ldquo;We replaced a spreadsheet, a BI license, and two hours of every Monday
            with one upload.&rdquo;
          </blockquote>
          <p className="mt-4 text-sm text-white/70">
            Priya Raghunathan · Head of Analytics, Northwind
          </p>
        </div>

        <div className="relative flex gap-8 text-white/80">
          <div>
            <p className="text-2xl font-semibold text-white">11</p>
            <p className="text-xs">chart types</p>
          </div>
          <div>
            <p className="text-2xl font-semibold text-white">3</p>
            <p className="text-xs">export formats</p>
          </div>
          <div>
            <p className="text-2xl font-semibold text-white">&lt;5s</p>
            <p className="text-xs">to first insight</p>
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex flex-col items-center justify-center px-6 py-12">
        <Link href="/" className="mb-8 flex items-center gap-2 lg:hidden">
          <div className="flex size-8 items-center justify-center overflow-hidden rounded-lg gradient-brand">
            <Image
              src="/logo-icon.png"
              alt="InsightHub AI logo"
              width={24}
              height={24}
              className="size-6 object-contain"
            />
          </div>
          <span className="text-base font-semibold tracking-tight">InsightHub AI</span>
        </Link>

        {children}
      </div>
    </div>
  );
}
