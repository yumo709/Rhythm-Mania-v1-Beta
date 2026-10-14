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

import React, { useState, useMemo, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Search, ChevronLeft, ChevronDown, ChevronUp, Plus,
  Infinity as InfinityIcon, Rewind, FastForward, ArrowUpToLine,
  Skull, Award, Target, SquareSlash, Eye, Layers, Flashlight,
  Zap, FlipHorizontal, Shuffle, Gauge, ArrowUpDown, Ban,
  Clock, TrendingUp, TrendingDown, Activity, VolumeX, Film,
  Keyboard, MousePointerClick, Sparkles, Sliders, ArrowLeftRight,
  Sun, Columns2,
} from 'lucide-react';
import { GameSettings } from '../types';
import { computeModMultiplier } from '../ruleset/mania/scoreProcessor';
import { sanitizeGameplayMods } from '../utils/modifiers';

export type ModCategory = 'reduction' | 'increase' | 'automation' | 'conversion' | 'fun';

export interface ModItem {
  id: string;
  name: string;
  acronym: string;
  title: string;
  category: ModCategory;
  multiplier: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  exclusiveWith?: readonly string[];
  /** Greyed visual chrome for stills we do not own yet (Daycore, Dual Stages). Never toggles. */
  comingSoon?: boolean;
}

/**
 * osu!lazer-inspired category palette.
 * Header background uses `color`; body text stays light on the dark olive panel.
 */
export const MOD_CATEGORIES: { id: ModCategory; name: string; description: string; color: string; bgClass: string; textClass: string; borderClass: string; glowColor: string }[] = [
  {
    id: 'reduction',
    name: 'Difficulty Reduction',
    description: 'Make the map easier or more forgiving.',
    color: '#9ee854',
    bgClass: 'bg-emerald-500/15',
    textClass: 'text-emerald-400',
    borderClass: 'border-emerald-500/40',
    glowColor: 'rgba(158, 232, 84, 0.35)',
  },
  {
    id: 'increase',
    name: 'Difficulty Increase',
    description: 'Add challenge and push your limits.',
    color: '#ff5d5d',
    bgClass: 'bg-rose-500/15',
    textClass: 'text-rose-400',
    borderClass: 'border-rose-500/40',
    glowColor: 'rgba(255, 93, 93, 0.35)',
  },
  {
    id: 'automation',
    name: 'Automation',
    description: 'Sit back and enjoy the show.',
    color: '#5ecdf1',
    bgClass: 'bg-sky-500/15',
    textClass: 'text-sky-400',
    borderClass: 'border-sky-500/40',
    glowColor: 'rgba(94, 205, 241, 0.35)',
  },
  {
    id: 'conversion',
    name: 'Conversion',
    description: 'Transform gameplay mechanics and key counts.',
    color: '#9d6bff',
    bgClass: 'bg-purple-500/15',
    textClass: 'text-purple-400',
    borderClass: 'border-purple-500/40',
    glowColor: 'rgba(157, 107, 255, 0.35)',
  },
  {
    id: 'fun',
    name: 'Fun',
    description: 'Quirky experiments and dynamic speeds.',
    color: '#ff7ab8',
    bgClass: 'bg-amber-500/15',
    textClass: 'text-amber-400',
    borderClass: 'border-amber-500/40',
    glowColor: 'rgba(255, 122, 184, 0.35)',
  },
];

export const PRESET_COLUMN_COLOR = '#e9d44a';

export const ALL_MODS: ModItem[] = [
  // Difficulty Reduction (lazer still order: EZ, NF, HT, DC, NR)
  {
    id: 'EZ',
    name: 'Easy',
    acronym: 'EZ',
    title: 'Easy (EZ)',
    category: 'reduction',
    multiplier: '0.50x',
    icon: Sparkles,
    description: 'Larger hit windows, more forgiving health recovery.',
    exclusiveWith: ['HR', 'SD', 'PF', 'AC', 'DA'],
  },
  {
    id: 'NF',
    name: 'No Fail',
    acronym: 'NF',
    title: 'No Fail (NF)',
    category: 'reduction',
    multiplier: '0.50x',
    icon: InfinityIcon,
    description: "You can't fail, no matter what.",
    exclusiveWith: ['SD', 'PF', 'AC'],
  },
  {
    id: 'HT',
    name: 'Half Time',
    acronym: 'HT',
    title: 'Half Time (HT)',
    category: 'reduction',
    multiplier: '0.30x',
    icon: Rewind,
    description: 'Slows down song playback to 0.75x speed.',
    exclusiveWith: ['DT', 'NC', 'WU', 'WD', 'AS'],
  },
  {
    id: 'DC',
    name: 'Daycore',
    acronym: 'DC',
    title: 'Daycore (DC)',
    category: 'reduction',
    multiplier: '0.30x',
    icon: Sun,
    description: 'Dreamy slowed-down playback. Coming soon.',
    exclusiveWith: ['DT', 'NC', 'WU', 'WD', 'AS'],
    comingSoon: true,
  },
  {
    id: 'NR',
    name: 'No Release',
    acronym: 'NR',
    title: 'No Release (NR)',
    category: 'reduction',
    multiplier: '0.90x',
    icon: MousePointerClick,
    description: 'Hold notes do not require timed release.',
    exclusiveWith: ['HO'],
  },

  // Difficulty Increase (lazer still order: HR, SD, PF, DT, NC, FI, HD, Cover, FL, AC)
  {
    id: 'HR',
    name: 'Hard Rock',
    acronym: 'HR',
    title: 'Hard Rock (HR)',
    category: 'increase',
    multiplier: '1.00x',
    icon: ArrowUpToLine,
    description: 'Tighter hit windows and harsher health requirements.',
    exclusiveWith: ['EZ', 'DA'],
  },
  {
    id: 'SD',
    name: 'Sudden Death',
    acronym: 'SD',
    title: 'Sudden Death (SD)',
    category: 'increase',
    multiplier: '1.00x',
    icon: Skull,
    description: 'Miss a note and you fail immediately.',
    exclusiveWith: ['NF', 'PF', 'AC', 'EZ'],
  },
  {
    id: 'PF',
    name: 'Perfect',
    acronym: 'PF',
    title: 'Perfect (PF)',
    category: 'increase',
    multiplier: '1.00x',
    icon: Award,
    description: 'Score below Great and you fail immediately.',
    exclusiveWith: ['NF', 'SD', 'AC', 'EZ'],
  },
  {
    id: 'DT',
    name: 'Double Time',
    acronym: 'DT',
    title: 'Double Time (DT)',
    category: 'increase',
    multiplier: '1.00x',
    icon: FastForward,
    description: 'Speeds up song playback to 1.50x speed.',
    exclusiveWith: ['HT', 'NC', 'WU', 'WD', 'AS'],
  },
  {
    id: 'NC',
    name: 'Nightcore',
    acronym: 'NC',
    title: 'Nightcore (NC)',
    category: 'increase',
    multiplier: '1.00x',
    icon: Zap,
    description: 'Double Time speed with high-pitched audio.',
    exclusiveWith: ['HT', 'DT', 'WU', 'WD', 'AS'],
  },
  {
    id: 'FI',
    name: 'Fade In',
    acronym: 'FI',
    title: 'Fade In (FI)',
    category: 'increase',
    multiplier: '1.00x',
    icon: Eye,
    description: 'Notes appear out of nowhere as they approach receptor.',
    exclusiveWith: ['HD', 'Cover', 'CO', 'FL'],
  },
  {
    id: 'HD',
    name: 'Hidden',
    acronym: 'HD',
    title: 'Hidden (HD)',
    category: 'increase',
    multiplier: '1.00x',
    icon: SquareSlash,
    description: 'Notes fade out before reaching the receptor.',
    exclusiveWith: ['FI', 'Cover', 'CO', 'FL'],
  },
  {
    id: 'Cover',
    name: 'Cover',
    acronym: 'CO',
    title: 'Cover (CO)',
    category: 'increase',
    multiplier: '1.00x',
    icon: Layers,
    description: 'Cover part of the visible playfield runway.',
    exclusiveWith: ['HD', 'FI', 'FL'],
  },
  {
    id: 'FL',
    name: 'Flashlight',
    acronym: 'FL',
    title: 'Flashlight (FL)',
    category: 'increase',
    multiplier: '1.00x',
    icon: Flashlight,
    description: 'Restricted illuminated view near the judgement line.',
    exclusiveWith: ['HD', 'FI', 'Cover', 'CO'],
  },
  {
    id: 'AC',
    name: 'Accuracy Challenge',
    acronym: 'AC',
    title: 'Accuracy Challenge (AC)',
    category: 'increase',
    multiplier: '1.00x',
    icon: Target,
    description: 'Fail if your accuracy drops below threshold.',
    exclusiveWith: ['NF', 'SD', 'PF', 'EZ'],
  },

  // Automation
  {
    id: 'AT',
    name: 'Autoplay',
    acronym: 'AP',
    title: 'Autoplay (AP)',
    category: 'automation',
    multiplier: 'UNRANKED',
    icon: Sparkles,
    description: 'Watch a deterministic perfect bot playthrough.',
    exclusiveWith: ['CN'],
  },
  {
    id: 'CN',
    name: 'Cinema',
    acronym: 'CN',
    title: 'Cinema (CN)',
    category: 'automation',
    multiplier: 'UNRANKED',
    icon: Film,
    description: 'Relax and watch the background video.',
    exclusiveWith: ['AT'],
  },

  // Conversion (lazer still order: RD, Dual Stages, MR, DA, Classic, Invert, CS, Hold Off)
  {
    id: 'RD',
    name: 'Random',
    acronym: 'RD',
    title: 'Random (RD)',
    category: 'conversion',
    multiplier: '1.00x',
    icon: Shuffle,
    description: 'Shuffle around the keys!',
    exclusiveWith: ['MR'],
  },
  {
    id: 'DS',
    name: 'Dual Stages',
    acronym: 'DS',
    title: 'Dual Stages (DS)',
    category: 'conversion',
    multiplier: '1.00x',
    icon: Columns2,
    description: 'Double the stages, double the fun! Coming soon.',
    comingSoon: true,
  },
  {
    id: 'MR',
    name: 'Mirror',
    acronym: 'MR',
    title: 'Mirror (MR)',
    category: 'conversion',
    multiplier: '1.00x',
    icon: FlipHorizontal,
    description: 'Notes are flipped horizontally.',
    exclusiveWith: ['RD'],
  },
  {
    id: 'DA',
    name: 'Difficulty Adjust',
    acronym: 'DA',
    title: 'Difficulty Adjust (DA)',
    category: 'conversion',
    multiplier: '0.50x',
    icon: Sliders,
    description: "Override a beatmap's difficulty settings.",
    exclusiveWith: ['EZ', 'HR'],
  },
  {
    id: 'CL',
    name: 'Classic',
    acronym: 'CL',
    title: 'Classic (CL)',
    category: 'conversion',
    multiplier: '1.00x',
    icon: Clock,
    description: 'Feeling nostalgic?',
  },
  {
    id: 'IN',
    name: 'Invert',
    acronym: 'IN',
    title: 'Invert (IN)',
    category: 'conversion',
    multiplier: '1.00x',
    icon: ArrowUpDown,
    description: 'Hold the keys. To the end.',
    exclusiveWith: ['HO'],
  },
  {
    id: 'CS',
    name: 'Constant Speed',
    acronym: 'CS',
    title: 'Constant Speed (CS)',
    category: 'conversion',
    multiplier: '0.90x',
    icon: Gauge,
    description: 'No more tricky speed changes!',
  },
  {
    id: 'HO',
    name: 'Hold Off',
    acronym: 'HO',
    title: 'Hold Off (HO)',
    category: 'conversion',
    multiplier: '0.90x',
    icon: Ban,
    description: 'Replaces all hold notes with normal notes.',
    exclusiveWith: ['IN', 'NR'],
  },

  // Fun (lazer still order: WU, WD, MU, AS)
  {
    id: 'WU',
    name: 'Wind Up',
    acronym: 'WU',
    title: 'Wind Up (WU)',
    category: 'fun',
    multiplier: '0.50x',
    icon: TrendingUp,
    description: 'Can you keep up?',
    exclusiveWith: ['HT', 'DT', 'NC', 'WD', 'AS'],
  },
  {
    id: 'WD',
    name: 'Wind Down',
    acronym: 'WD',
    title: 'Wind Down (WD)',
    category: 'fun',
    multiplier: '0.50x',
    icon: TrendingDown,
    description: 'Sloooow doooown...',
    exclusiveWith: ['HT', 'DT', 'NC', 'WU', 'AS'],
  },
  {
    id: 'MU',
    name: 'Muted',
    acronym: 'MU',
    title: 'Muted (MU)',
    category: 'fun',
    multiplier: '1.00x',
    icon: VolumeX,
    description: 'Can you still feel the rhythm without music?',
  },
  {
    id: 'AS',
    name: 'Adaptive Speed',
    acronym: 'AS',
    title: 'Adaptive Speed (AS)',
    category: 'fun',
    multiplier: '0.50x',
    icon: Activity,
    description: 'Let track speed adapt to you.',
    exclusiveWith: ['HT', 'DT', 'NC', 'WU', 'WD'],
  },
];

