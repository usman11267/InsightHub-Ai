import type { Metadata } from "next";
import { SignIn } from "@clerk/nextjs";
import { clerkAppearance } from "@/lib/clerk-appearance";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your InsightHub AI workspace.",
};

/**
 * Catch-all route ([[...sign-in]]) so Clerk can own its own sub-routes for
 * factor-two, SSO callbacks, and password reset.
 */
export default function SignInPage() {
  return <SignIn appearance={clerkAppearance} />;
}
