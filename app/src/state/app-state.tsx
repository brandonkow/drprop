/**
 * App state: the signed-in user, membership, records, the Lounge and the booking
 * draft. Data comes from `source` (src/data/source.ts): the local mock in preview
 * mode, the Supabase backend in supabase mode.
 *
 * Preview: everything is kept on the phone (AsyncStorage) so a second launch skips
 * sign-in. Supabase: the session lives in the keychain (src/backend/client.ts) and
 * records stay on the server; only the language is kept on the phone.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { source, type BookingDraft } from '../data/source';
import type { Consultation, Lang, Lounge, Membership, User } from '../data/types';
import { fmt, STRINGS, type Strings } from '../i18n/strings';

const KEY = 'drprop.state.v1';
const connected = source.kind === 'connected';

interface Persisted {
  user: User | null;
  membership: Membership | null;
  consultations: Consultation[];
  language: Lang;
}

function deviceLanguage(): Lang {
  const code = getLocales()[0]?.languageCode;
  return code === 'zh' ? 'zh' : code === 'ms' ? 'ms' : 'en';
}

interface AppState extends Persisted {
  ready: boolean;
  /** 'connected' when running on the Supabase backend. */
  mode: typeof source.kind;
  t: Strings;
  fmt: typeof fmt;
  draft: BookingDraft | null;
  lounge: Lounge | null;
  /** An active adviser (supabase mode). */
  staff: boolean;
  setLanguage(lang: Lang): void;
  /** After sign-in and the name question. Saves the profile and loads the records. */
  signIn(user: User): Promise<void>;
  updateUser(patch: Partial<User>): void;
  signOut(): Promise<void>;
  setDraft(draft: BookingDraft | null): void;
  addConsultation(c: Consultation): void;
  replaceConsultation(c: Consultation): void;
  setMembership(m: Membership): void;
  /** Reload records, membership and the Lounge from the source. */
  refresh(): Promise<void>;
}

const Ctx = createContext<AppState | null>(null);

const signedOut = (language: Lang): Persisted => ({ user: null, membership: null, consultations: [], language });

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<Persisted>(() => signedOut(deviceLanguage()));
  const [draft, setDraft] = useState<BookingDraft | null>(null);
  const [lounge, setLounge] = useState<Lounge | null>(null);
  const [staff, setStaff] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadFor = useCallback(async (user: User) => {
    const [loaded, l] = await Promise.all([source.load(user), source.lounge().catch(() => null)]);
    setState((s) => ({ ...s, user, membership: loaded.membership, consultations: loaded.consultations }));
    setStaff(loaded.staff);
    setLounge(l);
  }, []);

  useEffect(() => {
    (async () => {
      let saved: Persisted | null = null;
      try {
        const raw = await AsyncStorage.getItem(KEY);
        saved = raw ? (JSON.parse(raw) as Persisted) : null;
      } catch {
        saved = null;
      }
      const language = saved?.language ?? deviceLanguage();
      if (!connected) {
        if (saved) setState(saved);
        setLounge(await source.lounge().catch(() => null));
        return;
      }
      setState(signedOut(language));
      try {
        const user = await source.restore();
        // A user who never answered the name question signs in again.
        if (user?.displayName) await loadFor({ ...user, language: user.language ?? language });
      } catch {
        // Offline or a stale session: start at sign-in.
      }
    })().finally(() => setReady(true));
  }, [loadFor]);

  useEffect(() => {
    if (!ready) return;
    const keep: Persisted = connected ? signedOut(state.language) : state;
    AsyncStorage.setItem(KEY, JSON.stringify(keep)).catch(() => {});
  }, [ready, state]);

  /** Supabase: save the profile a moment after the last edit, not on every keystroke. */
  const saveSoon = useCallback((user: User) => {
    if (!connected || !user.displayName.trim()) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      source.saveProfile({ ...user, displayName: user.displayName.trim() }).catch(() => {});
    }, 800);
  }, []);

  const setLanguage = useCallback(
    (language: Lang) => {
      setState((s) => {
        const user = s.user && { ...s.user, language };
        if (user) saveSoon(user);
        return { ...s, language, user };
      });
    },
    [saveSoon],
  );

  const signIn = useCallback(
    async (user: User) => {
      await source.saveProfile(user);
      await loadFor(user);
    },
    [loadFor],
  );

  const updateUser = useCallback(
    (patch: Partial<User>) => {
      setState((s) => {
        if (!s.user) return s;
        const user = { ...s.user, ...patch };
        saveSoon(user);
        return { ...s, user };
      });
    },
    [saveSoon],
  );

  const signOut = useCallback(async () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    await source.signOut().catch(() => {});
    setState((s) => signedOut(s.language));
    setStaff(false);
    setDraft(null);
  }, []);

  const addConsultation = useCallback((c: Consultation) => {
    setState((s) => ({ ...s, consultations: [c, ...s.consultations.filter((x) => x.id !== c.id)] }));
  }, []);

  const replaceConsultation = useCallback((c: Consultation) => {
    setState((s) => ({ ...s, consultations: s.consultations.map((x) => (x.id === c.id ? c : x)) }));
  }, []);

  const setMembership = useCallback((membership: Membership) => {
    setState((s) => ({ ...s, membership }));
  }, []);

  const refresh = useCallback(async () => {
    if (state.user) await loadFor(state.user);
  }, [state.user, loadFor]);

  const value = useMemo<AppState>(
    () => ({
      ...state,
      ready,
      mode: source.kind,
      t: STRINGS[state.language],
      fmt,
      draft,
      lounge,
      staff,
      setLanguage,
      signIn,
      updateUser,
      signOut,
      setDraft,
      addConsultation,
      replaceConsultation,
      setMembership,
      refresh,
    }),
    [state, ready, draft, lounge, staff, setLanguage, signIn, updateUser, signOut, addConsultation, replaceConsultation, setMembership, refresh],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useApp outside AppStateProvider');
  return ctx;
}
