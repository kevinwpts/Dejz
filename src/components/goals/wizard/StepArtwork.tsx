// Steg 2 i "Nytt sparmål": välj bild till målet (live-kort, sök och rutnät med bilder).
import type { RefObject } from 'react';
import React from 'react';
import { MagnifyingGlass, ImageSquare, X } from '@phosphor-icons/react';
import type { GoalArtworkTheme } from '../../ui/VisualArtwork';
import { getGoalArtworkTheme, GoalArtworkIllustration } from '../../ui/VisualArtwork';

interface StepArtworkProps {
  animClass: string;
  goalNameInput: string;
  goalArtworkId: string;
  goalCustomImage: string | undefined;
  artworkSearch: string;
  setArtworkSearch: (value: string) => void;
  galleryInputRef: RefObject<HTMLInputElement | null>;
  filteredArtworks: GoalArtworkTheme[];
  /** Personen valde en av de färdiga bilderna. */
  onPickArtwork: (artworkId: string) => void;
  onContinue: () => void;
}

export const StepArtwork: React.FC<StepArtworkProps> = ({
  animClass,
  goalNameInput,
  goalArtworkId,
  goalCustomImage,
  artworkSearch,
  setArtworkSearch,
  galleryInputRef,
  filteredArtworks,
  onPickArtwork,
  onContinue,
}) => {
  const activeTheme = getGoalArtworkTheme(goalArtworkId);

  return (
    <div
      className={`flex-1 min-h-0 flex flex-col justify-between overflow-hidden pt-2 ${animClass}`}
    >
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-3 p-1 -mx-1">
        {/* Förhandsvisning: samma rad som i målistan – bilden i sin ruta + namnet */}
        <div className="rounded-card-nested bg-[var(--surface-color)] shadow-[var(--card-shadow)] px-4 py-3 flex items-center gap-3.5">
          <div className="relative w-12 h-12 shrink-0 rounded-xl overflow-hidden bg-[var(--goal-art-bg)] flex items-center justify-center">
            {goalCustomImage ? (
              <img
                src={goalCustomImage}
                alt={goalNameInput}
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <GoalArtworkIllustration
                artworkId={activeTheme.id}
                className="w-[88%] h-[88%]"
              />
            )}
          </div>
          <span className="font-display font-semibold text-base text-[var(--text-primary)] min-w-0 truncate">
            {goalNameInput.trim() || 'Nytt sparmål'}
          </span>
        </div>

        <div className="ui-search-box shrink-0">
          <MagnifyingGlass size={16} className="text-[var(--text-muted)] shrink-0" />
          <input
            aria-label="Sök bild"
            type="text"
            value={artworkSearch}
            onChange={(e) => setArtworkSearch(e.target.value)}
            placeholder="Sök bild, t.ex. resa"
            className="ui-search-input"
          />
          {artworkSearch.length > 0 && (
            <button
              type="button"
              onClick={() => setArtworkSearch('')}
              aria-label="Rensa sökning"
              className="ui-clear-btn"
            >
              <X size={14} weight="bold" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2.5 content-start">
          <button
            type="button"
            onClick={() => galleryInputRef.current?.click()}
            className={`aspect-square rounded-2xl p-2.5 flex flex-col items-center justify-center text-center transition-all cursor-pointer relative overflow-hidden ${
              goalCustomImage
                ? 'ring-2 ring-offset-2 ring-offset-[var(--bg-color)] ring-[var(--cta-bg)]'
                : 'bg-[var(--surface-color)] shadow-[var(--card-shadow)]'
            }`}
          >
            {goalCustomImage ? (
              <>
                <img
                  src={goalCustomImage}
                  alt="Uppladdad"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/35 flex flex-col items-center justify-center p-2">
                  <ImageSquare size={22} weight="bold" className="text-white mb-1" />
                  <span className="text-footnote font-medium text-white leading-tight">
                    Byt bild
                  </span>
                </div>
              </>
            ) : (
              <>
                <ImageSquare
                  size={22}
                  weight="regular"
                  className="text-[var(--text-primary)] mb-1.5"
                />
                <span className="text-footnote font-medium text-[var(--text-primary)] leading-tight">
                  Egen bild
                </span>
              </>
            )}
          </button>

          {filteredArtworks.map((art) => {
            const isSelected = !goalCustomImage && goalArtworkId === art.id;
            return (
              <button
                key={art.id}
                type="button"
                onClick={() => onPickArtwork(art.id)}
                title={art.label}
                aria-label={art.label}
                aria-pressed={isSelected}
                style={{ backgroundColor: art.tileBg }}
                className={`aspect-square rounded-2xl p-2 flex items-center justify-center transition-all cursor-pointer relative overflow-hidden ${
                  isSelected
                    ? 'ring-2 ring-offset-2 ring-offset-[var(--bg-color)] ring-[var(--cta-bg)]'
                    : ''
                }`}
              >
                <GoalArtworkIllustration artworkId={art.id} className="w-full h-full" />
              </button>
            );
          })}
        </div>
      </div>

      <div className="shrink-0 pt-3">
        <button
          type="button"
          onClick={onContinue}
          className="ui-btn-primary"
        >
          <span>Fortsätt</span>
        </button>
      </div>
    </div>
  );
};