/**
 * Returns a list of active mod IDs that conflict with the given modId.
 */
export function getConflictingMods(modId: string, activeMods: string[]): string[] {
  if (activeMods.includes(modId)) return [];

  const conflicts = new Set<string>();

  // Direct exclusiveWith declared on this mod
  const modDef = ALL_MODS.find(m => m.id === modId);
  if (modDef?.exclusiveWith) {
    for (const ex of modDef.exclusiveWith) {
      if (activeMods.includes(ex)) {
        conflicts.add(ex);
      }
    }
  }

  // Active mods that declare modId as exclusive
  for (const active of activeMods) {
    const activeDef = ALL_MODS.find(m => m.id === active);
    if (activeDef?.exclusiveWith?.includes(modId)) {
      conflicts.add(active);
    }
  }

  // Key conversion mods are mutually exclusive
  if (/^K(?:[1-9]|10)$/.test(modId)) {
    for (const active of activeMods) {
      if (/^K(?:[1-9]|10)$/.test(active) && active !== modId) {
        conflicts.add(active);
      }
    }
  }

  return Array.from(conflicts);
}

interface LazerModCardProps {
  mod: ModItem;
  categoryColor: string;
  isActive: boolean;
  conflictingMods: string[];
  onClick: () => void;
  /** Slanted-stepping left offset (px) so left paint edges stay colinear down the column. */
  offsetPx?: number;
}

const HEX_CLIP = 'polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%)';

/**
 * osu!lazer-style mod row: sheared parallelogram at the column's 10.1deg
 * (ROW_CLIP) with a rounded-square icon badge on the left, bold name plus
 * single-line description on the right. Selected rows fill with the
 * category colour; incompatible rows dim until hovered; coming-soon
 * rows render greyed and never toggle.
 */
