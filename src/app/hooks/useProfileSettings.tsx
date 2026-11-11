import type { SetStateAction } from 'react';
import { useCallback } from 'react';
import { WeekendHandlingMode } from '../../utils/periodEngine';
import { supabase } from '../../supabaseClient';
import { dataService } from '../../services/dataService';
import { saveCachedAppState } from '../../utils/appCache';

export interface UseProfileSettingsContext {
  setTargetPayday: (value: SetStateAction<number>) => void;
  userId: string;
  setWeekendHandling: (value: SetStateAction<WeekendHandlingMode>) => void;
  setUserAvatar: (value: SetStateAction<string>) => void;
  setUserEmail: (value: SetStateAction<string>) => void;
  setUserName: (value: SetStateAction<string>) => void;
}

export function useProfileSettings({
  setTargetPayday,
  userId,
  setWeekendHandling,
  setUserAvatar,
  setUserEmail,
  setUserName,
}: UseProfileSettingsContext) {
  // Uppdatera lönedag & spara till Supabase + cache
  const handleUpdatePayday = useCallback(
    (day: number) => {
      setTargetPayday(day);
      saveCachedAppState({ targetPayday: day });
      if (userId) {
        dataService.updateProfile(userId, { payday: day }).catch(() => {});
      }
    },
    [userId]
  );

  // Uppdatera helghantering & spara till Supabase + cache
  const handleUpdateWeekendHandling = useCallback(
    (mode: WeekendHandlingMode) => {
      setWeekendHandling(mode);
      saveCachedAppState({ weekendHandling: mode });
      if (userId) {
        dataService
          .updateProfile(userId, { payday_before_weekend: mode === 'before' })
          .catch(() => {});
      }
    },
    [userId]
  );

  // Uppdatera profilbild
  const handleUpdateAvatar = useCallback(
    (avatarDataUrl: string | null) => {
      setUserAvatar(avatarDataUrl);
      saveCachedAppState({ userAvatar: avatarDataUrl });
      if (userId && avatarDataUrl) {
        dataService.updateProfile(userId, { avatar_url: avatarDataUrl }).catch(() => {});
      }
    },
    [userId]
  );

  // Uppdatera e-post
  const handleUpdateEmail = useCallback(
    (email: string) => {
      setUserEmail(email);
      saveCachedAppState({ userEmail: email });
      if (userId && userId !== 'demo-user' && userId !== 'preview-user') {
        supabase.auth.updateUser({ email }).catch(() => {});
      }
    },
    [userId]
  );

  // Uppdatera namn
  const handleUpdateName = useCallback(
    (name: string) => {
      const clean = name.trim();
      setUserName(clean || null);
      try {
        if (clean) {
          localStorage.setItem('dejz_user_name', clean);
        } else {
          localStorage.removeItem('dejz_user_name');
        }
      } catch {
        // ignore
      }
      if (userId && userId !== 'demo-user' && userId !== 'preview-user') {
        supabase.auth.updateUser({ data: { full_name: clean } }).catch(() => {});
      }
    },
    [userId]
  );

  return {
    handleUpdateWeekendHandling,
    handleUpdateName,
    handleUpdatePayday,
    handleUpdateAvatar,
    handleUpdateEmail,
  };
}
