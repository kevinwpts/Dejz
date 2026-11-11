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
        <div className="grid grid-cols-3 gap-3">
          {themeOptions.map((opt) => {
            const isSelected = themeMode === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => applyTheme(opt.id)}
                className="flex flex-col items-center gap-2.5 cursor-pointer group"
              >
                <div
                  className={`w-full aspect-[4/5] rounded-2xl p-2.5 border-2 transition-all overflow-hidden relative flex flex-col justify-between ${
                    isSelected
                      ? 'border-[var(--text-primary)] shadow-sm scale-[1.02]'
                      : 'border-[var(--border-subtle)] opacity-80 group-hover:opacity-100'
                  } ${
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
                  className={`text-xs ${
                    isSelected
                      ? 'font-semibold text-[var(--text-primary)]'
                      : 'font-medium text-[var(--text-muted)]'
                  }`}
                >
                  {opt.label}
                </span>

                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                    isSelected
                      ? 'bg-[var(--text-primary)] border-[var(--text-primary)] text-[var(--bg-color)]'
                      : 'border-[var(--border-control)] bg-transparent'
                  }`}
                >
                  {isSelected && <Check size={11} weight="bold" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