export const LazerModCard: React.FC<LazerModCardProps> = ({
  mod,
  categoryColor,
  isActive,
  conflictingMods,
  onClick,
  offsetPx = 0,
}) => {
  const Icon = mod.icon;
  const isComingSoon = mod.comingSoon === true;
  const isConflicting = conflictingMods.length > 0 && !isActive && !isComingSoon;
  const tooltipText = isComingSoon
    ? `${mod.title} - Coming soon`
    : isConflicting
      ? `${mod.description} Incompatible with: ${conflictingMods.join(', ')} (click to swap)`
      : `${mod.title} - ${mod.description} (${mod.multiplier})`;
  const dyn = useDynamicSlantClip(4, 50, ROW_CLIP);

  if (isComingSoon) {
    return (
      <div className="group relative w-full max-w-[300px]" style={{ marginLeft: offsetPx }}>
        <div
          ref={dyn.setRef}
          title={tooltipText}
          aria-label={tooltipText}
          aria-disabled="true"
          className="w-full flex items-center gap-3 pl-3 pr-3 py-[7px] text-left border opacity-45 saturate-50 cursor-not-allowed select-none"
          style={{ clipPath: dyn.clip, backgroundColor: 'rgba(52, 64, 51, 0.75)', borderColor: 'rgba(255,255,255,0.06)', color: '#cfd6cd' }}
        >
          <span
            className="w-9 h-9 shrink-0 grid place-items-center rounded-[10px]"
            style={{ backgroundColor: '#1c231c' }}
          >
            <Icon className="w-4 h-4 opacity-70" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-bold leading-tight truncate">{mod.name}</span>
            <span className="block text-[11px] leading-tight truncate text-white/40">
              Coming soon
            </span>
          </span>
        </div>
        <span className="pointer-events-none absolute bottom-[calc(100%+8px)] left-0 z-30 hidden group-hover:block w-[248px] rounded-lg bg-black/95 border border-white/15 px-3 py-2 shadow-2xl">
          <span className="block text-[12px] font-bold text-white leading-snug">{mod.name}</span>
          <span className="block text-[11px] text-white/70 leading-snug mt-0.5">{mod.description}</span>
          <span className="block mt-1.5 text-[10px] uppercase tracking-wider text-white/50 font-bold">Coming soon</span>
        </span>
      </div>
    );
  }

  return (
    <div className="group relative w-full max-w-[300px]" style={{ marginLeft: offsetPx }}>
      <button
        type="button"
        ref={dyn.setRef}
        onClick={onClick}
        title={tooltipText}
        aria-label={tooltipText}
        aria-pressed={isActive}
        className={`w-full flex items-center gap-3 pl-3 pr-3 py-[7px] text-left border transition-all duration-150 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-white/50 ${
          isActive ? 'shadow-[0_4px_18px_rgba(0,0,0,0.45)]' : ''
        } ${isConflicting ? 'opacity-40 hover:opacity-90' : 'hover:brightness-110 active:scale-[0.98]'}`}
        style={
          isActive
            ? { clipPath: dyn.clip, backgroundColor: categoryColor, borderColor: categoryColor, color: '#10160f' }
            : { clipPath: dyn.clip, backgroundColor: 'rgba(66, 82, 63, 0.85)', borderColor: 'rgba(255,255,255,0.07)', color: '#f2f5ef' }
        }
      >
        <span
          className="w-9 h-9 shrink-0 grid place-items-center rounded-[10px]"
          style={{
            backgroundColor: isActive ? 'rgba(0,0,0,0.32)' : '#222b22',
          }}
        >
          <Icon className="w-4 h-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-bold leading-tight truncate">{mod.name}</span>
          <span
            className="block text-[11px] leading-tight truncate"
            style={{ color: isActive ? 'rgba(16,22,15,0.72)' : 'rgba(242,245,239,0.62)' }}
          >
            {mod.description}
          </span>
        </span>
      </button>

      {/* Hover tooltip, lazer style: dark card with description + incompat icon chips */}
      <span className="pointer-events-none absolute bottom-[calc(100%+8px)] left-0 z-30 hidden group-hover:block w-[248px] rounded-lg bg-black/95 border border-white/15 px-3 py-2 shadow-2xl">
        <span className="block text-[12px] font-bold text-white leading-snug">{mod.name}</span>
        <span className="block text-[11px] text-white/70 leading-snug mt-0.5">{mod.description}</span>
        {isConflicting ? (
          <span className="block mt-1.5">
            <span className="block text-[10px] uppercase tracking-wider text-white/50 font-bold">Incompatible with:</span>
            <span className="flex flex-wrap gap-1.5 mt-1.5">
              {conflictingMods.map(c => {
                const found = ALL_MODS.find(m => m.id === c);
                const CIcon = found?.icon;
                const chipColor = found
                  ? MOD_CATEGORIES.find(cat => cat.id === found.category)?.color ?? '#888'
                  : '#555';
                return (
                  <span
                    key={c}
                    title={found?.title ?? c}
                    className="w-7 h-7 grid place-items-center rounded-md text-white"
                    style={{ backgroundColor: chipColor }}
                  >
                    {CIcon ? (
                      <CIcon className="w-3.5 h-3.5" />
                    ) : (
                      <span className="text-[9px] font-mono font-bold">{c}</span>
                    )}
                  </span>
                );
              })}
            </span>
          </span>
        ) : (
          <span className="block mt-1.5 text-[10px] uppercase tracking-wider text-white/50 font-bold">Compatible with all mods</span>
        )}
      </span>
    </div>
  );
};

interface HexModButtonProps {
  id: string;
  acronym: string;
  name: string;
  multiplier: string;
  categoryColor: string;
  icon: React.ComponentType<{ className?: string }>;
  isActive: boolean;
  conflictingMods: string[];
  isDisabled?: boolean;
  disabledReason?: string;
  onClick: () => void;
}

/**
 * Backwards-compatible hex button wrapper, restyled as a lazer row card.
 * Kept so existing imports keep working; new code should use LazerModCard.
 */
export const HexModButton: React.FC<HexModButtonProps> = ({
  id,
  name,
  multiplier,
  categoryColor,
  icon,
  isActive,
  conflictingMods,
  isDisabled = false,
  disabledReason,
  onClick,
}) => {
  const found = ALL_MODS.find(m => m.id === id);
  const mod: ModItem = found ?? {
    id,
    name,
    acronym: id,
    title: `${name} (${id})`,
    category: 'conversion',
    multiplier,
    icon,
    description: disabledReason ?? multiplier,
  };
  void multiplier;
  if (isDisabled) {
    return (
      <button
        type="button"
        disabled
        title={disabledReason}
        aria-label={disabledReason}
        className="w-full flex items-center gap-3 pl-3 pr-3 py-[7px] text-left border opacity-30 cursor-not-allowed"
        style={{ clipPath: ROW_CLIP, backgroundColor: 'rgba(66, 82, 63, 0.85)', borderColor: 'rgba(255,255,255,0.07)', color: '#f2f5ef' }}
      >
        <span className="w-9 h-9 shrink-0 grid place-items-center rounded-[10px]" style={{ backgroundColor: '#222b22' }}>
          {React.createElement(icon, { className: 'w-4 h-4' })}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-bold leading-tight truncate">{name}</span>
          <span className="block text-[11px] leading-tight truncate text-white/50">{disabledReason ?? ''}</span>
        </span>
      </button>
    );
  }
  return <LazerModCard mod={{ ...mod, icon }} categoryColor={categoryColor} isActive={isActive} conflictingMods={conflictingMods} onClick={onClick} />;
};

/* Key-conversion grid button: measures its own height and cuts an
   exact-10.1deg small clip (same shear family as the full rows). */
const KeyGridButton: React.FC<{
  k: number;
  isActive: boolean;
  isNative: boolean;
  catColor: string;
  onToggle: (k: number) => void;
}> = ({ k, isActive, isNative, catColor, onToggle }) => {
  const dyn = useDynamicSlantClip(3, 30, ROW_CLIP_SM);
  return (
    <button
      key={`K${k}`}
      type="button"
      ref={dyn.setRef}
      disabled={isNative}
      onClick={() => !isNative && onToggle(k)}
      title={isNative ? `${k}K is already native to this beatmap` : `Convert playfield to ${k}K (0.90x)`}
      className={`px-2 py-1.5 text-[12px] font-mono font-bold border transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-30 ${
        isActive ? '' : 'bg-[#42523f]/80 border-white/[0.06] text-white/85 hover:bg-[#4b5f46]'
      }`}
      style={isActive
        ? { clipPath: dyn.clip, backgroundColor: catColor, borderColor: catColor, color: '#10160f' }
        : { clipPath: dyn.clip }}
    >
      {k}K
    </button>
  );
};

export interface BeatmapStatsSummary {
  stars?: number;
  bpm?: number;
  keyCount?: number;
  od?: number;
  hp?: number;
}

export interface ModSelectOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMods: string[];
  onUpdateMods: (mods: string[]) => void;
  availableKeyCounts?: number[];
  difficultyAdjust?: GameSettings['difficultyAdjust'];
  onUpdateDifficultyAdjust?: (da: NonNullable<GameSettings['difficultyAdjust']>) => void;
  defaultOd?: number;
  defaultHp?: number;
  beatmapStats?: BeatmapStatsSummary;
}

interface ModPreset {
  name: string;
  mods: string[];
}

