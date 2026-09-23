import React, { useState, useEffect } from 'react';
import { User, Mail, LogOut, Camera, Unlink, Globe, MailCheck } from 'lucide-react';

import { ConfirmModal } from './ConfirmModal';
import { TranslationKey } from '../i18n';
import { supabase } from '../supabaseClient';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { Modal, Button, Input, IconButton, Card, ListRow } from './ui';

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
  subscriptionStatus?: string | null;
  trialEnd?: string | null;
  nextBillingDate?: string | null;
  onPaymentSuccess?: () => void;
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
}: ManageAccountModalProps) {
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
      onClose();
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
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={t('editProfile') || 'Redigera profil'}
        size="sm"
      >
        <div className="space-y-4 pt-1">
          {/* Profile Avatar Upload */}
          <div className="text-center py-1 flex flex-col items-center justify-center">
            <label htmlFor="avatar-modal" className="relative w-16 h-16 mb-2 block cursor-pointer group">
              <div className="w-16 h-16 rounded-[16px] overflow-hidden border border-[var(--border-color)] bg-[var(--surface-color)] relative group-hover:scale-105 active:scale-95 transition-all shadow-sm">
                {avatarUrl ? (
                  <img 
                    src={avatarUrl} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[var(--accent-color)]/10 text-[var(--accent-color)] text-xl font-bold uppercase">
                    {fullName ? fullName.charAt(0).toUpperCase() : user.email?.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 backdrop-blur-[2px]">
                  <Camera size={16} className="text-white" />
                </div>
              </div>
              <input 
                id="avatar-modal"
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

          {identities.length > 0 && (
            <div className="space-y-2 pt-1">
              <span className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider px-1 block">
                {t('connectedAccounts' as any) || 'Kopplade konton'}
              </span>
              <Card padding="none" className="overflow-hidden divide-y divide-[var(--border-color)]/50">
                {identities.map((identity) => (
                  <ListRow
                    key={identity.id}
                    icon={
                      identity.provider === 'google' ? (
                        <Globe size={16} strokeWidth={1.75} className="text-[var(--accent-color)]" />
                      ) : (
                        <MailCheck size={16} strokeWidth={1.75} className="text-[var(--text-secondary)]" />
                      )
                    }
                    title={
                      identity.provider === 'email'
                        ? t('providerEmail' as any) || 'E-post'
                        : identity.provider === 'google'
                        ? t('providerGoogle' as any) || 'Google'
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
                    onClose();
                    setConfirmConfig(prev => ({ ...prev, isOpen: false }))
                  }
                });
              }}
              variant="ghost"
              fullWidth
              icon={<LogOut size={15} strokeWidth={1.75} />}
            >
              {t('signOut')}
            </Button>
          </div>
        </div>
      </Modal>

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
  );
}
