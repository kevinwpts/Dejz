import React from 'react';
import { Check } from '@phosphor-icons/react';

export interface AppearanceSettingsViewProps {
  themeMode: "light" | "dark" | "system";
  applyTheme: (mode: "light" | "dark" | "system") => void;
}

export const AppearanceSettingsView: React.FC<AppearanceSettingsViewProps> = ({
  themeMode,
  applyTheme,
}) => {
  const themeOptions: {
    id: 'light' | 'dark' | 'system';
    label: string;
  }[] = [
    { id: 'light', label: 'Ljust' },
    { id: 'dark', label: 'Mörkt' },
    { id: 'system', label: 'System' },
  ];

  return (
    <div className="ui-page animate-slide-in-right">
      {/* Visual Preview Cards (like iOS / Revolut / Instagram) */}
      <div className="ui-card-p">
        <div className="grid grid-cols-3 gap-2">
          {themeOptions.map((opt) => {
            const isSelected = themeMode === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => applyTheme(opt.id)}
                aria-pressed={isSelected}
                className={`p-2 pb-2.5 rounded-card-nested flex flex-col items-center gap-2 cursor-pointer transition-all active:scale-[0.97] ${
                  isSelected ? 'ui-selected' : 'text-[var(--text-secondary)]'
                }`}
              >
                <div
                  className={`w-full aspect-[4/5] rounded-xl p-2.5 border border-[var(--border-control)] transition-all overflow-hidden relative flex flex-col justify-between ${
                    opt.id === 'light'
                      ? 'bg-stone-100'
                      : opt.id === 'dark'
                      ? 'bg-zinc-950'
                      : 'bg-gradient-to-br from-stone-100 from-50% to-zinc-950 to-50%'
                  }`}
                >
                  {opt.id === 'system' ? (
                    <>
                      <div className="w-full h-5 rounded-lg bg-white/95 border border-black/5 px-1.5 flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-zinc-900" />
                        <div className="h-1.5 w-8 rounded-full bg-black/15" />
                      </div>
                      <div className="space-y-1.5">
                        <div className="w-full h-3.5 rounded-md bg-zinc-900 border border-white/10" />
                        <div className="w-3/4 h-3.5 rounded-md bg-zinc-900 border border-white/10" />
                      </div>
                    </>
                  ) : (
                    <>
                      <div
                        className={`w-full h-5 rounded-lg px-1.5 flex items-center gap-1 ${
                          opt.id === 'light'
                            ? 'bg-white border border-black/5'
                            : 'bg-zinc-900 border border-white/10'
                        }`}
                      >
                        <div
                          className={`w-2 h-2 rounded-full ${
                            opt.id === 'light' ? 'bg-zinc-900' : 'bg-zinc-100'
                          }`}
                        />
                        <div
                          className={`h-1.5 w-8 rounded-full ${
                            opt.id === 'light' ? 'bg-black/15' : 'bg-white/20'
                          }`}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <div
                          className={`w-full h-3.5 rounded-md ${
                            opt.id === 'light'
                              ? 'bg-white border border-black/5'
                              : 'bg-zinc-900 border border-white/10'
                          }`}
                        />
                        <div
                          className={`w-3/4 h-3.5 rounded-md ${
                            opt.id === 'light'
                              ? 'bg-white border border-black/5'
                              : 'bg-zinc-900 border border-white/10'
                          }`}
                        />
                      </div>
                    </>
                  )}
                </div>

                <span
                  className={`text-callout flex items-center gap-1 ${
                    isSelected ? 'font-semibold' : 'font-medium'
                  }`}
                >
                  {isSelected && <Check size={14} />}
                  {opt.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