const PRESETS_KEY = 'rhythm_mania_v1_mod_presets';
/* Mod column shell: parallelogram at the UI-standard 10.1deg lean with
   TRUE CIRCULAR R10 fillets baked into every corner (Slant Fillet
   method — a border-radius cannot round a clip-path cut). Slant run
   S = 112.2px, sized as straight_width = 630 x tan(10.1deg) onto the
   reference H = 630px column stretch at 1600x900 (viewport minus
   banner/toolbar/footer), so theta = atan(112.2/630) = 10.10deg,
   matching the song-select shells (filter 26px over 146.5px = 10.1deg).
   TL/BR are obtuse 100.1deg joints (T = 10/tan(50.05deg) = 8.4px),
   TR/BL acute 79.9deg joints (T = 10/tan(39.95deg) = 11.9px), arcs
   sampled every ~20deg so segment angles flow 0 -> 10 -> 30 -> 51 ->
   70 -> 90 -> 100 -> 109 (right slant) -> ... -> 180 (bottom) ->
   ... -> 270 (left slant) -> ... -> 352 -> 0 with no flat or kink
   (verified monotonic). Every fillet point is a FIXED offset from its
   own corner, so top corners use absolute px while bottom corners anchor
   with calc(100% - Ypx) — the polygon stays exact at ANY column height
   and any column width. The 40px category colour band is full-bleed paint
   inside the clipped layer, so its top corners inherit the fillets.
   Columns overlap with a -70px rectangular gap (70px overlap) between each shell. Rows are sheared
   parallelograms at the same 10.1deg (see ROW_CLIP) hugging the top-left;
   content inset pl-[112px] clears the top-left edge
   (112.2 x (1 - 20/630) = 108.6px at header mid-height) for header text
   and rows, and the scroll column keeps mr-[16px] breathing room on the
   right. The native bar is hidden; SlantedScrollList floats a custom
   10.1deg rail + thumb overlay on the column's right side (zero layout
   width, measured live). Personal Presets is half width
   (w-[230px]/lg:w-[240px]) with compact 80px rows; category columns are
   w-[460px]/lg:w-[480px] so the scroll container fits stepped 300px rows
   (maxShift + 300 <= W - 144 + maxShift, i.e. W >= 444) at every scroll
   position. Row boxes step left
   10.3px per index (see columnStepPlan) so left paint edges stay colinear
   down the 10.1deg slant; the top row stays aligned under the header. The
   live shell clip is rebuilt from the measured section height via
   buildSlantClip (same exact-10.1deg family as rows and scrollbar), so
   columns, buttons and rails share one true slant at any viewport size. */
const COLUMN_CLIP =
  'polygon(120.6px 0.0px, calc(100% - 11.9px) 0.0px, calc(100% - 8.5px) 0.6px, calc(100% - 5.5px) 2.3px, calc(100% - 3.3px) 5.0px, calc(100% - 2.1px) 8.3px, calc(100% - 2.1px) 11.8px, calc(100% - 110.7px) calc(100% - 8.2px), calc(100% - 111.6px) calc(100% - 5.6px), calc(100% - 113.2px) calc(100% - 3.3px), calc(100% - 115.3px) calc(100% - 1.5px), calc(100% - 117.8px) calc(100% - 0.4px), calc(100% - 120.6px) 100%, 11.9px 100%, 8.5px calc(100% - 0.6px), 5.5px calc(100% - 2.3px), 3.3px calc(100% - 5.0px), 2.1px calc(100% - 8.3px), 2.1px calc(100% - 11.8px), 110.7px 8.2px, 111.6px 5.6px, 113.2px 3.3px, 115.3px 1.5px, 117.8px 0.4px, 120.6px 0.0px)';
/* Mod row: sheared parallelogram at the same 10.1deg as its column, so
   each row's own left edge leans further left going down and the stack
   reads as leaning with the shell (lazer style). S = 8.9px sized as
   50 x tan(10.1deg) on the reference H = 50px row (py-[7px] + 36px icon
   zone), theta = 10.09deg. Obtuse joints T = 4/tan(50.05deg) = 3.4px,
   acute joints T = 4/tan(39.95deg) = 4.8px, R4 fillets sampled every
   ~20deg, travel verified monotonic. Bottom anchors use calc(100% - Ypx)
   so rows of any rendered height keep exact corners. CRUCIAL: the clip
   lives on the BUTTON only — each row is wrapped in an unclipped
   .group div so the hover tooltip (positioned above the row, outside the
   clip box) is never cut. Icon badge is a plain rounded square (lazer),
   not a hexagon. */
const ROW_CLIP =
  'polygon(12.3px 0.0px, calc(100% - 4.8px) 0.0px, calc(100% - 3.4px) 0.2px, calc(100% - 2.2px) 0.9px, calc(100% - 1.3px) 2.0px, calc(100% - 0.8px) 3.3px, calc(100% - 0.8px) 4.7px, calc(100% - 8.3px) calc(100% - 3.3px), calc(100% - 8.7px) calc(100% - 2.2px), calc(100% - 9.3px) calc(100% - 1.3px), calc(100% - 10.1px) calc(100% - 0.6px), calc(100% - 11.1px) calc(100% - 0.2px), calc(100% - 12.3px) 100%, 4.8px 100%, 3.4px calc(100% - 0.2px), 2.2px calc(100% - 0.9px), 1.3px calc(100% - 2.0px), 0.8px calc(100% - 3.3px), 0.8px calc(100% - 4.7px), 8.3px 3.3px, 8.7px 2.2px, 9.3px 1.3px, 10.1px 0.6px, 11.1px 0.2px, 12.3px 0.0px)';
/** Tangent of the 10.1deg UI slant; maps vertical distances to horizontal run. */
const SLANT_TAN = Math.tan((10.1 * Math.PI) / 180);

/* One true slant: builds the sheared-parallelogram clip with TRUE CIRCULAR
   fillets for ANY height at EXACTLY 10.1deg (S = H x tan(10.1deg), so theta
   = atan(S/H) = 10.1deg by construction; T = R/tan(phi/2) depends only on R
   and the joint angle, never on H). Fixed-px polygons are only exact at
   their reference height, so columns (H varies with viewport), rows (H
   varies by kind: mod rows, preset rows, key buttons) and the scrollbar
   all cut their clips from this builder using live-measured heights —
   COLUMN_CLIP / ROW_CLIP / ROW_CLIP_SM below are just the reference-H
   outputs kept as first-paint fallbacks. Arcs sampled every ~20deg (5
   intervals), winding order and fixed-offset anchoring identical to the
   hand-verified reference polygons. */
function buildSlantClip(S: number, H: number, R: number): string {
  const fmt = (n: number): string => (Math.round(n * 10) / 10).toFixed(1);
  const theta = Math.atan(S / H);
  const sin = Math.sin(theta);
  const cos = Math.cos(theta);
  const phiObt = Math.PI / 2 + theta;
  const phiAcu = Math.PI / 2 - theta;
  const tObt = R / Math.tan(phiObt / 2);
  const tAcu = R / Math.tan(phiAcu / 2);
  const dxObt = R * (1 / cos - Math.tan(theta));
  const tlO = { x: S + dxObt, y: R };
  const tlTop = { x: S + tObt, y: 0 };
  const tlSlant = { x: S - tObt * sin, y: tObt * cos };
  const trO = { x: -(R * Math.tan(theta) + R / cos), y: R };
  const trTop = { x: -tAcu, y: 0 };
  const trSlant = { x: -tAcu * sin, y: tAcu * cos };
  const brO = { x: -dxObt, y: -R };
  const brBot = { x: -tObt, y: 0 };
  const brSl = { x: tObt * sin, y: -tObt * cos };
  const blO = { x: R * Math.tan(theta) + R / cos, y: H - R };
  const blBot = { x: tAcu, y: H };
  const blSl = { x: tAcu * sin, y: H - tAcu * cos };
  const arc = (O: { x: number; y: number }, Ta: { x: number; y: number }, Tb: { x: number; y: number }, n: number) => {
    const aa = Math.atan2(Ta.y - O.y, Ta.x - O.x);
    const ab = Math.atan2(Tb.y - O.y, Tb.x - O.x);
    let d = ab - aa;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d <= -Math.PI) d += 2 * Math.PI;
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i <= n; i++) {
      const a = aa + (d * i) / n;
      pts.push({ x: O.x + R * Math.cos(a), y: O.y + R * Math.sin(a) });
    }
    return pts;
  };
  const N = 5;
  const tr = arc(trO, trTop, trSlant, N);
  const br = arc(brO, brSl, brBot, N);
  const bl = arc(blO, blBot, blSl, N);
  const tl2 = arc(tlO, tlSlant, tlTop, N);
  const poly: string[] = [];
  poly.push(`${fmt(tlTop.x)}px 0.0px`);
  poly.push(`calc(100% - ${fmt(tAcu)}px) 0.0px`);
  for (let i = 1; i < tr.length; i++) poly.push(`calc(100% - ${fmt(-tr[i].x)}px) ${fmt(tr[i].y)}px`);
  for (let i = 0; i < br.length; i++) {
    const X = S - br[i].x;
    const Yb = -br[i].y;
    poly.push(i === br.length - 1 ? `calc(100% - ${fmt(X)}px) 100%` : `calc(100% - ${fmt(X)}px) calc(100% - ${fmt(Yb)}px)`);
  }
  poly.push(`${fmt(blBot.x)}px 100%`);
  for (let i = 1; i < bl.length; i++) poly.push(`${fmt(bl[i].x)}px calc(100% - ${fmt(H - bl[i].y)}px)`);
  for (let i = 0; i < tl2.length; i++) poly.push(i === tl2.length - 1 ? `${fmt(tl2[i].x)}px 0.0px` : `${fmt(tl2[i].x)}px ${fmt(tl2[i].y)}px`);
  return `polygon(${poly.join(', ')})`;
}

