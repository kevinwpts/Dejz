import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { User, Mail, LogOut, Camera, Unlink, MailCheck, Globe, Lock, ChevronLeft } from 'lucide-react';

import { ConfirmModal } from './ConfirmModal';
import { PasswordChangeView } from './PasswordChangeView';
import { TranslationKey } from '../i18n';
import { supabase } from '../supabaseClient';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { Button, IconButton, ListRow, Card } from './ui';

interface ManageAccountViewProps {
  onBack: () => void;
  user: SupabaseUser | null;
  onUpdateProfile: () => void;
  onLogout: () => void;
  t: (key: TranslationKey) => string;
  addToast: (message: string, type: 'success' | 'error') => void;
  onUploadAvatar: (file: File) => void;
  avatarUrl?: string | null;
  subscriptionStatus?: string | null;
  trialEnd?: string | null;
  nextBillingDate?: string | null;
  onPaymentSuccess?: () => void;
}

export function ManageAccountView({ 
  onBack, 
  user, 
  onUpdateProfile, 
  onLogout, 
  t, 
  addToast,
  onUploadAvatar,
  avatarUrl,
}: ManageAccountViewProps) {
  const [fullName, setFullName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [identities, setIdentities] = useState<any[]>([]);
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  useEffect(() => {
    if (user?.user_metadata?.full_name) {
      setFullName(user.user_metadata.full_name);
    }
    if (user?.identities) {
      setIdentities(user.identities);
    }
  }, [user]);

  if (!user) return null;

  const handleUnlink = async (identity: any) => {
    if (identities.length <= 1) {
      addToast(t('cannotDisconnectLastAccount' as any), 'error');
      return;
    }
    
    setConfirmConfig({
      isOpen: true,
      title: t('disconnectAccount' as any),
      message: t('confirmDisconnectAccount' as any),
      onConfirm: async () => {
        setIsUpdating(true);
        try {
          const { error } = await supabase.auth.unlinkIdentity(identity);
          if (error) throw error;
          
          setIdentities(identities.filter(id => id.identity_id !== identity.identity_id));
          addToast(t('accountDisconnected' as any), 'success');
        } catch (error: any) {
          console.error('Error unlinking account:', error);
          addToast(error.message || t('error'), 'error');
        } finally {
          setIsUpdating(false);
          setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleSave = async () => {
    setIsUpdating(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: fullName }
      });

      if (error) throw error;

      addToast(t('profileUpdated'), 'success');
      onUpdateProfile();
      onBack();
    } catch (error: any) {
      console.error('Error updating profile:', error);
      addToast(error.message || t('error'), 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) {
      return;
    }
    onUploadAvatar(event.target.files[0]);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-[var(--card-gap)] w-full font-sans pb-12"
    >
      {showPasswordChange ? (
        <PasswordChangeView
          onBack={() => setShowPasswordChange(false)}
          t={t}
          addToast={addToast}
          userEmail={user.email || ''}
        />
      ) : (
        <>
          {/* Top Header with Back Navigation */}
          <div className="flex items-center gap-3.5 py-1">
            <IconButton
              icon={<ChevronLeft size={20} strokeWidth={2} />}
              onClick={onBack}
              aria-label={t('back') || 'Tillbaka'}
              variant="secondary"
              size="sm"
            />
            <div className="min-w-0">
              <h1 className="text-page-title font-bold text-[var(--text-primary)] truncate">
                {t('manageAccount') || 'Hantera konto'}
              </h1>
              <p className="text-secondary text-[var(--text-secondary)] opacity-70 truncate">
                {user.email}
              </p>
            </div>
          </div>

          {/* Profile Avatar Card */}
          <Card padding="md" className="flex flex-col items-center justify-center text-center space-y-3 relative overflow-hidden">
            <label htmlFor="avatar-manage" className="relative cursor-pointer group">
              <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-[var(--radius-card-nested,12px)] overflow-hidden bg-[var(--surface-muted)] relative transition-all duration-300 group-hover:scale-105 active:scale-95 shadow-none">
                {avatarUrl ? (
                  <img 
                    src={avatarUrl} 
                    alt="Profile" 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[var(--accent-color)]/10 text-[var(--accent-color)] text-2xl font-bold">
                    {(fullName || user.email || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 backdrop-blur-[2px]">
                  <Camera size={20} className="text-white" />
                </div>
              </div>
              <input 
                id="avatar-manage"
                type="file" 
                className="hidden" 
                accept="image/*"
                onChange={handleFileChange}
              />
            </label>
            <div className="space-y-0.5">
              <p className="text-body-medium font-semibold text-[var(--text-primary)]">
                {fullName || user.email?.split('@')[0]}
              </p>
              <p className="text-micro-label font-medium text-[var(--text-secondary)] opacity-70">
                {t('clickToChangePhoto' as any) || 'Tryck på bilden för att ändra profilbild'}
              </p>
            </div>
          </Card>

          <div className="space-y-5">
            {/* Personal Details */}
            <div className="space-y-2.5">
              <h4 className="text-section-title px-1.5">
                {t('personalInfo' as any) || 'Personuppgifter'}
              </h4>
              <Card variant="default" padding="none" className="divide-y divide-menu">
                <div className="px-4 py-3.5 flex items-center justify-between gap-3 min-h-[54px]">
                  <div className="flex items-center gap-3 shrink-0">
                    <User size={18} strokeWidth={2} className="text-[var(--text-secondary)] shrink-0" />
                    <span className="text-body font-medium text-[var(--text-primary)]">
                      {t('fullName')}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Förnamn Efternamn"
                    className="text-sm font-medium text-[var(--text-primary)] text-right bg-transparent outline-none flex-1 min-w-0 placeholder:text-[var(--text-tertiary)] placeholder:font-normal"
                  />
                </div>

                <div className="px-4 py-3.5 flex items-center justify-between gap-3 min-h-[54px]">
                  <div className="flex items-center gap-3 shrink-0">
                    <Mail size={18} strokeWidth={2} className="text-[var(--text-secondary)] shrink-0" />
                    <span className="text-body font-medium text-[var(--text-primary)]">
                      {t('email')}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-[var(--text-secondary)] truncate max-w-[200px] sm:max-w-[260px]">
                    {user.email || ''}
                  </span>
                </div>
              </Card>
            </div>

            {/* Security Section */}
            <div className="space-y-2.5">
              <h4 className="text-section-title px-1.5">
                {t('security' as any) || 'Säkerhet'}
              </h4>
              <Card variant="default" padding="none" className="divide-y divide-menu">
                <ListRow
                  variant="grouped"
                  density="compact"
                  showChevron
                  icon={<Lock size={18} strokeWidth={2} />}
                  iconColor="text-[var(--text-secondary)]"
                  title={t('changePassword' as any) || 'Ändra lösenord'}
                  onClick={() => setShowPasswordChange(true)}
                />
              </Card>
            </div>

            {/* Connected Accounts / Inloggningsmetoder */}
            {identities.length > 0 && (
              <div className="space-y-2.5">
                <h4 className="text-section-title px-1.5">
                  {t('connectedAccounts' as any) || 'Inloggningsmetoder'}
                </h4>
                <Card variant="default" padding="none" className="divide-y divide-menu">
                  {identities.map((identity) => (
                    <ListRow
                      key={identity.id}
                      variant="grouped"
                      density="compact"
                      icon={
                        identity.provider === 'google' ? (
                          <Globe size={18} strokeWidth={2} className="text-[var(--accent-color)]" />
                        ) : identity.provider === 'facebook' ? (
                          <svg className="w-4.5 h-4.5 shrink-0" viewBox="0 0 24 24" fill="#1877F2">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                          </svg>
                        ) : (
                          <MailCheck size={18} strokeWidth={2} className="text-[var(--text-secondary)]" />
                        )
                      }
                      title={
                        identity.provider === 'email'
                          ? t('providerEmail' as any) || 'E-post'
                          : identity.provider === 'google'
                          ? t('providerGoogle' as any) || 'Google'
                          : identity.provider === 'facebook'
                          ? 'Facebook'
                          : identity.provider
                      }
                      subtitle={identity.identity_data?.email}
                      rightElement={
                        identities.length > 1 ? (
                          <IconButton
                            icon={<Unlink size={14} />}
                            onClick={() => handleUnlink(identity)}
                            disabled={isUpdating}
                            variant="danger"
                            size="xs"
                            aria-label="Koppla från konto"
                          />
                        ) : undefined
                      }
                    />
                  ))}
                </Card>
              </div>
            )}

            {/* Actions */}
            <div className="pt-3 space-y-2.5">
              <Button 
                onClick={handleSave}
                loading={isUpdating}
                variant="primary"
                fullWidth
              >
                {t('saveChanges')}
              </Button>
              
              <Button 
                onClick={() => {
                  setConfirmConfig({
                    isOpen: true,
                    title: t('signOut'),
                    message: t('signOutConfirm'),
                    onConfirm: () => {
                      onLogout();
                      onBack();
                      setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                    }
                  });
                }}
                variant="ghost"
                fullWidth
                icon={<LogOut size={16} strokeWidth={2} />}
              >
                {t('logout')}
              </Button>
            </div>
          </div>

          {confirmConfig.isOpen && (
            <ConfirmModal
              isOpen={confirmConfig.isOpen}
              title={confirmConfig.title}
              message={confirmConfig.message}
              onConfirm={confirmConfig.onConfirm}
              onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
              t={t}
            />
          )}
        </>
      )}
    </motion.div>
  );
}
