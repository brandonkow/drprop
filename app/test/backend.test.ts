/** Supabase-mode pieces that need no device: config, session storage, times, row mapping. */
import { describe, expect, it } from 'vitest';
import { backendConfig } from '../src/backend/config';
import { malaysiaClock, malaysiaDay, malaysiaInstant, nextMalaysiaDays } from '../src/backend/malaysia-time';
import { secureSessionStorage } from '../src/backend/secure-session';
import { errorKey } from '../src/data/errors';
import { normalizePhone, toConsultation, type BookingRow } from '../src/data/rows';

describe('backend config', () => {
  it('defaults to the preview', () => {
    expect(backendConfig().mode).toBe('preview');
    expect(backendConfig('preview').mode).toBe('preview');
  });

  it('fails closed on a missing, insecure or secret setting', () => {
    for (const [mode, url, key] of [
      ['supabase', '', ''],
      ['supabase', 'http://remote.example', 'sb_publishable_example_key'],
      ['supabase', 'https://project.supabase.co', 'sb_secret_do_not_ship_this'],
      ['supabase', 'https://user:pass@project.supabase.co', 'sb_publishable_example_key'],
      ['supabase', 'https://project.supabase.co/rest', 'sb_publishable_example_key'],
      ['live', '', ''],
    ]) {
      expect(backendConfig(mode, url, key).mode).toBe('invalid');
    }
  });

  it('accepts https, or http on this machine, with a publishable key', () => {
    expect(backendConfig('supabase', 'https://project.supabase.co', 'sb_publishable_example_key')).toEqual({
      mode: 'supabase',
      url: 'https://project.supabase.co',
      key: 'sb_publishable_example_key',
    });
    expect(backendConfig('supabase', 'http://127.0.0.1:54321', 'sb_publishable_example_key').mode).toBe('supabase');
  });
});

describe('secure session storage', () => {
  const memory = (fail?: (key: string) => boolean) => {
    const values = new Map<string, string>();
    const store = secureSessionStorage({
      getItemAsync: async (k) => values.get(k) ?? null,
      setItemAsync: async (k, v) => {
        if (fail?.(k)) throw new Error('disk unavailable');
        expect(Buffer.byteLength(v)).toBeLessThanOrEqual(2048);
        values.set(k, v);
      },
      deleteItemAsync: async (k) => {
        values.delete(k);
      },
    });
    return { values, store };
  };

  it('round-trips a large Unicode session in small chunks and clears every chunk', async () => {
    const { values, store } = memory();
    const session = JSON.stringify({ token: 'a'.repeat(6000), name: 'é'.repeat(1200), house: '\u{1F3E1}'.repeat(800) });
    await store.setItem('s', session);
    expect(await store.getItem('s')).toBe(session);
    await store.setItem('s', 'replacement');
    expect(await store.getItem('s')).toBe('replacement');
    expect(values.size).toBe(2); // the index and one chunk: the old chunks are gone
    await store.removeItem('s');
    expect(values.size).toBe(0);
    expect(await store.getItem('s')).toBeNull();
  });

  it('keeps the previous session when a write fails part-way', async () => {
    let failing = false;
    const { values, store } = memory((k) => failing && k.endsWith('.1'));
    await store.setItem('s', 'original');
    failing = true;
    await expect(store.setItem('s', 'x'.repeat(1000))).rejects.toThrow(/disk unavailable/);
    expect(await store.getItem('s')).toBe('original');
    expect(values.size).toBe(2);
  });

  it('refuses a corrupt index but can still remove it', async () => {
    const { values, store } = memory();
    values.set('s', '{"generation":"../escape","count":1}');
    await expect(store.getItem('s')).rejects.toThrow(/Invalid saved/);
    await store.removeItem('s');
    expect(values.size).toBe(0);
  });
});

describe('Malaysia time', () => {
  it('reads advisers’ times as Malaysia time, whatever the phone’s zone', () => {
    expect(malaysiaInstant('2026-10-08', '11:00')).toBe('2026-10-08T03:00:00.000Z');
    expect(malaysiaDay('2026-10-07T17:30:00Z')).toBe('2026-10-08');
    expect(malaysiaClock('2026-10-07T17:30:00Z')).toBe('01:30');
    for (const [d, t] of [['2026-02-30', '10:00'], ['2026-10-01', '25:00'], ['01/10/2026', '11:00'], ['', '']]) {
      expect(() => malaysiaInstant(d!, t!)).toThrow();
    }
  });

  it('lists the next days from today', () => {
    expect(nextMalaysiaDays(3, Date.parse('2026-10-07T20:00:00Z'))).toEqual(['2026-10-08', '2026-10-09', '2026-10-10']);
  });
});

describe('rows', () => {
  const row: BookingRow = {
    id: 'b1',
    user_id: 'u1',
    adviser_id: 'a1',
    slot_id: 's1',
    consultation_type: 'clinic',
    price_band: '300k-600k',
    property_label: 'Damansara condo',
    follow_up_of: null,
    fee_minor: 39900,
    starts_at: '2026-10-09T07:00:00Z',
    ends_at: '2026-10-09T07:30:00Z',
    status: 'requested',
    advisor_note: null,
    questions: [],
    created_at: '2026-10-07T07:00:00Z',
  };

  it('maps a booking to the record the screens show', () => {
    expect(toConsultation(row)).toMatchObject({ id: 'b1', fee: 399, status: 'booked', pending: true, scheduledAt: row.starts_at });
    expect(toConsultation({ ...row, status: 'completed', questions: ['Q?'] })).toMatchObject({ status: 'done', pending: false, questions: ['Q?'] });
    expect(toConsultation({ ...row, consultation_type: 'urgent', slot_id: null }).scheduledAt).toBeUndefined();
  });

  it('accepts Malaysian mobile numbers only', () => {
    expect(normalizePhone('012-345 6789')).toBe('+60123456789');
    expect(normalizePhone('+60 11 2345 6789')).toBe('+601123456789');
    expect(normalizePhone('60123456789')).toBe('+60123456789');
    expect(normalizePhone('+65 9123 4567')).toBeNull();
    expect(normalizePhone('123')).toBeNull();
  });

  it('maps database messages to the app’s own words', () => {
    expect(errorKey({ message: 'This appointment is no longer available' })).toBe('slotTaken');
    expect(errorKey({ message: 'The fee changed. Review the current quote before booking' })).toBe('feeChanged');
    expect(errorKey(new TypeError('Failed to fetch'))).toBe('offline');
    expect(errorKey({ message: 'This check-in code is not valid. Ask the member to open their card again' })).toBe('checkinCode');
    expect(errorKey({ message: 'This check-in code is not valid: the membership is not active' })).toBe('checkinCode');
    expect(errorKey('weird')).toBe('generic');
  });
});