/* Measures its target once mounted (and on resize) and cuts an exact-10.1deg
   clip for the live height. Clip changes never affect layout (paint only),
   so the observer cannot loop; heights settling within 0.5px keep the
   reference fallback to avoid paint churn. */
function useDynamicSlantClip(R: number, refH: number, fallbackClip: string): { setRef: (el: HTMLElement | null) => void; clip: string } {
  const targetRef = useRef<HTMLElement | null>(null);
  const [h, setH] = useState(refH);
  useLayoutEffect(() => {
    const el = targetRef.current;
    if (!el) return;
    const measure = () => {
      const nh = el.getBoundingClientRect().height;
      setH(prev => (Math.abs(prev - nh) < 0.5 ? prev : nh));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const setRef = useCallback((el: HTMLElement | null) => {
    targetRef.current = el;
  }, []);
  const clip = useMemo(
    () => (Math.abs(h - refH) < 0.5 ? fallbackClip : buildSlantClip(h * SLANT_TAN, h, R)),
    [h, R, refH, fallbackClip],
  );
  return { setRef, clip };
}
/* Row stepping for slanted colinearity: every row box shifts left by
   ROW_STEP_PX per index (10.3px ≈ 58px pitch x tan(10.1deg), so the
   left paint edges land on one straight 10.1deg line
   parallel to the column slant). The outer content inset shrinks by the
   same maxShift (BASE_CONTENT_PL 112 minus maxShift) and the header takes
   marginLeft maxShift, so the TOP row stays aligned under the header while
   lower rows track the receding left edge — all boxes keep non-negative
   margins (never clipped by the scroll container's overflow-x-hidden) and
   the 300px rows stay inside the shell at every scroll position. Stepping
   caps at STEPPED_ROWS_CAP units so huge preset lists cannot push content
   outside the shell; scroll compensation (row stack glides right along the
   slant as it scrolls) keeps the alignment exact below the fold too. */
const ROW_STEP_PX = 10.3;
const STEPPED_ROWS_CAP = 8;
const BASE_CONTENT_PL = 112;
function columnStepPlan(unitCount: number): { outerPl: number; headerMl: number; offsetFor: (index: number) => number } {
  const n = Math.max(1, Math.min(unitCount, STEPPED_ROWS_CAP));
  const maxShift = (n - 1) * ROW_STEP_PX;
  return {
    outerPl: BASE_CONTENT_PL - maxShift,
    headerMl: maxShift,
    offsetFor: (index: number) => Math.max(0, maxShift - index * ROW_STEP_PX),
  };
}

/** Painted width of the custom slanted scrollbar strip. */
const SCROLLBAR_W = 8;

/* Custom slanted scrollbar list: the native bar is hidden (see
   .lazer-column-scroll CSS) and replaced with a thin parallelogram rail +
   thumb sheared at the same 10.1deg as the column, floating in an overlay
   on the column's right side so it never consumes layout width. Track and
   thumb clip-paths are measured live (track run = trackH x tan(10.1deg)),
   so the bar stays exact at any column height. The thumb slides along the
   slanted line (right offset grows with depth); drag it, click the rail to
   jump, or keep using wheel/keys on the natively scrolling list. The rail
   always paints (design accent); the thumb only renders while scrollable.
   Scroll compensation: the row stack translates right by scrollTop x
   tan(10.1deg) — exactly the slant direction — so rows glide along the
   slanted line and keep their left-edge alignment at any scroll position
   instead of drifting off it. */
const SlantedScrollList: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ startY: number; startTop: number } | null>(null);
  /* Applied compensation mirror (fresh for listeners); capped below. */
  const appliedRef = useRef(0);
  const [metrics, setMetrics] = useState({ trackH: 0, scrollH: 0, clientH: 0, scrollTop: 0, cap: 0 });

  const sync = () => {
    const sc = scrollerRef.current;
    const tr = trackRef.current;
    if (!sc || !tr) return;
    /* Widest row footprint with the current compensation backed out, so the
       cap below is translate-invariant and cannot feedback-loop. */
    let maxFoot = 0;
    const wrap = sc.firstElementChild as HTMLElement | null;
    if (wrap) {
      const lr = sc.getBoundingClientRect().left;
      const applied = appliedRef.current;
      const kids = wrap.children;
      for (let i = 0; i < kids.length; i++) {
        const r = (kids[i] as HTMLElement).getBoundingClientRect();
        if (r.width === 0 && r.height === 0) continue;
        maxFoot = Math.max(maxFoot, r.right - applied - lr);
      }
    }
    const next = {
      trackH: tr.clientHeight,
      scrollH: sc.scrollHeight,
      clientH: sc.clientHeight,
      scrollTop: sc.scrollTop,
      cap: Math.max(0, sc.clientWidth - maxFoot),
    };
    setMetrics(prev =>
      prev.trackH === next.trackH && prev.scrollH === next.scrollH && prev.clientH === next.clientH && prev.scrollTop === next.scrollTop && prev.cap === next.cap
        ? prev
        : next,
    );
  };

  useLayoutEffect(() => {
    sync();
  });

  useEffect(() => {
    const sc = scrollerRef.current;
    const tr = trackRef.current;
    if (!sc || !tr) return;
    const ro = new ResizeObserver(() => sync());
    ro.observe(sc);
    ro.observe(tr);
    sc.addEventListener('scroll', sync, { passive: true });
    return () => {
      ro.disconnect();
      sc.removeEventListener('scroll', sync);
    };
  }, []);

  const scrollable = metrics.scrollH > metrics.clientH + 1;
  /* Glide along the slant, capped so the widest row never clips: containment
     wins over alignment once the container wall is reached. */
  const glide = Math.min(metrics.scrollTop * SLANT_TAN, metrics.cap);
  useLayoutEffect(() => {
    appliedRef.current = glide;
  });
  const trackH = metrics.trackH;
  const thumbH = !scrollable
    ? trackH
    : Math.min(trackH, Math.max(28, (metrics.clientH / metrics.scrollH) * trackH));
  const maxTop = Math.max(0, trackH - thumbH);
  const range = metrics.scrollH - metrics.clientH;
  const thumbTop = scrollable && range > 0 && maxTop > 0
    ? Math.min(maxTop, Math.max(0, (metrics.scrollTop / range) * maxTop))
    : 0;
  const trackRun = trackH * SLANT_TAN;
  const thumbRun = thumbH * SLANT_TAN;

  const scrollToRatio = (ratio: number) => {
    const sc = scrollerRef.current;
    if (!sc) return;
    sc.scrollTop = Math.min(Math.max(0, ratio), 1) * (sc.scrollHeight - sc.clientHeight);
  };

  const onTrackPointerDown = (e: React.PointerEvent) => {
    if (!scrollable || trackH - thumbH <= 0) return;
    const tr = trackRef.current;
    if (!tr) return;
    const rect = tr.getBoundingClientRect();
    scrollToRatio((e.clientY - rect.top - thumbH / 2) / (trackH - thumbH));
  };

  const onThumbPointerDown = (e: React.PointerEvent) => {
    if (!scrollable) return;
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { startY: e.clientY, startTop: metrics.scrollTop };
  };
  const onThumbPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    const sc = scrollerRef.current;
    if (!d || !sc) return;
    const span = Math.max(1, trackH - thumbH);
    sc.scrollTop = d.startTop + ((e.clientY - d.startY) / span) * (sc.scrollHeight - sc.clientHeight);
  };
  const onThumbPointerUp = () => {
    dragRef.current = null;
  };

  return (
    <div className="relative flex-1 min-h-0 flex">
      <div
        ref={scrollerRef}
        role="region"
        aria-label={label}
        tabIndex={0}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden py-3 mr-[16px] flex flex-col gap-2 lazer-column-scroll outline-none focus-visible:ring-1 focus-visible:ring-white/30 rounded"
      >
        <div
          className="flex min-h-0 flex-col gap-2"
          style={{ transform: `translateX(${glide.toFixed(2)}px)` }}
        >
          {children}
        </div>
      </div>
      <div ref={trackRef} aria-hidden className="absolute top-[12px] bottom-[12px] right-[16px] w-[150px] pointer-events-none">
        {trackH > 0 && (
          <div
            className="absolute inset-0 pointer-events-auto cursor-pointer"
            onPointerDown={onTrackPointerDown}
            style={{
              clipPath: `polygon(calc(100% - ${SCROLLBAR_W}px) 0px, 100% 0px, calc(100% - ${trackRun.toFixed(1)}px) 100%, calc(100% - ${(trackRun + SCROLLBAR_W).toFixed(1)}px) 100%)`,
              backgroundColor: 'rgba(255,255,255,0.14)',
            }}
          />
        )}
        {scrollable && thumbH > 0 && (
          <div
            className="absolute pointer-events-auto cursor-grab active:cursor-grabbing hover:brightness-150"
            onPointerDown={onThumbPointerDown}
            onPointerMove={onThumbPointerMove}
            onPointerUp={onThumbPointerUp}
            onPointerCancel={onThumbPointerUp}
            style={{
              top: thumbTop,
              height: thumbH,
              right: thumbTop * SLANT_TAN,
              width: SCROLLBAR_W + thumbRun,
              clipPath: `polygon(${thumbRun.toFixed(1)}px 0px, 100% 0px, calc(100% - ${thumbRun.toFixed(1)}px) 100%, 0px 100%)`,
              backgroundColor: 'rgba(255,255,255,0.55)',
            }}
          />
        )}
      </div>
    </div>
  );
};
/* Key-conversion grid button: same 10.1deg shear, proportionally sized
   (S = 5.3px on H = 30px, R3, T 2.5/3.6px) so the small buttons lean with
   the full-size rows instead of cutting a steeper angle. Monotonic
   travel verified. */
