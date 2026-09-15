import { z } from "zod";

export const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
export type SignInInput = z.infer<typeof signInSchema>;

// company/phone are collected later in features/users profile, not at
// sign-up (features/auth.md §4).
export const signUpSchema = z.object({
  name: z.string().min(1, "Full name is required"),
  email: z.string().email(),
  password: z.string().min(8),
});
export type SignUpInput = z.infer<typeof signUpSchema>;
