// Hjälp för att testa skärmar som läser appens data via useApp() (src/app/AppContext.tsx).
// Testet skickar bara in de fält skärmen faktiskt använder. Läser skärmen ett fält som saknas
// får testet ett tydligt fel ("appModel saknar 'x'") i stället för ett tyst undefined.
import React from 'react';
import { render, type RenderResult } from '@testing-library/react';
import { AppContext } from '../app/AppContext';
import type { AppModel } from '../app/useAppModel';

/** Nycklar som test- och React-verktyg själva frågar efter – de ska bara ge undefined. */
const IGNORED_KEYS = new Set(['then', 'toJSON', 'asymmetricMatch', '$$typeof', 'nodeType', 'constructor']);

export function makeAppModel(fields: Partial<AppModel>): AppModel {
  const handler: ProxyHandler<Partial<AppModel>> = {
    get(target, key, receiver) {
      if (typeof key === 'symbol' || IGNORED_KEYS.has(key) || key in target) {
        return Reflect.get(target, key, receiver);
      }
      throw new Error(`appModel saknar '${key}' – lägg till det i testets makeAppModel({...})`);
    },
  };
  // Proxyn fyller i resten av AppModel genom att kasta fel för fält som testet inte gett
  return new Proxy(fields, handler) as AppModel;
}

/** Renderar `ui` inuti <AppContext> med de fält som testet anger. */
export function renderWithApp(ui: React.ReactElement, fields: Partial<AppModel>): RenderResult {
  const value = makeAppModel(fields);
  return render(<AppContext value={value}>{ui}</AppContext>);
}