const ROW_CLIP_SM =
  'polygon(7.8px 0.0px, calc(100% - 3.6px) 0.0px, calc(100% - 2.6px) 0.2px, calc(100% - 1.6px) 0.7px, calc(100% - 1.0px) 1.5px, calc(100% - 0.6px) 2.5px, calc(100% - 0.6px) 3.5px, calc(100% - 4.9px) calc(100% - 2.5px), calc(100% - 5.1px) calc(100% - 1.7px), calc(100% - 5.6px) calc(100% - 1.0px), calc(100% - 6.2px) calc(100% - 0.5px), calc(100% - 7.0px) calc(100% - 0.1px), calc(100% - 7.8px) 100%, 3.6px 100%, 2.6px calc(100% - 0.2px), 1.6px calc(100% - 0.7px), 1.0px calc(100% - 1.5px), 0.6px calc(100% - 2.5px), 0.6px calc(100% - 3.5px), 4.9px 2.5px, 5.1px 1.7px, 5.6px 1.0px, 6.2px 0.5px, 7.0px 0.1px, 7.8px 0.0px)';

function loadPresets(): ModPreset[] {
  try {
    const raw = localStorage.getItem(PRESETS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((p): p is ModPreset => typeof p === 'object' && p !== null && typeof (p as ModPreset).name === 'string' && Array.isArray((p as ModPreset).mods))
      .slice(0, 20)
      .map(p => ({ name: p.name.slice(0, 32), mods: sanitizeGameplayMods(p.mods.filter(m => typeof m === 'string')).slice(0, 24) }));
  } catch {
    return [];
  }
}

export const ModSelectOverlay: React.FC<ModSelectOverlayProps> = ({
  isOpen,
  onClose,
  selectedMods,
  onUpdateMods,
  availableKeyCounts = [4],
  difficultyAdjust,
  onUpdateDifficultyAdjust,
  defaultOd = 8,
  defaultHp = 5,
  beatmapStats,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [customiseOpen, setCustomiseOpen] = useState(false);
  const [presets, setPresets] = useState<ModPreset[]>(() => loadPresets());

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setCustomiseOpen(false);
    }
  }, [isOpen]);

  // Compute live score multiplier
  const currentMultiplier = useMemo(() => {
    return computeModMultiplier(selectedMods);
  }, [selectedMods]);

  const isUnranked = useMemo(() => {
    return selectedMods.includes('AT') || selectedMods.includes('CN');
  }, [selectedMods]);

  // Handle clicking a regular mod (coming-soon rows never toggle)
  const handleToggleMod = (mod: ModItem) => {
    if (mod.comingSoon) return;
    if (selectedMods.includes(mod.id)) {
      // Remove mod
      const nextMods = selectedMods.filter(m => m !== mod.id);
      onUpdateMods(sanitizeGameplayMods(nextMods));
    } else {
      // Add mod, removing any conflicting mods
      const conflicts = getConflictingMods(mod.id, selectedMods);
      const nextMods = selectedMods.filter(m => !conflicts.includes(m));
      nextMods.push(mod.id);
      onUpdateMods(sanitizeGameplayMods(nextMods));
    }
  };

  // Handle key conversion toggle
  const handleToggleKeyMod = (keyCount: number) => {
    const id = `K${keyCount}`;
    if (selectedMods.includes(id)) {
      const nextMods = selectedMods.filter(m => m !== id);
      onUpdateMods(sanitizeGameplayMods(nextMods));
    } else {
      // Remove other K-mods
      const nextMods = selectedMods.filter(m => !/^K(?:[1-9]|10)$/.test(m));
      nextMods.push(id);
      onUpdateMods(sanitizeGameplayMods(nextMods));
    }
  };

  const persistPresets = (next: ModPreset[]) => {
    setPresets(next);
    try {
      localStorage.setItem(PRESETS_KEY, JSON.stringify(next));
    } catch {
      // storage may be unavailable; presets stay in memory only
    }
  };

  const handleSavePreset = () => {
    if (selectedMods.length === 0) return;
    const next: ModPreset[] = [...presets, { name: `Preset ${presets.length + 1}`, mods: [...selectedMods] }].slice(-20);
    persistPresets(next);
  };

  // Filter mods by query (lazer search filters rows inside each column)
  const query = searchQuery.trim().toLowerCase();
  const matchesQuery = (mod: ModItem) => {
    if (!query) return true;
    return (
      mod.name.toLowerCase().includes(query) ||
      mod.acronym.toLowerCase().includes(query) ||
      mod.description.toLowerCase().includes(query) ||
      mod.id.toLowerCase().includes(query)
    );
  };

  const stars = beatmapStats?.stars;
  const bpm = beatmapStats?.bpm;
  const keyCount = beatmapStats?.keyCount;
  const od = beatmapStats?.od;
  const hp = beatmapStats?.hp;
  const firstActiveMod = selectedMods.length > 0 ? ALL_MODS.find(m => m.id === selectedMods[0]) : undefined;
  const FirstActiveIcon = firstActiveMod?.icon;
  const presetStep = columnStepPlan(1 + presets.length);
  const presetPlusClip = useDynamicSlantClip(4, 50, ROW_CLIP);
  const presetItemClip = useDynamicSlantClip(4, 50, ROW_CLIP);
  const colRO = useRef<ResizeObserver | null>(null);
  const [colH, setColH] = useState(630);
  /* Measured via ref callback (not a mount effect): the callback provably
     fires when the section commits, while a parent layout effect can observe
     an empty tree on this mount path (AnimatePresence enter + StrictMode).
     Re-observes on every attach; disconnects on detach/unmount. */
  const measureSectionRef = useCallback((el: HTMLElement | null) => {
    colRO.current?.disconnect();
    colRO.current = null;
    if (!el) return;
    const measure = () => {
      const nh = el.getBoundingClientRect().height;
      setColH(prev => (Math.abs(prev - nh) < 0.5 ? prev : nh));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    colRO.current = ro;
  }, []);
  const columnClip = useMemo(
    () => (Math.abs(colH - 630) < 0.5 ? COLUMN_CLIP : buildSlantClip(colH * SLANT_TAN, colH, 10)),
    [colH],
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="mod-select-lazer"
          data-colh={colH}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex flex-col bg-black/30 font-sans text-slate-100"
          style={{ willChange: 'opacity' }}
        >
          {/* Beatmap-listing side dims at bg-black/30 with no blur; match that
              dim here and keep a light 2px blur so row text stays readable
              over the song select behind. Click outside panels closes. */}
          <button
            type="button"
            aria-label="Close mod select"
            onClick={onClose}
            className="absolute inset-0 cursor-default backdrop-blur-[2px]"
          />
          <div className="relative flex-1 min-h-0 flex flex-col">
            {/* Top info banner */}
            <div className="flex-none mx-2 sm:mx-6 lg:mx-10 mt-2 rounded-xl bg-[#2f442f]/95 border border-white/10 shadow-[0_10px_36px_rgba(0,0,0,0.55)] px-5 py-3 flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <h1 className="text-[15px] font-bold tracking-wide text-white">Mod Select</h1>
                <p className="text-[11px] text-white/60 leading-snug mt-0.5">
                  Mods provide different ways to enjoy gameplay. Some have an effect on the score you can achieve during ranked play. Others are just for fun.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                title="Close Mod Select (Esc)"
                className="h-8 w-8 shrink-0 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition flex items-center justify-center cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Search + Customise toolbar */}
            <div className="flex-none mx-2 sm:mx-6 lg:mx-10 mt-3 flex items-center gap-3">
              <div className="flex items-center bg-[#2b3b2b]/95 border border-white/10 rounded-xl overflow-hidden w-[280px] max-w-[46vw] focus-within:border-white/25 transition">
                <input
                  type="text"
                  placeholder="tab to search..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Tab') e.preventDefault();
                  }}
                  className="flex-1 min-w-0 bg-transparent px-4 py-2.5 text-[13px] text-white placeholder-white/45 focus:outline-none"
                />
                <span className="flex-none self-stretch w-12 grid place-items-center bg-[#3a4f3a]/80 border-l border-white/10">
                  <Search className="w-4 h-4 text-white/75" />
                </span>
              </div>

              <div className="flex-1" />

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setCustomiseOpen(v => !v)}
                  aria-expanded={customiseOpen}
                  className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-[13px] font-bold transition cursor-pointer border ${
                    customiseOpen
                      ? 'bg-[#7ee65a] text-[#10210f] border-[#7ee65a]'
                      : 'bg-[#2b3b2b]/95 text-white/75 border-white/10 hover:text-white'
                  }`}
                >
                  <span>Customise</span>
                  {customiseOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {customiseOpen && (
                  <div className="absolute right-0 top-[calc(100%+8px)] w-[320px] max-w-[80vw] rounded-xl overflow-hidden border border-white/10 shadow-2xl z-40">
                    <div className="bg-[#7ee65a] text-[#10210f] px-4 py-2 text-[13px] font-bold flex items-center justify-between">
                      <span>Customise</span>
                      <ChevronUp className="w-4 h-4" />
                    </div>
                    <div className="bg-[#232f23]/95 backdrop-blur px-4 py-4 flex flex-col gap-4">
                      {selectedMods.includes('DA') && onUpdateDifficultyAdjust ? (
                        <>
                          <div>
                            <div className="flex items-center justify-between text-[12px]">
                              <span className="font-bold text-white">Difficulty Adjust</span>
                              <span className="font-mono font-bold text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/80">DA</span>
                            </div>
                          </div>
                          <label className="block">
                            <span className="block text-[11px] text-white/60 mb-1">Overall Difficulty (OD)</span>
                            <span className="flex items-center gap-2">
                              <input
                                type="range"
                                min="0"
                                max="10"
                                step="0.5"
                                value={difficultyAdjust?.overallDifficulty ?? defaultOd}
                                onChange={e => {
                                  const val = parseFloat(e.target.value);
                                  onUpdateDifficultyAdjust({
                                    ...(difficultyAdjust || {}),
                                    overallDifficulty: val,
                                  });
                                }}
                                className="flex-1 accent-[#9ee854] h-1.5 cursor-pointer"
                              />
                              <span className="text-[12px] font-mono font-bold text-white w-7 text-right">
                                {(difficultyAdjust?.overallDifficulty ?? defaultOd).toFixed(1)}
                              </span>
                            </span>
                          </label>
                          <label className="block">
                            <span className="block text-[11px] text-white/60 mb-1">HP Drain Rate (HP)</span>
                            <span className="flex items-center gap-2">
                              <input
                                type="range"
                                min="0"
                                max="10"
                                step="0.5"
                                value={difficultyAdjust?.hpDrainRate ?? defaultHp}
                                onChange={e => {
                                  const val = parseFloat(e.target.value);
                                  onUpdateDifficultyAdjust({
                                    ...(difficultyAdjust || {}),
                                    hpDrainRate: val,
                                  });
                                }}
                                className="flex-1 accent-[#9ee854] h-1.5 cursor-pointer"
                              />
                              <span className="text-[12px] font-mono font-bold text-white w-7 text-right">
                                {(difficultyAdjust?.hpDrainRate ?? defaultHp).toFixed(1)}
                              </span>
                            </span>
                          </label>
                        </>
                      ) : (
                        <p className="text-[12px] text-white/60 leading-snug">
                          Select a customisable mod (for example <span className="text-white font-bold">Difficulty Adjust</span> in Conversion) to tweak its settings here.
                        </p>
                      )}
                      {selectedMods.length > 0 && (
                        <div className="pt-3 border-t border-white/10">
                          <p className="text-[10px] uppercase tracking-wider text-white/45 font-bold mb-1.5">Active mods</p>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedMods.map(id => (
                              <span key={id} className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-white/10 text-white/85 border border-white/10">
                                {id}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Columns: sheared lazer panels with independent vertical scroll per column.
                The slanted background is a clipped paint-only layer (pointer-events-none).
                Row content lives in an unclipped overlay inset by ~30px so the
                per-column scrollbar is never cut by the slant. The row itself is
                h-full (not min-h-full) so tall columns scroll instead of growing
                and getting clipped by the outer overflow-y-hidden. */}
            <div className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden lazer-columns-scroll">
              {/* Columns overlap with a -70px rectangular gap (70px overlap) between each shell (see COLUMN_CLIP). */}
              <div className="flex gap-0 px-2 sm:px-6 lg:px-10 py-4 items-stretch h-full w-max min-w-full">
                {/* Personal Presets column */}
                <section aria-label="Personal Presets" ref={measureSectionRef} className="relative w-[230px] lg:w-[240px] shrink-0 h-full min-h-0 flex flex-col">
                  <div
                    aria-hidden
                    className="absolute inset-0 overflow-hidden pointer-events-none"
                    style={{ clipPath: columnClip, backgroundColor: '#2c3a2d' }}
                  >
                    <div className="h-[40px] w-full" style={{ backgroundColor: PRESET_COLUMN_COLOR }} />
                  </div>
                  <div className="relative flex-1 min-h-0 h-full flex flex-col pl-[112px] pr-[16px]" style={{ paddingLeft: presetStep.outerPl }}>
                    <header className="flex-none h-[40px] flex items-center text-[13px] font-bold truncate" style={{ color: '#141a10', marginLeft: presetStep.headerMl }}>
                      Personal Presets
                    </header>
                    <SlantedScrollList label="Personal presets list">
                      <button
                        type="button"
                        onClick={handleSavePreset}
                        disabled={selectedMods.length === 0}
                        title={selectedMods.length === 0 ? 'Select mods first, then save them as a preset' : 'Save current mods as a preset'}
                        className="w-full max-w-[80px] bg-black/25 border border-white/10 hover:border-white/25 hover:bg-black/35 transition py-4 grid place-items-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ clipPath: presetPlusClip.clip, marginLeft: presetStep.offsetFor(0) }}
                        ref={presetPlusClip.setRef}
                      >
                        <Plus className="w-5 h-5 text-white/80" />
                      </button>
                      {presets.length === 0 && (
                        <p className="text-[11px] text-white/40 leading-snug text-center mt-1">
                          Save your current mod combo for one-tap reuse.
                        </p>
                      )}
                      {presets.map((preset, idx) => (
                        <div key={`${preset.name}-${idx}`} className="group/preset relative w-full max-w-[80px]" style={{ marginLeft: presetStep.offsetFor(idx + 1) }}>
                          <button
                            type="button"
                            ref={presetItemClip.setRef}
                            onClick={() => onUpdateMods(sanitizeGameplayMods(preset.mods))}
                            title={`Apply ${preset.name}: ${preset.mods.join(', ') || 'no mods'}`}
                            className="w-full bg-[#42523f]/80 hover:bg-[#4b5f46] border border-white/[0.06] pl-2 pr-8 py-2 text-left transition cursor-pointer"
                            style={{ clipPath: presetItemClip.clip }}
                          >
                            <span className="block text-[13px] font-bold text-white truncate">{preset.name}</span>
                            <span className="block text-[11px] text-white/55 truncate font-mono">
                              {preset.mods.length > 0 ? preset.mods.join(' + ') : 'No mods'}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => persistPresets(presets.filter((_, i) => i !== idx))}
                            title={`Delete ${preset.name}`}
                            aria-label={`Delete ${preset.name}`}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 h-6 w-6 rounded-md hidden group-hover/preset:grid place-items-center bg-black/40 hover:bg-rose-500/70 text-white/70 hover:text-white transition cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </SlantedScrollList>
                  </div>
                </section>

                {MOD_CATEGORIES.map(cat => {
                  const catMods = ALL_MODS.filter(m => m.category === cat.id && matchesQuery(m));
                  const showKeySection =
                    cat.id === 'conversion' && (!query || 'key conversion 1k 2k 3k 4k 5k 6k 7k 8k 9k 10k keys'.includes(query));
                  if (catMods.length === 0 && !showKeySection) return null;
                  const step = columnStepPlan(catMods.length + (showKeySection ? 1 : 0));
                  return (
                    <section key={cat.id} aria-label={cat.name} className="relative w-[460px] lg:w-[480px] -ml-[70px] shrink-0 h-full min-h-0 flex flex-col">
                      <div
                        aria-hidden
                        className="absolute inset-0 overflow-hidden pointer-events-none"
                        style={{ clipPath: columnClip, backgroundColor: '#2c3a2d' }}
                      >
                        <div className="h-[40px] w-full" style={{ backgroundColor: cat.color }} />
                      </div>
                      <div className="relative flex-1 min-h-0 h-full flex flex-col pl-[112px] pr-[16px]" style={{ paddingLeft: step.outerPl }}>
                        <header className="flex-none h-[40px] flex items-center text-[13px] font-bold truncate" style={{ color: '#141a10', marginLeft: step.headerMl }}>
                          {cat.name}
                        </header>
                        <SlantedScrollList label={`${cat.name} mods list`}>
                          {catMods.map((mod, modIdx) => (
                            <LazerModCard
                              key={mod.id}
                              mod={mod}
                              categoryColor={cat.color}
                              isActive={selectedMods.includes(mod.id)}
                              conflictingMods={getConflictingMods(mod.id, selectedMods)}
                              onClick={() => handleToggleMod(mod)}
                              offsetPx={step.offsetFor(modIdx)}
                            />
                          ))}

                          {cat.id === 'conversion' && showKeySection && (
                            <div className="mt-1 pt-2 border-t border-white/10 mr-[20px]" style={{ marginLeft: step.offsetFor(catMods.length) }}>
                              <p className="text-[10px] uppercase tracking-wider text-white/45 font-bold mb-1.5 px-0.5">
                                Key Conversion
                              </p>
                              <div className="grid grid-cols-2 gap-1.5">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(k => (
                                  <KeyGridButton
                                    key={`K${k}`}
                                    k={k}
                                    isActive={selectedMods.includes(`K${k}`)}
                                    isNative={availableKeyCounts.includes(k)}
                                    catColor={cat.color}
                                    onToggle={handleToggleKeyMod}
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                        </SlantedScrollList>
                      </div>
                    </section>
                  );
                })}
              </div>
            </div>

            {/* Bottom action bar */}
            <footer className="flex-none bg-[#20261f]/95 border-t border-white/10 px-2 sm:px-6 lg:px-10 pt-4 pb-3 flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="-skew-x-[12deg] rounded-lg bg-[#f23a9c] hover:brightness-110 active:scale-95 transition px-6 sm:px-8 py-2.5 cursor-pointer"
              >
                <span className="skew-x-[12deg] flex items-center gap-2 text-[13px] font-bold text-white">
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </span>
              </button>

              <div className="relative">
                {(selectedMods.length > 0 || isUnranked) && (
                  <span className="absolute -top-7 left-1/2 -translate-x-1/2 flex items-center gap-1 whitespace-nowrap">
                    {firstActiveMod && FirstActiveIcon && (
                      <span className="flex items-center gap-1.5 rounded-full bg-[#2c362c] border border-white/15 pl-1.5 pr-2.5 py-0.5 text-[11px] font-mono font-bold text-white shadow-lg">
                        <span
                          className="w-5 h-5 grid place-items-center text-white"
                          style={{ clipPath: HEX_CLIP, backgroundColor: MOD_CATEGORIES.find(c => c.id === firstActiveMod.category)?.color ?? '#666' }}
                        >
                          <FirstActiveIcon className="w-3 h-3" />
                        </span>
                        {currentMultiplier.toFixed(2)}x
                      </span>
                    )}
                    {isUnranked && (
                      <span className="rounded-full bg-[#e9d44a] px-2.5 py-1 text-[10px] font-black tracking-wide text-[#141a10] shadow-lg">
                        UNRANKED
                      </span>
                    )}
                  </span>
                )}
                <div className="-skew-x-[12deg] rounded-lg bg-[#8fe35a] px-6 sm:px-9 py-2.5">
                  <span className="skew-x-[12deg] flex flex-col items-center leading-none text-[#10210f]">
                    <ArrowLeftRight className="w-4 h-4" />
                    <span className="text-[11px] font-bold mt-0.5">Mods{selectedMods.length > 0 ? ` (${selectedMods.length})` : ''}</span>
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onUpdateMods([])}
                className="-skew-x-[12deg] rounded-lg bg-[#2c332c] hover:bg-[#384138] border border-white/10 transition px-6 sm:px-10 py-2.5 cursor-pointer"
              >
                <span className="skew-x-[12deg] block text-[12px] font-bold text-white/80">Deselect All</span>
              </button>

              <div className="flex-1" />

              {/* Beatmap stat cluster */}
              <div className="hidden md:flex items-center gap-4">
                {stars !== undefined && (
                  <span className="rounded-full bg-[#3fa35c]/25 border border-[#3fa35c]/50 px-2.5 py-1 text-[12px] font-bold text-[#7bd88f]">
                    ★ {stars.toFixed(2)}
                  </span>
                )}
                {bpm !== undefined && <span className="text-[13px] font-bold text-white whitespace-nowrap">{Math.round(bpm)} BPM</span>}
                {keyCount !== undefined && (
                  <span className="text-center leading-tight">
                    <span className="block text-[9px] font-bold text-white/45">KC</span>
                    <span className="block text-[13px] font-bold text-white">{keyCount.toFixed(1)}</span>
                  </span>
                )}
                {od !== undefined && (
                  <span className="text-center leading-tight">
                    <span className="block text-[9px] font-bold text-white/45">OD</span>
                    <span className="block text-[13px] font-bold text-white">{od.toFixed(1)}</span>
                  </span>
                )}
                {hp !== undefined && (
                  <span className="text-center leading-tight">
                    <span className="block text-[9px] font-bold text-white/45">HP</span>
                    <span className="block text-[13px] font-bold text-white">{hp.toFixed(1)}</span>
                  </span>
                )}
                <span
                  className={`-skew-x-[12deg] rounded-lg px-5 py-2 text-[12px] font-bold ${
                    isUnranked ? 'bg-[#e9d44a] text-[#141a10]' : 'bg-[#2c332c] text-white/80 border border-white/10'
                  }`}
                >
                  <span className="skew-x-[12deg] block">{isUnranked ? 'Unranked' : 'Ranked'}</span>
                </span>
                <span className="text-[13px] font-mono font-bold text-white whitespace-nowrap">{currentMultiplier.toFixed(2)}x</span>
              </div>

              {/* Compact multiplier for small screens */}
              <div className="flex md:hidden items-center gap-2">
                <span
                  className={`rounded-lg px-3 py-1.5 text-[11px] font-bold ${
                    isUnranked ? 'bg-[#e9d44a] text-[#141a10]' : 'bg-[#2c332c] text-white/80 border border-white/10'
                  }`}
                >
                  {isUnranked ? 'Unranked' : `${currentMultiplier.toFixed(2)}x`}
                </span>
              </div>
            </footer>
          </div>

          <style>{`
            .lazer-columns-scroll { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.35) transparent; }
            .lazer-columns-scroll::-webkit-scrollbar { height: 8px; width: 8px; }
            .lazer-columns-scroll::-webkit-scrollbar-track { background: transparent; }
            .lazer-columns-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.35); border-radius: 9999px; }
            /* Per-column scroll: native bar hidden (replaced by the slanted
               custom rail in SlantedScrollList); the list still scrolls
               natively via wheel/keys/touch. */
            .lazer-column-scroll {
              scrollbar-width: none;
              -ms-overflow-style: none;
              overscroll-behavior-y: contain;
              /* Let horizontal wheel/trackpad gestures chain out to the
                 outer horizontal scroller even when hovering a column. */
              overscroll-behavior-x: auto;
            }
            .lazer-column-scroll::-webkit-scrollbar { display: none; }
            .lazer-scroll { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.55) transparent; }
            .lazer-scroll::-webkit-scrollbar { width: 5px; }
            .lazer-scroll::-webkit-scrollbar-track { background: transparent; }
            .lazer-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.55); border-radius: 9999px; }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ModSelectOverlay;
