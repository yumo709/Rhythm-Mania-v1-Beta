/*
 * RhythmMania - High-Performance Rhythm Game Platform
 * Copyright (C) 2026 Yumo (yumo-ymspace). All rights reserved.
 *
 * This source code is licensed under the PolyForm Perimeter License 1.0.1.
 * You may modify and use this file for non-competing purposes, provided
 * that open and explicit attribution is maintained.
 *
 * For the full license terms, see the LICENSE file in the root directory
 * from: https://github.com/yumo-ymspace/RhythmMania
 */

/*
 * Fluid 1366x768 baseline + slant-perpendicular mod column gaps.
 * The rectangular box overlap is negative (overlap) while the daylight
 * between the slanted sides stays positive; the overlap is derived live so
 * the perpendicular daylight holds across viewport sizes.
 */

import { describe, it, expect } from 'vitest';
import {
  MOD_COL_H_REF,
  MOD_GAP_REF_PERP_PX,
  MOD_RECT_REF_PX,
  MOD_SLANT_COS,
  MOD_SLANT_TAN,
  MOD_T_ACU,
  MOD_T_OBT,
  modColumnRectGap,
  modRmUnit,
} from '../src/components/ModSelectOverlay';
import { rmUnitScale } from '../src/ui/lazer/motion';

const T_SUM = MOD_T_OBT + MOD_T_ACU;

describe('1366x768 fluid baseline (rmU)', () => {
  it('is 1 at the 1366x768 baseline', () => {
    expect(modRmUnit(1366, 768)).toBeCloseTo(1, 10);
    expect(rmUnitScale(1366, 768)).toBeCloseTo(1, 10);
  });

  it('scales as min(vw/1366, vh/768) on desktop', () => {
    expect(modRmUnit(1600, 900)).toBeCloseTo(Math.min(1600 / 1366, 900 / 768), 10);
    expect(rmUnitScale(2732, 1536)).toBeCloseTo(2, 10);
  });

  it('stays 1 in the compact band (width <= 720)', () => {
    expect(modRmUnit(720, 900)).toBe(1);
    expect(modRmUnit(390, 844)).toBe(1);
    expect(rmUnitScale(390, 844)).toBe(1);
  });

  it('falls back to 1 on bad input', () => {
    expect(modRmUnit(NaN, 768)).toBe(1);
    expect(modRmUnit(0, 0)).toBe(1);
    expect(rmUnitScale(NaN, NaN)).toBe(1);
  });
});

describe('slant-perpendicular mod column gaps', () => {
  it('reproduces the legacy -70px box overlap at the baseline', () => {
    expect(modColumnRectGap(MOD_COL_H_REF, 1)).toBeCloseTo(MOD_RECT_REF_PX, 6);
  });

  it('holds a positive slanted daylight while the box gap is negative', () => {
    const rect = modColumnRectGap(MOD_COL_H_REF, 1);
    expect(rect).toBeLessThan(0);
    expect(MOD_GAP_REF_PERP_PX).toBeGreaterThan(0);
    // Horizontal daylight implied by the box overlap at the baseline.
    const slantSum = MOD_COL_H_REF * MOD_SLANT_TAN + T_SUM;
    const daylightH = rect + slantSum;
    expect(daylightH).toBeGreaterThan(0);
    expect(daylightH * MOD_SLANT_COS).toBeCloseTo(MOD_GAP_REF_PERP_PX, 2);
  });

  it('deepens the overlap for taller columns so the daylight scales with rmU', () => {
    const tallH = 653;
    const u = Math.min(1600 / 1366, 900 / 768);
    const rect = modColumnRectGap(tallH, u);
    // Fixed -70px would let the daylight balloon; the derived overlap is deeper.
    expect(rect).toBeLessThan(MOD_RECT_REF_PX);
    const tSum = T_SUM * u;
    const daylightPerp = (rect + tallH * MOD_SLANT_TAN + tSum) * MOD_SLANT_COS;
    expect(daylightPerp).toBeCloseTo(MOD_GAP_REF_PERP_PX * u, 1);
  });

  it('keeps the daylight proportional when the unit scales', () => {
    for (const u of [0.75, 1, 1.25, 1.5]) {
      const h = MOD_COL_H_REF * u;
      const rect = modColumnRectGap(h, u);
      const tSum = T_SUM * u;
      const daylightPerp = (rect + h * MOD_SLANT_TAN + tSum) * MOD_SLANT_COS;
      expect(daylightPerp).toBeCloseTo(MOD_GAP_REF_PERP_PX * u, 6);
    }
  });
});
