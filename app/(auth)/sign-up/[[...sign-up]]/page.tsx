import type { Metadata } from "next";
import { SignUp } from "@clerk/nextjs";
import { clerkAppearance } from "@/lib/clerk-appearance";

export const metadata: Metadata = {
  title: "Create your account",
  description: "Start analyzing data with InsightHub AI.",
};

export default function SignUpPage() {
  return <SignUp appearance={clerkAppearance} />;
}
