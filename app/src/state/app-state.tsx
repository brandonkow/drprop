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
import { AppState as NativeAppState, Platform } from 'react-native';
import { backendClient } from '../backend/client';
import { SessionGuard } from './session-guard';
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
  return 'en';
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
  profileError: string | null;
  retryProfile(): void;
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
  const [profileError, setProfileError] = useState<string | null>(null);
  const guard = useRef(new SessionGuard());
  const currentUser = useRef<User | null>(null);
  const revision = useRef(0);
  const profileRevision = useRef(0);
  const saves = useRef(Promise.resolve());
  const persistence = useRef(Promise.resolve());
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadFor = useCallback(async (user: User, ticket = guard.current.ticket()) => {
    const version = ++revision.current;
    const [loaded, l] = await Promise.all([source.load(user), source.lounge().catch(() => null)]);
    if (!guard.current.current(ticket) || version !== revision.current) return;
    const loadedUser = currentUser.current?.id === user.id ? currentUser.current : { ...user, language: 'en' as const };
    currentUser.current = loadedUser;
    setState((s) => guard.current.current(ticket) ? ({ ...s, language: 'en', user: loadedUser, membership: loaded.membership, consultations: loaded.consultations }) : s);
    setStaff(loaded.staff);
    setLounge(l);
  }, []);

  useEffect(() => {
    const sessionGuard = guard.current;
    const ticket = sessionGuard.ticket();
    (async () => {
      let saved: Persisted | null = null;
      try {
        const raw = await AsyncStorage.getItem(KEY);
        saved = raw ? (JSON.parse(raw) as Persisted) : null;
      } catch {
        saved = null;
      }
      if (!guard.current.current(ticket)) return;
      const language = deviceLanguage();
      if (!connected) {
        const board = await source.lounge().catch(() => null);
        if (!guard.current.current(ticket)) return;
        if (saved) {
          currentUser.current = saved.user ? { ...saved.user, language } : null;
          setState({ ...saved, language, user: currentUser.current });
        }
        setLounge(board);
        return;
      }
      setState(signedOut(language));
      try {
        const user = await source.restore();
        // A user who never answered the name question signs in again.
        if (user?.displayName && guard.current.current(ticket)) await loadFor({ ...user, language }, ticket);
      } catch {
        // Offline or a stale session: start at sign-in.
      }
    })().finally(() => { if (guard.current.current(ticket)) setReady(true); });
    return () => { sessionGuard.invalidate(); if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [loadFor]);

  useEffect(() => {
    if (!ready) return;
    const keep: Persisted = connected ? signedOut(state.language) : state;
    persistence.current = persistence.current.catch(() => {}).then(() => AsyncStorage.setItem(KEY, JSON.stringify(keep)));
    void persistence.current.catch(() => {});
  }, [ready, state]);

  /** Supabase: save the profile a moment after the last edit, not on every keystroke. */
  const saveSoon = useCallback((user: User) => {
    if (!connected) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const version = ++profileRevision.current;
    const ticket = guard.current.ticket();
    if (!user.displayName.trim() || user.displayName.trim().length > 40 || (user.drinkPreference?.length ?? 0) > 80) {
      setProfileError('Use a name of 1–40 characters and a drink preference of up to 80 characters.'); return;
    }
    setProfileError(null);
    saveTimer.current = setTimeout(() => {
      saves.current = saves.current.catch(() => {}).then(async () => {
        if (!guard.current.current(ticket) || version !== profileRevision.current) return;
        try {
          await source.saveProfile({ ...user, language: 'en', displayName: user.displayName.trim() });
          if (guard.current.current(ticket) && version === profileRevision.current) setProfileError(null);
        } catch {
          if (guard.current.current(ticket) && version === profileRevision.current) setProfileError('Your changes were not saved. Check your connection and retry.');
        }
      });
    }, 800);
  }, []);

  const setLanguage = useCallback(
    (_language: Lang) => {
      const language = 'en' as const;
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
      guard.current.invalidate();
      const ticket = guard.current.ticket();
      await saves.current.catch(() => {});
      if (!guard.current.current(ticket)) return;
      await source.saveProfile({ ...user, language: 'en' });
      if (guard.current.current(ticket)) await loadFor({ ...user, language: 'en' }, ticket);
    },
    [loadFor],
  );

  const updateUser = useCallback(
    (patch: Partial<User>) => {
      if (!currentUser.current) return;
      const user = { ...currentUser.current, ...patch, id: currentUser.current.id, language: 'en' as const };
      currentUser.current = user;
      saveSoon(user);
      setState((s) => ({ ...s, user }));
    },
    [saveSoon],
  );

  const clear = useCallback(() => {
    guard.current.invalidate();
    currentUser.current = null;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setState(signedOut('en'));
    setStaff(false);
    setDraft(null);
    setLounge(null);
    setProfileError(null);
  }, []);

  const signOut = useCallback(async () => {
    clear();
    await saves.current.catch(() => {});
    await source.signOut();
  }, [clear]);

  useEffect(() => {
    if (!connected) return;
    const auth = backendClient().auth;
    const { data } = auth.onAuthStateChange((event, session) => {
      // Keep this callback synchronous: Auth holds a lock while dispatching it.
      if (event === 'SIGNED_OUT' || (currentUser.current && session?.user.id && session.user.id !== currentUser.current.id)) {
        clear(); setReady(true);
      }
    });
    const foreground = () => {
      if (Platform.OS !== 'web') {
        if (NativeAppState.currentState === 'active') auth.startAutoRefresh(); else auth.stopAutoRefresh();
      }
      if (NativeAppState.currentState === 'active' && currentUser.current) void loadFor(currentUser.current).catch(() => {});
    };
    foreground();
    const sub = NativeAppState.addEventListener('change', foreground);
    return () => { data.subscription.unsubscribe(); sub.remove(); if (Platform.OS !== 'web') auth.stopAutoRefresh(); };
  }, [clear, loadFor]);

  const retryProfile = useCallback(() => { if (currentUser.current) saveSoon(currentUser.current); }, [saveSoon]);

  const addConsultation = useCallback((c: Consultation) => {
    setState((s) => s.user?.id === c.userId ? ({ ...s, consultations: [c, ...s.consultations.filter((x) => x.id !== c.id)] }) : s);
  }, []);

  const replaceConsultation = useCallback((c: Consultation) => {
    setState((s) => s.user?.id === c.userId ? ({ ...s, consultations: s.consultations.map((x) => (x.id === c.id ? c : x)) }) : s);
  }, []);

  const setMembership = useCallback((membership: Membership) => {
    setState((s) => s.user?.id === membership.userId ? ({ ...s, membership }) : s);
  }, []);

  const refresh = useCallback(async () => {
    if (currentUser.current) await loadFor(currentUser.current);
  }, [loadFor]);

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
      profileError,
      retryProfile,
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
    [state, ready, draft, lounge, staff, profileError, retryProfile, setLanguage, signIn, updateUser, signOut, addConsultation, replaceConsultation, setMembership, refresh],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useApp outside AppStateProvider');
  return ctx;
}
