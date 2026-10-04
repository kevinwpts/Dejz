import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { User, Mail, LogOut, Camera, Unlink, MailCheck, Globe, Lock, ChevronRight, ChevronLeft } from 'lucide-react';

import { ConfirmModal } from './ConfirmModal';
import { PasswordChangeView } from './PasswordChangeView';
import { TranslationKey } from '../i18n';
import { supabase } from '../supabaseClient';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { Button, Input, IconButton } from './ui';

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
      className="space-y-6 w-full font-sans"
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
          {/* Sub-Navigation Header */}
          <div className="flex items-center gap-3.5 py-1">
            <button
              type="button"
              onClick={onBack}
              className="w-9 h-9 rounded-full bg-[var(--surface-color)] hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center transition-all cursor-pointer active:scale-95 border border-black/[0.04] dark:border-white/[0.06] shadow-2xs shrink-0"
              aria-label={t('back') || 'Tillbaka'}
            >
              <ChevronLeft size={20} strokeWidth={2.2} />
            </button>
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)] truncate">
                {t('manageAccount')}
              </h1>
              <p className="text-[12px] font-normal text-[var(--text-secondary)] opacity-75 truncate">
                {user.email}
              </p>
            </div>
          </div>

          {/* Profile Avatar Upload */}
          <div className="text-center py-2 flex flex-col items-center justify-center">
            <label htmlFor="avatar-manage" className="relative w-20 h-20 mb-2 block cursor-pointer group">
              <div className="w-20 h-20 rounded-[22px] overflow-hidden border-none bg-black/[0.04] dark:bg-[#1C1C1C] relative group-hover:scale-105 active:scale-95 transition-all shadow-none">
                {avatarUrl ? (
                  <img 
                    src={avatarUrl} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[var(--accent-color)]/10 text-[var(--accent-color)] text-2xl font-bold uppercase">
                    {fullName ? fullName.charAt(0).toUpperCase() : user.email?.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 backdrop-blur-[2px]">
                  <Camera size={18} className="text-white" />
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
            <p className="text-[11px] font-semibold text-[var(--text-secondary)] opacity-70">
              Tryck för att ändra profilbild
            </p>
          </div>

          <div className="space-y-4">
            {/* Personal Information */}
            <div className="space-y-3">
              <Input
                label={t('fullName')}
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                icon={<User size={16} />}
              />

              <Input
                label={t('email')}
                type="text"
                readOnly
                disabled
                value={user.email || ''}
                icon={<Mail size={16} />}
              />
            </div>

            {/* Password */}
            <div className="overflow-hidden rounded-[22px] bg-[var(--surface-color)] backdrop-blur-xl border-none shadow-none">
              <button
                type="button"
                onClick={() => setShowPasswordChange(true)}
                className="w-full flex items-center justify-between p-4 hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition-all cursor-pointer text-left group"
              >
                <div className="flex items-center gap-3.5 min-w-0 pr-2">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-black/[0.04] dark:bg-[#222222] text-[var(--text-primary)]">
                    <Lock size={16} strokeWidth={1.8} />
                  </div>
                  <span className="text-[14px] font-semibold text-[var(--text-primary)] tracking-tight">
                    {t('changePassword' as any) || 'Ändra lösenord'}
                  </span>
                </div>
                <ChevronRight size={16} className="text-[var(--text-secondary)] opacity-60 group-hover:translate-x-0.5 transition-transform shrink-0" />
              </button>
            </div>

            {/* Connected Accounts */}
            {identities.length > 0 && (
              <div className="space-y-2">
                <span className="text-[12px] font-semibold text-[var(--text-secondary)] px-1.5 block">
                  {t('connectedAccounts' as any) || 'Kopplade konton'}
                </span>
                <div className="overflow-hidden divide-y divide-black/[0.04] dark:divide-white/[0.04] rounded-[22px] bg-[var(--surface-color)] backdrop-blur-xl border-none shadow-none">
                  {identities.map((identity) => (
                    <div
                      key={identity.id}
                      className="p-4 flex items-center justify-between hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition-colors"
                    >
                      <div className="flex items-center gap-3.5 min-w-0 pr-2">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-black/[0.04] dark:bg-[#222222] text-[var(--text-primary)]">
                          {identity.provider === 'google' ? (
                            <Globe size={16} strokeWidth={1.75} className="text-[var(--accent-color)]" />
                          ) : identity.provider === 'facebook' ? (
                            <svg className="w-4 h-4 shrink-0 text-[#1877F2]" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                            </svg>
                          ) : (
                            <MailCheck size={16} strokeWidth={1.75} className="text-[var(--text-secondary)]" />
                          )}
                        </div>
                        <div className="min-w-0 flex flex-col justify-center">
                          <span className="text-[14px] font-semibold text-[var(--text-primary)] tracking-tight">
                            {identity.provider === 'email'
                              ? t('providerEmail' as any) || 'E-post'
                              : identity.provider === 'google'
                              ? t('providerGoogle' as any) || 'Google'
                              : identity.provider === 'facebook'
                              ? 'Facebook'
                              : identity.provider}
                          </span>
                          {identity.identity_data?.email && (
                            <span className="text-[12px] font-normal text-[var(--text-secondary)] opacity-70 mt-0.5">
                              {identity.identity_data?.email}
                            </span>
                          )}
                        </div>
                      </div>
                      {identities.length > 1 && (
                        <IconButton
                          icon={<Unlink size={14} />}
                          onClick={() => handleUnlink(identity)}
                          disabled={isUpdating}
                          variant="danger"
                          size="xs"
                          aria-label="Koppla från konto"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="pt-2 space-y-2.5">
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
                       setConfirmConfig(prev => ({ ...prev, isOpen: false }))
                    }
                  });
                }}
                variant="ghost"
                fullWidth
                icon={<LogOut size={15} strokeWidth={1.75} />}
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
