/**
 * Matrice des permissions par rôle.
 *
 * ADMIN            — accès total (utilisateurs, chants, plans)
 * RESPONSABLE_CHANTRE — gère chants + plans + peut créer des CHANTRE/LECTEUR
 * CHANTRE          — crée et modifie des chants, mais ne supprime pas et ne gère pas les plans
 * LECTEUR          — lecture seule
 */

export type AppRole = "ADMIN" | "RESPONSABLE_CHANTRE" | "CHANTRE" | "LECTEUR"

/** Peut créer ou modifier un chant */
export function canEditSongs(role: string): boolean {
  return role === "ADMIN" || role === "RESPONSABLE_CHANTRE" || role === "CHANTRE"
}

/** Peut supprimer un chant (soft-delete) */
export function canDeleteSongs(role: string): boolean {
  return role === "ADMIN" || role === "RESPONSABLE_CHANTRE"
}

/** Peut importer des chants en masse */
export function canImportSongs(role: string): boolean {
  return role === "ADMIN" || role === "RESPONSABLE_CHANTRE" || role === "CHANTRE"
}

/** Peut créer, modifier ou supprimer un plan de service */
export function canManagePlans(role: string): boolean {
  return role === "ADMIN" || role === "RESPONSABLE_CHANTRE"
}

/** Peut accéder à la page de gestion des utilisateurs */
export function canAccessUserAdmin(role: string): boolean {
  return role === "ADMIN" || role === "RESPONSABLE_CHANTRE"
}

/** Peut créer un nouvel utilisateur (rôles autorisés selon qui crée) */
export function canCreateUser(role: string): boolean {
  return role === "ADMIN" || role === "RESPONSABLE_CHANTRE"
}

/**
 * Rôles qu'un gestionnaire peut attribuer lors de la création/modification.
 * ADMIN peut tout assigner ; RESPONSABLE_CHANTRE ne peut créer que CHANTRE/LECTEUR.
 */
export function allowedRolesToAssign(creatorRole: string): AppRole[] {
  if (creatorRole === "ADMIN") return ["ADMIN", "RESPONSABLE_CHANTRE", "CHANTRE", "LECTEUR"]
  if (creatorRole === "RESPONSABLE_CHANTRE") return ["CHANTRE", "LECTEUR"]
  return []
}

/** Peut changer le rôle d'un utilisateur, l'activer/désactiver */
export function canChangeUserRole(role: string): boolean {
  return role === "ADMIN"
}

/** Peut supprimer un utilisateur */
export function canDeleteUser(role: string): boolean {
  return role === "ADMIN"
}
