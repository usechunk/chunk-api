/**
 * SPDX License validation utilities
 * Common SPDX license identifiers for Minecraft mods and modpacks
 */

// Common SPDX licenses used in the Minecraft modding community
export const SPDX_LICENSES: Record<string, { name: string; url: string }> = {
  'MIT': {
    name: 'MIT License',
    url: 'https://opensource.org/licenses/MIT',
  },
  'Apache-2.0': {
    name: 'Apache License 2.0',
    url: 'https://opensource.org/licenses/Apache-2.0',
  },
  'GPL-3.0-only': {
    name: 'GNU General Public License v3.0 only',
    url: 'https://www.gnu.org/licenses/gpl-3.0.html',
  },
  'GPL-3.0-or-later': {
    name: 'GNU General Public License v3.0 or later',
    url: 'https://www.gnu.org/licenses/gpl-3.0.html',
  },
  'LGPL-3.0-only': {
    name: 'GNU Lesser General Public License v3.0 only',
    url: 'https://www.gnu.org/licenses/lgpl-3.0.html',
  },
  'LGPL-3.0-or-later': {
    name: 'GNU Lesser General Public License v3.0 or later',
    url: 'https://www.gnu.org/licenses/lgpl-3.0.html',
  },
  'BSD-3-Clause': {
    name: 'BSD 3-Clause "New" or "Revised" License',
    url: 'https://opensource.org/licenses/BSD-3-Clause',
  },
  'BSD-2-Clause': {
    name: 'BSD 2-Clause "Simplified" License',
    url: 'https://opensource.org/licenses/BSD-2-Clause',
  },
  'MPL-2.0': {
    name: 'Mozilla Public License 2.0',
    url: 'https://opensource.org/licenses/MPL-2.0',
  },
  'CC0-1.0': {
    name: 'Creative Commons Zero v1.0 Universal',
    url: 'https://creativecommons.org/publicdomain/zero/1.0/',
  },
  'CC-BY-4.0': {
    name: 'Creative Commons Attribution 4.0 International',
    url: 'https://creativecommons.org/licenses/by/4.0/',
  },
  'CC-BY-SA-4.0': {
    name: 'Creative Commons Attribution ShareAlike 4.0 International',
    url: 'https://creativecommons.org/licenses/by-sa/4.0/',
  },
  'CC-BY-NC-4.0': {
    name: 'Creative Commons Attribution NonCommercial 4.0 International',
    url: 'https://creativecommons.org/licenses/by-nc/4.0/',
  },
  'CC-BY-NC-SA-4.0': {
    name: 'Creative Commons Attribution NonCommercial ShareAlike 4.0 International',
    url: 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
  },
  'Unlicense': {
    name: 'The Unlicense',
    url: 'https://unlicense.org/',
  },
  'ISC': {
    name: 'ISC License',
    url: 'https://opensource.org/licenses/ISC',
  },
  // Official WTFPL site does not support HTTPS as of 2024-06; HTTP is used intentionally.
  'WTFPL': {
    name: 'Do What The F*ck You Want To Public License',
    url: 'http://www.wtfpl.net/',
  },
  'Zlib': {
    name: 'zlib License',
    url: 'https://opensource.org/licenses/Zlib',
  },
  'ARR': {
    name: 'All Rights Reserved',
    url: '',
  },
  'LicenseRef-Custom': {
    name: 'Custom License',
    url: '',
  },
};

// License categories for filtering
export const LICENSE_CATEGORIES: Record<string, string[]> = {
  permissive: [
    'MIT',
    'Apache-2.0',
    'BSD-3-Clause',
    'BSD-2-Clause',
    'ISC',
    'Unlicense',
    'CC0-1.0',
    'Zlib',
    'WTFPL',
  ],
  copyleft: [
    'GPL-3.0-only',
    'GPL-3.0-or-later',
    'LGPL-3.0-only',
    'LGPL-3.0-or-later',
    'MPL-2.0',
    'CC-BY-SA-4.0',
    'CC-BY-NC-SA-4.0',
  ],
  proprietary: ['ARR'],
  creative_commons: [
    'CC0-1.0',
    'CC-BY-4.0',
    'CC-BY-SA-4.0',
    'CC-BY-NC-4.0',
    'CC-BY-NC-SA-4.0',
  ],
  custom: ['LicenseRef-Custom'],
};

/**
 * Check if a license ID is a valid SPDX identifier
 */
export function isValidSPDXLicense(licenseId: string): boolean {
  return licenseId in SPDX_LICENSES;
}

/**
 * Get license details by ID
 */
export function getLicenseDetails(licenseId: string): { name: string; url: string } | null {
  return SPDX_LICENSES[licenseId] || null;
}

/**
 * Get all licenses in a category
 */
export function getLicensesByCategory(category: string): string[] {
  return LICENSE_CATEGORIES[category] || [];
}

/**
 * Get the category of a license
 */
export function getLicenseCategory(licenseId: string): string | null {
  for (const [category, licenses] of Object.entries(LICENSE_CATEGORIES)) {
    if (licenses.includes(licenseId)) {
      return category;
    }
  }
  return null;
}

/**
 * Get all available SPDX license IDs
 */
export function getAllLicenseIds(): string[] {
  return Object.keys(SPDX_LICENSES);
}

/**
 * Get all license categories
 */
export function getAllCategories(): string[] {
  return Object.keys(LICENSE_CATEGORIES);
}

/**
 * Transform a modpack object to include license info (licenseName and resolved licenseUrl)
 */
export function addLicenseInfo<T extends { licenseId: string | null; licenseUrl: string | null }>(
  modpack: T
): T & { licenseName: string | null; licenseUrl: string | null } {
  const licenseDetails = modpack.licenseId ? getLicenseDetails(modpack.licenseId) : null;
  return {
    ...modpack,
    licenseName: licenseDetails?.name ?? null,
    licenseUrl: modpack.licenseUrl ?? licenseDetails?.url ?? null,
  };
}
