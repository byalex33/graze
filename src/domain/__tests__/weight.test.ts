import { defaultWeightUnit, formatWeight, formatWeightChange, fromWheel, toWheel, weightTrend } from '../weight';

describe('weight units', () => {
  it('formats in kg, stones and pounds', () => {
    expect(formatWeight(72.44, 'kg')).toBe('72.4 kg');
    expect(formatWeight(72.44, 'st')).toBe('11 st 6 lb');
    expect(formatWeight(72.44, 'lb')).toBe('160 lb');
  });

  it('round-trips through the wheels', () => {
    expect(toWheel(72.44, 'kg')).toEqual([72, 4]);
    expect(fromWheel(72, 4, 'kg')).toBeCloseTo(72.4);
    expect(toWheel(72.44, 'st')).toEqual([11, 6]);
    expect(formatWeight(fromWheel(11, 6, 'st'), 'st')).toBe('11 st 6 lb');
    expect(formatWeight(fromWheel(160, 0, 'lb'), 'lb')).toBe('160 lb');
  });

  it('formats changes with a proper minus sign', () => {
    expect(formatWeightChange(-0.64, 'kg')).toBe('−0.6 kg');
    expect(formatWeightChange(0.9, 'st')).toBe('+2 lb');
  });

  it('defaults to stones in the UK', () => {
    expect(defaultWeightUnit('uk')).toBe('st');
    expect(defaultWeightUnit('us')).toBe('lb');
    expect(defaultWeightUnit('metric')).toBe('kg');
    expect(defaultWeightUnit(undefined)).toBe('kg');
  });
});

describe('weightTrend', () => {
  const at = (day: number) => new Date(2026, 9, day, 7, 30).getTime();

  it('is empty before the first Weigh-in and then carries forward', () => {
    const trend = weightTrend([{ at: at(10), kg: 80 }], '2026-10-12', 4);
    expect(trend).toEqual([null, 80, 80, 80]);
  });

  it('smooths a one-day spike', () => {
    const trend = weightTrend(
      [{ at: at(10), kg: 80 }, { at: at(11), kg: 82 }, { at: at(12), kg: 80 }],
      '2026-10-12',
      3,
    );
    expect(trend[1]).toBeCloseTo(80.5);
    expect(trend[2]).toBeLessThan(80.5);
    expect(trend[2]).toBeGreaterThan(80);
  });

  it('uses the last Weigh-in of a Day', () => {
    const trend = weightTrend([{ at: at(12) - 3600_000, kg: 90 }, { at: at(12), kg: 80 }], '2026-10-12', 1);
    expect(trend).toEqual([80]);
  });

  it('warms up from Weigh-ins before the window', () => {
    const trend = weightTrend([{ at: new Date(2026, 8, 20).getTime(), kg: 75 }], '2026-10-12', 1);
    expect(trend).toEqual([75]);
  });
});
