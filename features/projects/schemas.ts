import { z } from "zod";

/**
 * Validation contracts for the Projects module. Shared verbatim between the
 * client forms (React Hook Form resolver) and the Server Actions, so a payload
 * that passes in the browser is exactly what the server accepts.
 */

/**
 * C0 control characters. Built via RegExp so the source file itself stays
 * printable-ASCII and survives copy/paste and tooling that mangles raw bytes.
 */
const CONTROL_CHARS = new RegExp("[\\u0000-\\u001f\\u007f]", "g");

/** Strips control characters and collapses runs of whitespace. */
const sanitizedText = (max: number) =>
  z
    .string()
    .transform((v) =>
      v
        .replace(CONTROL_CHARS, "")
        .replace(/\s+/g, " ")
        .trim()
    )
    .pipe(z.string().max(max));

export const PROJECT_COLORS = [
  "#6d5df6",
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#8b5cf6",
  "#14b8a6",
] as const;

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Pick a valid color");

/** Tags are lowercased and de-duplicated so filtering stays predictable. */
const tags = z
  .array(sanitizedText(24))
  .max(8, "Up to 8 tags")
  .transform((list) => {
    const cleaned = list.map((t) => t.toLowerCase()).filter(Boolean);
    return [...new Set(cleaned)];
  });

export const createProjectSchema = z.object({
  name: sanitizedText(80).pipe(z.string().min(2, "Name must be at least 2 characters")),
  description: sanitizedText(500).optional(),
  color: hexColor.default(PROJECT_COLORS[0]),
  tags: tags.default([]),
});

export const updateProjectSchema = createProjectSchema.partial().extend({
  id: z.string().min(1),
  status: z.enum(["ACTIVE", "ARCHIVED"]).optional(),
});

export const projectIdSchema = z.object({ id: z.string().min(1) });

export const inviteMemberSchema = z.object({
  projectId: z.string().min(1),
  email: z.string().email("Enter a valid email address").toLowerCase(),
  role: z.enum(["ADMIN", "EDITOR", "VIEWER"]),
});

export const updateMemberRoleSchema = z.object({
  projectId: z.string().min(1),
  memberId: z.string().min(1),
  role: z.enum(["ADMIN", "EDITOR", "VIEWER"]),
});

export const removeMemberSchema = z.object({
  projectId: z.string().min(1),
  memberId: z.string().min(1),
});

/** List filters read straight off the URL, so every value arrives as a string. */
export const projectFiltersSchema = z.object({
  q: z.string().trim().max(100).optional(),
  tag: z.string().trim().max(24).optional(),
  status: z.enum(["ACTIVE", "ARCHIVED", "ALL"]).default("ACTIVE"),
  sort: z.enum(["recent", "name", "datasets"]).default("recent"),
  favorites: z.coerce.boolean().default(false),
  page: z.coerce.number().int().min(1).default(1),
});

export type CreateProjectInput = z.input<typeof createProjectSchema>;
export type UpdateProjectInput = z.input<typeof updateProjectSchema>;
export type InviteMemberInput = z.input<typeof inviteMemberSchema>;
export type ProjectFilters = z.output<typeof projectFiltersSchema>;
