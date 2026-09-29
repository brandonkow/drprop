import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { bookingError, feeFor } from '../domain/booking';
import type { BookingDraft, Consultation, DemoState, Store } from '../domain/models';
import { decodeState } from '../domain/storage';
import { PresentationContext } from './presentation';

const STORAGE_KEY = 'drprop.preview.v1';
export const emptyState = (): DemoState => ({ version: 1, user: null, membership: null, consultations: [], theme: 'system' });
export const demoStore: Store = { id: 'concept-store', name: 'The Dr Prop lounge', address: null, hours: null, memberCap: 300, memberCount: 128, loungeSeatsFree: 6, todaysCoffee: 'Kopi, freshly brewed', demo: true };
type DemoContext = {
  state: DemoState; ready: boolean; storageError: string; login: (phone: string, name: string) => void;
  updateProfile: (name: string, drink: string) => void; setTheme: (theme: DemoState['theme']) => void;
  book: (draft: BookingDraft) => Consultation; cancel: (id: string) => void;
  loadSample: () => void; renew: () => void; logout: () => Promise<void>;
};
const Context = createContext<DemoContext | null>(null);
export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DemoState>(emptyState);
  const current = useRef(state); current.current = state;
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState('');
  const writes = useRef(Promise.resolve());
  function commit(next: DemoState) { current.current = next; setState(next); }
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (!active || !raw) return;
      commit(decodeState(raw));
    }).catch(() => { if (active) setStorageError('Saved preview could not be read. A fresh session is available.'); }).finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!ready) return;
    writes.current = writes.current.then(() => AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state))).catch(() => setStorageError('Changes are available for this session but could not be saved on this device.'));
  }, [state, ready]);
  const value: DemoContext = {
    state, ready, storageError,
    login(phone, displayName) {
      const user = { id: 'preview-member', phone, displayName: displayName.trim(), drinkPreference: 'Kopi, less sweet', language: 'en' as const };
      commit({ ...emptyState(), theme: current.current.theme, user, membership: { userId: user.id, storeId: demoStore.id, memberNo: 'DEMO 0001', status: 'active', renewsAt: new Date(Date.now() + 30 * 86400_000).toISOString() } });
    },
    updateProfile(displayName, drinkPreference) { const data = current.current; if (data.user) commit({ ...data, user: { ...data.user, displayName: displayName.trim(), drinkPreference: drinkPreference.trim() } }); },
    setTheme(theme) { commit({ ...current.current, theme }); },
    book(draft) {
      const data = current.current;
      if (!data.user) throw new Error('Sign in to the preview first.');
      const error = bookingError(draft, data.consultations); if (error) throw new Error(error);
      if (data.consultations.some(item => item.status === 'booked' && item.scheduledAt === draft.scheduledAt)) throw new Error('You already have a preview booking at this time.');
      const record: Consultation = { ...draft, property: draft.property.trim(), id: `preview-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, userId: data.user.id, createdAt: new Date().toISOString(), fee: feeFor(draft.type, draft.priceBand), status: 'booked', payment: 'simulated', questions: [] };
      commit({ ...data, consultations: [record, ...data.consultations] }); return record;
    },
    cancel(id) { commit({ ...current.current, consultations: current.current.consultations.map(item => item.id === id && item.status === 'booked' ? { ...item, status: 'cancelled' } : item) }); },
    loadSample() {
      const data = current.current; if (!data.user || data.consultations.some(item => item.id === 'sample-case')) return;
      const sample: Consultation = { id: 'sample-case', userId: data.user.id, type: 'clinic', priceBand: '300k-600k', fee: 399, property: 'Sample terrace · fictional case', createdAt: '2026-09-01T03:00:00Z', scheduledAt: '2026-09-01T03:00:00Z', status: 'done', payment: 'simulated', attachments: [], reportUrl: 'sample-diagnosis.pdf', advisorNote: 'Illustrative only. Gather the title documents, recurring-cost schedule and inspection findings before deciding.', questions: ['What documents remain outstanding?', 'Which costs recur after the purchase?', 'What needs independent inspection?'] };
      commit({ ...data, consultations: [...data.consultations, sample] });
    },
    renew() { const data = current.current; if (!data.membership) return; const from = Math.max(Date.now(), Date.parse(data.membership.renewsAt ?? '') || 0); commit({ ...data, membership: { ...data.membership, status: 'active', renewsAt: new Date(from + 30 * 86400_000).toISOString() } }); },
    async logout() { await writes.current; await AsyncStorage.removeItem(STORAGE_KEY).catch(() => setStorageError('Device storage could not be cleared.')); commit(emptyState()); },
  };
  return <PresentationContext.Provider value={{ theme: state.theme, storageError, mode: 'preview' }}><Context.Provider value={value}>{children}</Context.Provider></PresentationContext.Provider>;
}
export function useDemo() { const value = useContext(Context); if (!value) throw new Error('DemoProvider required'); return value; }
