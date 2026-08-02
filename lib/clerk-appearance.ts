import type { SignIn } from "@clerk/nextjs";

/**
 * Clerk 7 doesn't export its `Theme` type directly — it's registered through a
 * global augmentation. Deriving it from a component's prop keeps us on the
 * public surface instead of reaching into dist internals.
 */
type ClerkTheme = NonNullable<React.ComponentProps<typeof SignIn>["appearance"]>;

/**
 * Maps Clerk's components onto the app's design tokens so auth screens don't
 * look like a third-party widget bolted on.
 *
 * Colors are literal because Clerk renders in an isolated tree that doesn't
 * inherit our CSS custom properties.
 */
export const clerkAppearance: ClerkTheme = {
  variables: {
    colorPrimary: "#6d4df6",
    colorPrimaryForeground: "#ffffff",
    colorForeground: "#1c1c22",
    colorMutedForeground: "#71717f",
    colorBackground: "#ffffff",
    colorInput: "#ffffff",
    colorInputForeground: "#1c1c22",
    colorDanger: "#dc2645",
    colorSuccess: "#16a35c",
    borderRadius: "0.625rem",
    fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
    fontSize: "0.875rem",
  },
  elements: {
    rootBox: "w-full max-w-sm",
    card: "shadow-[var(--shadow-elevated)] border border-border rounded-xl bg-card",
    headerTitle: "text-xl font-semibold tracking-tight",
    headerSubtitle: "text-sm text-muted-foreground",
    formButtonPrimary:
      "gradient-brand text-white text-sm font-medium normal-case shadow-sm hover:brightness-110 transition-all",
    formFieldInput:
      "border-input bg-card rounded-lg shadow-sm focus:ring-2 focus:ring-ring/40",
    formFieldLabel: "text-sm font-medium text-foreground",
    socialButtonsBlockButton:
      "border-border rounded-lg hover:bg-accent transition-colors normal-case",
    footerActionLink: "text-primary font-medium hover:underline",
    identityPreviewEditButton: "text-primary",
    dividerLine: "bg-border",
    dividerText: "text-muted-foreground text-xs",
    formFieldSuccessText: "text-success",
    formFieldErrorText: "text-destructive",
    otpCodeFieldInput: "border-input rounded-lg",
    footer: "hidden",
  },
  options: {
    socialButtonsPlacement: "top",
    showOptionalFields: true,
  },
};
