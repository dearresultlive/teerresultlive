import React from 'react';

export interface GameResult {
  name: string;
  location: string;
  status: string;
  fr_time: string;
  sr_time: string;
  fr: string;
  sr: string;
  fr_verification?: 'VERIFIED' | 'FAST_UPDATE' | 'UNVERIFIED';
  sr_verification?: 'VERIFIED' | 'FAST_UPDATE' | 'UNVERIFIED';
  fr_sources?: string[];
  sr_sources?: string[];
}

export interface TeerData {
  date: string;
  updated_at: string;
  games: Record<string, GameResult>;
  yesterday?: any;
}

export const GAME_SCHEDULE: Record<string, { frStart: number; srStart: number }> = {
  juwai_morning: {
    frStart: 10 * 60 + 28, // 10:28 AM (10:30 AM round)
    srStart: 11 * 60 + 28  // 11:28 AM (11:30 AM round)
  },
  juwai: {
    frStart: 13 * 60 + 42, // 1:42 PM (aligned with Jowai ground delay)
    srStart: 14 * 60 + 27  // 2:27 PM
  },
  shillong: {
    frStart: 15 * 60 + 30, // 3:30 PM (Polo Ground real-time shooting start)
    srStart: 16 * 60 + 30  // 4:30 PM (Polo Ground real-time shooting start)
  },
  khanapara: {
    frStart: 15 * 60 + 48, // 3:48 PM (Khanapara real-time shooting start)
    srStart: 16 * 60 + 18  // 4:18 PM (Khanapara real-time shooting start)
  },
  night: {
    frStart: 22 * 60 + 18, // 10:18 PM (Night Archery real-time shooting start)
    srStart: 23 * 60 + 18  // 11:18 PM (Night Archery real-time shooting start)
  }
};

export const ALL_GAMES_METADATA: Record<
  string,
  { title: string; defaultFrTime: string; defaultSrTime: string; location: string }
> = {
  shillong: {
    title: 'SHILLONG TEER',
    defaultFrTime: '3:45 PM',
    defaultSrTime: '4:45 PM',
    location: 'Polo Ground, Shillong'
  },
  khanapara: {
    title: 'KHANAPARA TEER',
    defaultFrTime: '4:00 PM',
    defaultSrTime: '4:30 PM',
    location: 'Them Marwet, Ri-Bhoi'
  },
  juwai: {
    title: 'JUWAI TEER',
    defaultFrTime: '1:45 PM',
    defaultSrTime: '2:30 PM',
    location: 'Ladrymbai traditional Ground'
  },
  juwai_morning: {
    title: 'JUWAI MORNING TEER',
    defaultFrTime: '10:30 AM',
    defaultSrTime: '11:30 AM',
    location: 'Jowai Archery Ground'
  },
  night: {
    title: 'SHILLONG NIGHT TEER',
    defaultFrTime: '10:30 PM',
    defaultSrTime: '11:30 PM',
    location: 'Shillong Club Night Archery Ground'
  }
};

export function getISTCurrentMinutes(d: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23'
  }).formatToParts(d);
  const hour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
  const minute = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);
  return hour * 60 + minute;
}

export function isSundayInIST(d: Date = new Date()): boolean {
  try {
    return new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', weekday: 'short' }).format(d) === 'Sun';
  } catch {
    return false;
  }
}

export function checkIsDrawing(
  gameKey: string,
  round: 'fr' | 'sr',
  value: string,
  nowMin: number,
  isToday: boolean,
  isSunday: boolean,
  isFrDeclared: boolean = false
): boolean {
  if (!isToday || isSunday || !value || value.toLowerCase() !== 'xx') {
    return false;
  }
  const sched = GAME_SCHEDULE[gameKey];
  if (!sched) return false;

  if (gameKey === 'night') {
    if (round === 'fr') {
      return nowMin >= sched.frStart || nowMin < 2 * 60;
    } else {
      return isFrDeclared && (nowMin >= sched.srStart || nowMin < 2 * 60 + 30);
    }
  }

  // Daytime teer games (Juwai Morning, Juwai Day, Shillong, Khanapara)
  // 1st round draws from its start time until declared
  // 2nd round only draws once 1st round is declared and 2nd round time is reached
  if (round === 'fr') {
    return nowMin >= sched.frStart && nowMin <= 22 * 60;
  } else {
    return isFrDeclared && nowMin >= sched.srStart && nowMin <= 22 * 60 + 30;
  }
}

export function getDynamicGameOrder(nowMin: number, viewMode: 'today' | 'yesterday', isSunday: boolean): string[] {
  // If viewing yesterday or Sunday holiday, keep standard canonical order
  if (viewMode === 'yesterday' || isSunday) {
    return ['shillong', 'khanapara', 'juwai', 'juwai_morning', 'night'];
  }

  // 10:15 AM to 12:00 PM: Juwai Morning Teer Live Window (Draws at 10:30 AM & 11:30 AM)
  if (nowMin >= 10 * 60 + 15 && nowMin < 12 * 60) {
    return ['juwai_morning', 'shillong', 'khanapara', 'juwai', 'night'];
  }

  // 1:15 PM to 3:15 PM: Juwai Teer Live Window (Draws at 1:45 PM & 2:30 PM)
  if (nowMin >= 13 * 60 + 15 && nowMin < 15 * 60 + 15) {
    return ['juwai', 'shillong', 'khanapara', 'juwai_morning', 'night'];
  }

  // 3:15 PM to 4:00 PM: Shillong 1st Round Mega-Peak (Draws at 3:45 PM)
  if (nowMin >= 15 * 60 + 15 && nowMin < 16 * 60) {
    return ['shillong', 'khanapara', 'juwai', 'juwai_morning', 'night'];
  }

  // 4:00 PM to 4:35 PM: Khanapara Active Window (Draws at 4:00 PM & 4:30 PM)
  if (nowMin >= 16 * 60 && nowMin < 16 * 60 + 30) {
    return ['khanapara', 'shillong', 'juwai', 'juwai_morning', 'night'];
  }

  // 4:30 PM to 5:30 PM: Shillong 2nd Round Peak (Shooting starts 4:30 PM, Draws at 4:45 PM)
  if (nowMin >= 16 * 60 + 30 && nowMin < 17 * 60 + 30) {
    return ['shillong', 'khanapara', 'juwai', 'juwai_morning', 'night'];
  }

  // 9:30 PM onwards to 1:00 AM (or early morning before 6:00 AM): Night Teer Window (10:30 PM & 11:30 PM)
  if (nowMin >= 21 * 60 + 30 || nowMin < 6 * 60) {
    return ['night', 'shillong', 'khanapara', 'juwai', 'juwai_morning'];
  }

  // Default Daytime (Morning 6:00 AM to 10:15 AM & Evening 5:30 PM to 9:30 PM): Flagship Shillong first
  return ['shillong', 'khanapara', 'juwai', 'juwai_morning', 'night'];
}

export const WhatsAppIcon = ({ className = 'w-3.5 h-3.5' }: { className?: string }) => (
  <svg className={`${className} fill-current`} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.885-9.885 9.885m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);
