import { createContext, useContext } from 'react';
export const PresentationContext = createContext({ theme: 'system' as 'system' | 'light' | 'dark', storageError: '', mode: 'preview' as 'preview' | 'backend' });
export const usePresentation = () => useContext(PresentationContext);
