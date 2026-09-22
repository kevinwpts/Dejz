import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

import { X, User, Mail, LogOut, Loader2, Camera, Unlink, Globe, MailCheck } from 'lucide-react';

import { ConfirmModal } from './ConfirmModal';
import { TranslationKey } from '../i18n';
import { supabase } from '../supabaseClient';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { useScrollLock } from '../hooks/useScrollLock';

interface ManageAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
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

export function ManageAccountModal({ 
  isOpen, 
  onClose, 
  user, 
  onUpdateProfile, 
  onLogout, 
  t, 
  addToast,
  onUploadAvatar,
  avatarUrl,
  subscriptionStatus: _subscriptionStatus,
  trialEnd: _trialEnd,
  nextBillingDate: _nextBillingDate,
  onPaymentSuccess: _onPaymentSuccess
}: ManageAccountModalProps) {
  useScrollLock(isOpen);
  const [fullName, setFullName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
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

  if (!isOpen || !user) return null;

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
      onClose();
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
    <AnimatePresence>
      {isOpen && user && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="bg-[var(--surface-solid)] w-full max-w-sm rounded-[24px] p-6 sm:p-7 relative border border-[var(--border-color)] max-h-[90vh] overflow-y-auto custom-scrollbar overscroll-contain pt-[env(safe-area-inset-top)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={onClose}
              className="absolute right-5 top-5 w-7 h-7 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)] bg-[var(--surface-color)] rounded-[8px] border border-[var(--border-color)] transition-all cursor-pointer"
            >
              <X size={14} />
            </button>

            <div className="text-center mb-6">
              <div className="relative w-20 h-20 mx-auto mb-3">
                <div className="w-20 h-20 rounded-[14px] overflow-hidden border border-[var(--border-color)] bg-[var(--surface-color)] relative group shadow-xs transition-transform hover:scale-[1.01]">
                  {avatarUrl ? (
                    <img 
                      src={avatarUrl} 
                      alt="Profile" 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[var(--accent-color)]/10 text-[var(--accent-color)] text-2xl font-bold font-display">
                      {fullName ? fullName.charAt(0).toUpperCase() : user.email?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <label className="absolute inset-0 bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 backdrop-blur-[2px] cursor-pointer duration-200">
                    <Camera size={18} className="text-white" />
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*"
                      onChange={handleFileChange}
                    />
                  </label>
                </div>
              </div>
              <h2 className="text-xl font-bold text-[var(--text-primary)] tracking-tight font-display">{t('editProfile')}</h2>
              <p className="text-xs text-[var(--text-secondary)] opacity-60 mt-0.5 font-sans">{t('manageYourAccount')}</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)] ml-1 block font-sans">
                  {t('fullName')}
                </label>
                <div className="relative group">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--accent-color)]">
                    <User size={15} strokeWidth={1.5} />
                  </div>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-[var(--surface-muted)] hover:bg-[var(--surface-color)]/55 focus:bg-[var(--surface-color)] border border-[var(--border-color)] focus:border-[var(--accent-color)]/40 rounded-[12px] pl-10 pr-4 py-3 text-sm font-semibold text-[var(--text-primary)] transition-all duration-200 outline-none shadow-xs placeholder:text-[var(--text-secondary)]/30"
                    placeholder="John Doe"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)] ml-1 block font-sans">
                  {t('email')}
                </label>
                <div className="relative opacity-60">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] font-mono">
                    <Mail size={15} strokeWidth={1.5} />
                  </div>
                  <input
                    type="text"
                    readOnly
                    value={user.email}
                    className="w-full bg-[var(--surface-muted)] border border-[var(--border-color)]/50 rounded-[12px] pl-10 pr-4 py-3 text-sm font-semibold text-[var(--text-secondary)] outline-none cursor-not-allowed font-mono"
                  />
                </div>
              </div>

              {identities.length > 0 && (
                <div className="space-y-2 pt-1">
                  <h4 className="text-xs font-semibold text-[var(--text-secondary)] px-1 block">
                    {t('connectedAccounts' as any) || 'Kopplade konton'}
                  </h4>
                  <div className="space-y-2">
                    {identities.map((identity) => (
                      <div 
                        key={identity.id} 
                        className="flex items-center justify-between p-3 bg-[var(--surface-muted)]/50 border border-[var(--border-color)] rounded-[14px] hover:bg-[var(--surface-muted)]/80 transition-all duration-200 shadow-xs"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-[8px] bg-[var(--bg-color)] flex items-center justify-center text-[var(--text-primary)] border border-[var(--border-color)]">
                            {identity.provider === 'google' ? (
                              <Globe size={15} strokeWidth={1.5} className="text-[var(--accent-color)]" />
                            ) : (
                              <MailCheck size={15} strokeWidth={1.5} className="text-[var(--text-secondary)]" />
                            )}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-[var(--text-primary)]">
                              {identity.provider === 'email' ? (t('providerEmail' as any) || 'E-post') : 
                               identity.provider === 'google' ? (t('providerGoogle' as any) || 'Google') : 
                               identity.provider}
                            </p>
                            {identity.identity_data?.email && (
                              <p className="text-[10px] font-mono text-[var(--text-secondary)] opacity-60 mt-0.5">{identity.identity_data.email}</p>
                            )}
                          </div>
                        </div>
                        {identities.length > 1 && (
                          <button
                            onClick={() => handleUnlink(identity)}
                            disabled={isUpdating}
                            className="p-2 text-[var(--text-secondary)] hover:text-danger hover:bg-danger/10 rounded-[8px] transition-all active:scale-90 disabled:opacity-50 cursor-pointer"
                          >
                            <Unlink size={13} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2 space-y-2.5">
                <button 
                  onClick={handleSave}
                  disabled={isUpdating}
                  className="w-full bg-[var(--accent-color)] text-[var(--text-on-accent)] hover:brightness-105 py-3 px-4 rounded-[12px] font-semibold text-sm active:scale-[0.98] transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isUpdating ? (
                    <Loader2 size={14} className="div-spin" />
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
                        onClose();
                        setConfirmConfig(prev => ({ ...prev, isOpen: false }))
                      }
                    });
                  }}
                  className="w-full py-3 px-4 rounded-[12px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-color)] active:scale-[0.98] transition-all text-sm border border-[var(--border-color)] bg-transparent flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogOut size={14} strokeWidth={1.5} />
                  <span>{t('signOut')}</span>
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
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
    </AnimatePresence>
  );
}
