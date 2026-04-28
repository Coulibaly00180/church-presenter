import { z } from "zod"

export const SongBlockSchema = z.object({
  label: z.string().min(1, "Label requis"),
  type: z.enum(["VERSE", "CHORUS", "BRIDGE", "INTRO", "OUTRO", "OTHER"]),
  content: z.string().min(1, "Paroles requises"),
  order: z.number().int().min(0),
})

export const CreateSongSchema = z.object({
  title: z.string().min(1, "Titre requis"),
  artist: z.string().optional(),
  album: z.string().optional(),
  year: z.string().optional(),
  language: z.string().optional(),
  tags: z.string().optional(),
  blocks: z.array(SongBlockSchema).min(1, "Au moins un bloc requis"),
})

export const UpdateSongSchema = CreateSongSchema.partial().extend({
  blocks: z.array(SongBlockSchema).min(1, "Au moins un bloc requis").optional(),
})

export const CreateUserSchema = z.object({
  firstName: z.string().min(1, "Prénom requis"),
  lastName:  z.string().min(1, "Nom requis"),
  username:  z.string().min(3, "Pseudo minimum 3 caractères").regex(/^[a-z0-9_.-]+$/i, "Pseudo : lettres, chiffres, _ . - uniquement"),
  email:     z.string().email("Email invalide"),
  password:  z.string().min(8, "Mot de passe minimum 8 caractères"),
  role:      z.enum(["ADMIN", "RESPONSABLE_CHANTRE", "CHANTRE", "LECTEUR"]).default("CHANTRE"),
})

export const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Mot de passe actuel requis"),
    newPassword: z.string().min(8, "Nouveau mot de passe minimum 8 caractères"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  })
