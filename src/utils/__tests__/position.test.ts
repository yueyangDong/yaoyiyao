import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@capacitor/geolocation', () => ({
  Geolocation: {
    getCurrentPosition: vi.fn(),
  },
}));

import { Geolocation } from '@capacitor/geolocation';
import { getPositionNative, getPositionWithCity } from '../weatherApi';

describe('getPositionNative', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (Geolocation.getCurrentPosition as any).mockResolvedValue({
      coords: { latitude: 31.2, longitude: 121.5 },
    });
  });

  it('returns lat/lng from geolocation plugin', async () => {
    const pos = await getPositionNative();
    expect(pos.lat).toBeCloseTo(31.2);
    expect(pos.lng).toBeCloseTo(121.5);
  });

  it('throws when geolocation fails', async () => {
    (Geolocation.getCurrentPosition as any).mockRejectedValue(new Error('denied'));
    await expect(getPositionNative()).rejects.toThrow('denied');
  });

  it('getPositionWithCity attaches city via reverseGeocode', async () => {
    const pos = await getPositionWithCity();
    expect(pos.lat).toBeCloseTo(31.2);
    expect(pos.city).toBeTruthy();
  });
});
