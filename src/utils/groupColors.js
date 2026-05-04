// ─── HSL Rotational Color Generator ──────────────────────────────────────────
// Generates a stable, unique color theme from a groupId string.
// Uses a simple hash to map the ID to a hue value (0–360).

/**
 * Generate a color theme object from a groupId string.
 *
 * @param {string} groupId
 * @returns {{ primary: string, light: string, dark: string, bg: string }}
 */
export function getGroupColor(groupId) {
  if (!groupId) {
    return {
      primary: 'hsl(245, 70%, 55%)',
      light:   'hsl(245, 70%, 85%)',
      dark:    'hsl(245, 70%, 35%)',
      bg:      'hsl(245, 70%, 10%)',
    };
  }

  let hash = 0;
  for (let i = 0; i < groupId.length; i++) {
    hash = groupId.charCodeAt(i) + ((hash << 5) - hash);
  }

  const hue = Math.abs(hash) % 360;

  return {
    primary: `hsl(${hue}, 70%, 55%)`,
    light:   `hsl(${hue}, 70%, 85%)`,
    dark:    `hsl(${hue}, 70%, 35%)`,
    bg:      `hsl(${hue}, 70%, 10%)`,
  };
}

/**
 * Get a CSS hex-like string suitable for inline use.
 * Returns the primary hsl value for a given groupId.
 *
 * @param {string} groupId
 * @returns {string}
 */
export function getGroupPrimaryColor(groupId) {
  return getGroupColor(groupId).primary;
}

/**
 * Get color theme with explicit hue for custom usage.
 *
 * @param {string} groupId
 * @returns {{ hue: number, primary: string, light: string, dark: string, bg: string }}
 */
export function getGroupColorWithHue(groupId) {
  if (!groupId) {
    return { hue: 245, ...getGroupColor(groupId) };
  }

  let hash = 0;
  for (let i = 0; i < groupId.length; i++) {
    hash = groupId.charCodeAt(i) + ((hash << 5) - hash);
  }

  const hue = Math.abs(hash) % 360;

  return {
    hue,
    primary: `hsl(${hue}, 70%, 55%)`,
    light:   `hsl(${hue}, 70%, 85%)`,
    dark:    `hsl(${hue}, 70%, 35%)`,
    bg:      `hsl(${hue}, 70%, 10%)`,
  };
}
