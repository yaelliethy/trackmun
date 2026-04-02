/**
 * Default landing path for a role (used by / and post-login when no valid "from").
 */
export function getDefaultHomeForRole(role: string): string {
  switch (role) {
    case "oc":
      return "/oc"
    case "admin":
      return "/admin/delegates"
    case "chair":
      return "/chairs/assigned"
    case "delegate":
      return "/dashboard"
    default:
      return "/login"
  }
}

/**
 * After password login, only return to `from` if it matches this user's primary area.
 * Prevents e.g. an admin who was on /chairs during impersonation from being sent back
 * to the chair dashboard on their next real login.
 */
export function resolvePostLoginRedirect(
  fromPath: string | null | undefined,
  role: string
): string {
  const home = getDefaultHomeForRole(role)
  if (!fromPath || fromPath === "/login") return home
  if (!fromPath.startsWith("/") || fromPath.startsWith("//")) return home

  if (role === "admin") {
    return fromPath.startsWith("/admin") ? fromPath : home
  }
  if (role === "chair") {
    return fromPath.startsWith("/chairs") ? fromPath : home
  }
  if (role === "oc") {
    return fromPath.startsWith("/oc") ? fromPath : home
  }
  if (role === "delegate") {
    return fromPath.startsWith("/dashboard") ? fromPath : home
  }
  return home
}
