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
 * Mod column step geometry: rows must fit the width budget
 * (rowW <= colW - baseInset - rightPad - railMargin) so the exact
 * scroll-glide (scrollTop * tan(10.1deg)) never paints past the scroller
 * wall, and stepped left edges stay on one 10.1deg line.
 */

import { describe, it, expect } from 'vitest';
import {
  KEY_GRID_PITCH_REF_PX,
  KEY_ROW_STEP_REF_PX,
  MOD_CONTENT_PR_REF,
  MOD_RAIL_MARGIN_REF,
  MOD_ROW_W_REF,
  MOD_SLANT_TAN,
  PRESET_BASE_PL_REF,
  PRESET_ROW_W_REF,
  columnStepPlan,
} from '../src/components/ModSelectOverlay';

const CAT_COL_W = 460;
const CAT_BASE_PL = 112;
const PRESET_COL_W = 230;

describe('mod column step geometry', () => {
  it('steps each row left by a constant amount with the top row under the header', () => {
    const plan = columnStepPlan(10, 1);
    const maxShift = plan.headerMl;
    expect(maxShift).toBeGreaterThan(0);
    expect(plan.outerPl + plan.headerMl).toBeCloseTo(CAT_BASE_PL, 10);
    for (let i = 0; i < 9; i++) {
      expect(plan.offsetFor(i) - plan.offsetFor(i + 1)).toBeCloseTo(maxShift / 9, 10);
    }
    expect(plan.offsetFor(0)).toBeCloseTo(maxShift, 10);
    expect(plan.offsetFor(9)).toBeCloseTo(0, 10);
  });

  it('fits 320px mod rows inside 460px columns with room for the glide', () => {
    expect(MOD_ROW_W_REF).toBeLessThanOrEqual(
      CAT_COL_W - CAT_BASE_PL - MOD_CONTENT_PR_REF - MOD_RAIL_MARGIN_REF,
    );
  });

  it('fits preset slots inside the preset column with the tighter inset', () => {
    const plan = columnStepPlan(3, 1, PRESET_BASE_PL_REF);
    expect(plan.outerPl).toBeCloseTo(PRESET_BASE_PL_REF - plan.headerMl, 10);
    // Slot 0 (widest footprint) stays inside the shell: base inset + width.
    expect(PRESET_BASE_PL_REF + PRESET_ROW_W_REF).toBeLessThanOrEqual(PRESET_COL_W);
  });

  it('scales the step plan linearly with the fluid unit', () => {
    const a = columnStepPlan(6, 1);
    const b = columnStepPlan(6, 1.5);
    expect(b.outerPl).toBeCloseTo(a.outerPl * 1.5, 8);
    expect(b.headerMl).toBeCloseTo(a.headerMl * 1.5, 8);
    expect(b.offsetFor(2)).toBeCloseTo(a.offsetFor(2) * 1.5, 8);
  });

  it('steps key-grid pair-rows along the same slant as the mod rows', () => {
    // Pair-row advance (38px pitch) mapped through the slant, exactly like
    // ROW_STEP_REF_PX maps the 58px mod-row pitch.
    expect(KEY_ROW_STEP_REF_PX).toBeCloseTo(KEY_GRID_PITCH_REF_PX * MOD_SLANT_TAN, 10);
    expect(Math.atan(KEY_ROW_STEP_REF_PX / KEY_GRID_PITCH_REF_PX) * 180 / Math.PI).toBeCloseTo(10.1, 1);
    // Deepest pair (4 steps) stays inside the outerPl breathing room.
    const conv = columnStepPlan(9, 1);
    expect(4 * KEY_ROW_STEP_REF_PX).toBeLessThan(conv.outerPl);
  });
});
