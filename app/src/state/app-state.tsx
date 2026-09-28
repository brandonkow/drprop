/**
 * App state for phase 1: the signed-in user, membership, records and the
 * booking draft. Persisted with AsyncStorage so a second launch skips sign-in.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import * as api from '../data/mock';
import type { Consultation, Lang, Membership, User } from '../data/types';
import { fmt, STRINGS, type Strings } from '../i18n/strings';

const KEY = 'drprop.state.v1';

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
  t: Strings;
  fmt: typeof fmt;
  draft: api.BookingDraft | null;
  setLanguage(lang: Lang): void;
  signIn(user: User): void;
  updateUser(patch: Partial<User>): void;
  signOut(): void;
  setDraft(draft: api.BookingDraft | null): void;
  addConsultation(c: Consultation): void;
  setMembership(m: Membership): void;
}

const Ctx = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<Persisted>({
    user: null,
    membership: null,
    consultations: [],
    language: deviceLanguage(),
  });
  const [draft, setDraft] = useState<api.BookingDraft | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => raw && setState(JSON.parse(raw) as Persisted))
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (ready) AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => {});
  }, [ready, state]);

  const setLanguage = useCallback((language: Lang) => {
    setState((s) => ({ ...s, language, user: s.user && { ...s.user, language } }));
  }, []);

  const signIn = useCallback((user: User) => {
    setState((s) => ({
      ...s,
      user,
      membership: api.membershipFor(user),
      consultations: api.sampleHistory(user),
    }));
  }, []);

  const updateUser = useCallback((patch: Partial<User>) => {
    setState((s) => (s.user ? { ...s, user: { ...s.user, ...patch } } : s));
  }, []);

  const signOut = useCallback(() => {
    setState((s) => ({ user: null, membership: null, consultations: [], language: s.language }));
  }, []);

  const addConsultation = useCallback((c: Consultation) => {
    setState((s) => ({ ...s, consultations: [c, ...s.consultations] }));
  }, []);

  const setMembership = useCallback((membership: Membership) => {
    setState((s) => ({ ...s, membership }));
  }, []);

  const value = useMemo<AppState>(
    () => ({
      ...state,
      ready,
      t: STRINGS[state.language],
      fmt,
      draft,
      setLanguage,
      signIn,
      updateUser,
      signOut,
      setDraft,
      addConsultation,
      setMembership,
    }),
    [state, ready, draft, setLanguage, signIn, updateUser, signOut, addConsultation, setMembership],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useApp outside AppStateProvider');
  return ctx;
}
