import { describe, it, expect } from 'vitest';
import {
  isValidSPDXLicense,
  getLicenseDetails,
  getLicensesByCategory,
  getLicenseCategory,
  getAllLicenseIds,
  getAllCategories,
  SPDX_LICENSES,
  LICENSE_CATEGORIES,
} from '../src/utils/license.js';

describe('License Utilities', () => {
  describe('isValidSPDXLicense', () => {
    it('should return true for valid SPDX licenses', () => {
      expect(isValidSPDXLicense('MIT')).toBe(true);
      expect(isValidSPDXLicense('Apache-2.0')).toBe(true);
      expect(isValidSPDXLicense('GPL-3.0-only')).toBe(true);
      expect(isValidSPDXLicense('LGPL-3.0-only')).toBe(true);
      expect(isValidSPDXLicense('BSD-3-Clause')).toBe(true);
      expect(isValidSPDXLicense('MPL-2.0')).toBe(true);
      expect(isValidSPDXLicense('CC0-1.0')).toBe(true);
      expect(isValidSPDXLicense('ARR')).toBe(true);
    });

    it('should return false for invalid licenses', () => {
      expect(isValidSPDXLicense('invalid-license')).toBe(false);
      expect(isValidSPDXLicense('')).toBe(false);
      expect(isValidSPDXLicense('MITX')).toBe(false);
      expect(isValidSPDXLicense('gpl-3.0')).toBe(false); // case-sensitive
    });
  });

  describe('getLicenseDetails', () => {
    it('should return details for valid licenses', () => {
      const mitDetails = getLicenseDetails('MIT');
      expect(mitDetails).not.toBeNull();
      expect(mitDetails?.name).toBe('MIT License');
      expect(mitDetails?.url).toBe('https://opensource.org/licenses/MIT');
    });

    it('should return null for invalid licenses', () => {
      expect(getLicenseDetails('invalid')).toBeNull();
    });

    it('should return details for ARR license', () => {
      const arrDetails = getLicenseDetails('ARR');
      expect(arrDetails).not.toBeNull();
      expect(arrDetails?.name).toBe('All Rights Reserved');
      expect(arrDetails?.url).toBe('');
    });
  });

  describe('getLicensesByCategory', () => {
    it('should return licenses for permissive category', () => {
      const permissive = getLicensesByCategory('permissive');
      expect(permissive).toContain('MIT');
      expect(permissive).toContain('Apache-2.0');
      expect(permissive).toContain('BSD-3-Clause');
    });

    it('should return licenses for copyleft category', () => {
      const copyleft = getLicensesByCategory('copyleft');
      expect(copyleft).toContain('GPL-3.0-only');
      expect(copyleft).toContain('LGPL-3.0-only');
      expect(copyleft).toContain('MPL-2.0');
    });

    it('should return empty array for invalid category', () => {
      expect(getLicensesByCategory('invalid')).toEqual([]);
    });

    it('should return licenses for proprietary category', () => {
      const proprietary = getLicensesByCategory('proprietary');
      expect(proprietary).toContain('ARR');
    });

    it('should return licenses for creative commons category', () => {
      const cc = getLicensesByCategory('creative_commons');
      expect(cc).toContain('CC0-1.0');
      expect(cc).toContain('CC-BY-4.0');
    });
  });

  describe('getLicenseCategory', () => {
    it('should return the correct category for licenses', () => {
      expect(getLicenseCategory('MIT')).toBe('permissive');
      expect(getLicenseCategory('GPL-3.0-only')).toBe('copyleft');
      expect(getLicenseCategory('ARR')).toBe('proprietary');
      expect(getLicenseCategory('CC0-1.0')).toBe('permissive'); // CC0-1.0 is in both permissive and creative_commons, returns first match
    });

    it('should return null for invalid licenses', () => {
      expect(getLicenseCategory('invalid')).toBeNull();
    });
  });

  describe('getAllLicenseIds', () => {
    it('should return all license IDs', () => {
      const ids = getAllLicenseIds();
      expect(ids.length).toBeGreaterThan(0);
      expect(ids).toContain('MIT');
      expect(ids).toContain('Apache-2.0');
      expect(ids).toContain('ARR');
    });

    it('should match SPDX_LICENSES keys', () => {
      const ids = getAllLicenseIds();
      expect(ids).toEqual(Object.keys(SPDX_LICENSES));
    });
  });

  describe('getAllCategories', () => {
    it('should return all categories', () => {
      const categories = getAllCategories();
      expect(categories).toContain('permissive');
      expect(categories).toContain('copyleft');
      expect(categories).toContain('proprietary');
      expect(categories).toContain('creative_commons');
      expect(categories).toContain('custom');
    });

    it('should match LICENSE_CATEGORIES keys', () => {
      const categories = getAllCategories();
      expect(categories).toEqual(Object.keys(LICENSE_CATEGORIES));
    });
  });
});
