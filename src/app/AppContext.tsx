import { createContext, useContext } from 'react';
import type { AppModel } from './useAppModel';

/** Appens data och åtgärder, så att skärmarna kan läsa det de behöver utan långa listor med värden */
export const AppContext = createContext<AppModel | null>(null);

export function useApp(): AppModel {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp() måste användas inuti <AppContext.Provider>');
  return value;
}
