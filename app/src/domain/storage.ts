import type { DemoState } from './models.ts';
import { bands, consultationTypes } from './booking.ts';
const object = (value: unknown): value is Record<string, any> => !!value && typeof value === 'object' && !Array.isArray(value);
const string = (value: unknown) => typeof value === 'string';
export function decodeState(raw: string): DemoState {
  const value = JSON.parse(raw);
  if (!object(value) || value.version !== 1 || !['system','light','dark'].includes(value.theme) || !Array.isArray(value.consultations)) throw new Error('Invalid preview state');
  if (value.user !== null && (!object(value.user) || !['id','phone','displayName','drinkPreference'].every(key=>string(value.user[key])) || value.user.language !== 'en')) throw new Error('Invalid preview profile');
  if (value.membership !== null && (!object(value.membership) || !['userId','storeId','memberNo'].every(key=>string(value.membership[key])) || !['active','waitlist','expired'].includes(value.membership.status) || (value.membership.renewsAt !== null && !Number.isFinite(Date.parse(value.membership.renewsAt))))) throw new Error('Invalid preview membership');
  for (const item of value.consultations) {
    if (!object(item) || !['id','userId','property','scheduledAt','createdAt'].every(key=>string(item[key])) || !Number.isFinite(Date.parse(item.scheduledAt)) || !Number.isFinite(Date.parse(item.createdAt)) || !Number.isFinite(item.fee) || item.fee<0 || !bands.some(band=>band.id===item.priceBand) || !consultationTypes.some(type=>type.id===item.type) || !['booked','done','cancelled'].includes(item.status) || item.payment !== 'simulated' || !Array.isArray(item.questions) || !item.questions.every(string) || !Array.isArray(item.attachments) || item.attachments.some((file:unknown)=>!object(file)||!string(file.name)||!string(file.mimeType)||!Number.isFinite(file.size))) throw new Error('Invalid preview record');
    if (!value.user || item.userId !== value.user.id) throw new Error('Preview record belongs to a different user');
  }
  if (value.membership && (!value.user || value.membership.userId !== value.user.id)) throw new Error('Preview membership belongs to a different user');
  return value as DemoState;
}
