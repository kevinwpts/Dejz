import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { User, Mail, LogOut, Loader2, Camera, Unlink, MailCheck, Globe, Lock } from 'lucide-react';

import { ConfirmModal } from './ConfirmModal';
import { PasswordChangeView } from './PasswordChangeView';
import { TranslationKey } from '../i18n';
import { supabase } from '../supabaseClient';
import { User as SupabaseUser } from '@supabase/supabase-js';

interface ManageAccountViewProps {
  onBack: () => void;
  user: SupabaseUser | null;
  onUpdateProfile: () => void;
  onLogout: () => void;
  t: (key: TranslationKey) => string;
  addToast: (message: string, type: 'success' | 'error') => void;
  onUploadAvatar: (file: File) => void;
  avatarUrl?: string | null;
  subscriptionStatus: string | null;
  trialEnd: string | null;
  nextBillingDate: string | null;
  onPaymentSuccess: () => void;
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
  _subscriptionStatus,
  _trialEnd,
  _nextBillingDate,
  _onPaymentSuccess
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
        } catch (_error) {
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
    } catch (_error) {
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
      className="space-y-6"
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
          {/* Profile Avatar Upload */}
          <div className="text-center py-2 flex flex-col items-center justify-center">
            <label htmlFor="avatar-manage" className="relative w-32 h-32 mb-3 block cursor-pointer group">
              <div className="w-32 h-32 rounded-[28px] overflow-hidden border border-[var(--border-color)] bg-[var(--surface-color)] relative group-hover:scale-102 group-active:scale-[0.97] transition-all duration-350 shadow-md">
                {avatarUrl ? (
                  <img 
                    src={avatarUrl} 
                    alt="Profile" 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[var(--accent-color)]/10 text-[var(--accent-color)] text-4xl font-bold font-display uppercase">
                    {fullName ? fullName.charAt(0).toUpperCase() : user.email?.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 backdrop-blur-[2px] duration-300">
                  <Camera size={20} strokeWidth={1.5} className="text-white" />
                </div>
                {isUpdating && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm">
                    <Loader2 className="animate-spin text-white" size={20} />
                  </div>
                )}
              </div>
              <input 
                id="avatar-manage"
                type="file" 
                className="hidden" 
                accept="image/*"
                onChange={handleFileChange}
              />
            </label>
            <p className="text-metadata font-semibold text-[var(--text-secondary)] opacity-70 mt-1 uppercase tracking-tight">
              Klicka för att ändra bild
            </p>
          </div>

          <div className="space-y-6">
            {/* Personal Information */}
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-label-caps text-[var(--text-secondary)] ml-1 block">
                  {t('fullName')}
                </label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--accent-color)]">
                    <User size={16} strokeWidth={1.5} />
                  </div>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-[var(--surface-muted)] hover:bg-[var(--surface-color)]/55 focus:bg-[var(--surface-color)] border border-[var(--border-color)] focus:border-[var(--accent-color)]/40 rounded-[14px] pl-11 pr-4 py-3.5 text-body-md font-semibold text-[var(--text-primary)] transition-all duration-300 outline-none shadow-xs placeholder:text-[var(--text-secondary)]/30 tracking-tight"
                    placeholder="John Doe"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-label-caps text-[var(--text-secondary)] ml-1 block">
                  {t('email')}
                </label>
                <div className="relative opacity-60">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">
                    <Mail size={16} strokeWidth={1.5} />
                  </div>
                  <input
                    type="text"
                    readOnly
                    value={user.email}
                    className="w-full bg-[var(--surface-muted)] border border-[var(--border-color)]/50 rounded-[14px] pl-11 pr-4 py-3.5 text-body-md font-semibold text-[var(--text-secondary)] outline-none cursor-not-allowed font-mono tracking-tight"
                  />
                </div>
              </div>
            </div>

            {/* Password */}
            <div className="pt-1">
              <button
                onClick={() => setShowPasswordChange(true)}
                className="w-full flex items-center justify-between p-4 bg-[var(--surface-muted)]/50 border border-[var(--border-color)] rounded-[16px] hover:bg-[var(--surface-muted)]/80 transition-all duration-300 shadow-xs group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-[12px] bg-[var(--bg-color)] flex items-center justify-center text-[var(--text-primary)] border border-[var(--border-color)] group-hover:border-[var(--accent-color)]/30 transition-colors">
                    <Lock size={16} strokeWidth={1.5} />
                  </div>
                  <span className="text-body-sm font-semibold text-[var(--text-primary)] tracking-tight">{t('changePassword' as any)}</span>
                </div>
              </button>
            </div>

            {/* Connected Accounts */}
            {identities.length > 0 && (
              <div className="space-y-3 pt-1">
                <h4 className="text-label-caps text-[var(--text-secondary)] px-1 block">
                  {t('connectedAccounts' as any) || 'Kopplade konton'}
                </h4>
                <div className="space-y-2.5">
                  {identities.map((identity) => (
                    <div 
                      key={identity.id} 
                      className="flex items-center justify-between p-4 bg-[var(--surface-muted)]/50 border border-[var(--border-color)] rounded-[16px] hover:bg-[var(--surface-muted)]/80 transition-all duration-300 shadow-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-[12px] bg-[var(--bg-color)] flex items-center justify-center text-[var(--text-primary)] border border-[var(--border-color)]">
                          {identity.provider === 'google' ? (
                            <Globe size={16} strokeWidth={1.5} className="text-[var(--accent-color)]" />
                          ) : (
                            <MailCheck size={16} strokeWidth={1.5} className="text-[var(--text-secondary)]" />
                          )}
                        </div>
                        <div>
                          <p className="text-label-caps text-[var(--text-primary)] mb-0.5 tracking-tight">
                            {identity.provider === 'email' ? (t('providerEmail' as any) || 'E-post') : 
                              identity.provider === 'google' ? (t('providerGoogle' as any) || 'Google') : 
                              identity.provider}
                          </p>
                          {identity.identity_data?.email && (
                            <p className="text-[10px] font-mono text-[var(--text-secondary)] opacity-60 tracking-tight">{identity.identity_data.email}</p>
                          )}
                        </div>
                      </div>
                      {identities.length > 1 && (
                        <button
                          onClick={() => handleUnlink(identity)}
                          disabled={isUpdating}
                          className="p-2.5 text-[var(--text-secondary)] hover:text-danger hover:bg-danger/10 rounded-[10px] transition-all active:scale-90 disabled:opacity-50"
                        >
                          <Unlink size={14} strokeWidth={1.5} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="pt-2 space-y-4">
              <button 
                onClick={handleSave}
                disabled={isUpdating}
                className="btn-primary w-full py-4 h-auto text-sm shadow-xs uppercase font-bold"
              >
                {isUpdating ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <span>{t('saveChanges')}</span>
                )}
              </button>
              
              <button 
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
                className="btn-action-sm w-full py-4 h-auto text-sm shadow-xs uppercase font-bold"
              >
                <LogOut size={14} strokeWidth={1.5} />
                <span>{t('logout')}</span>
              </button>
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
