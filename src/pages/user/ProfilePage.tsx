import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FaUser, FaEnvelope, FaPhone, FaLock, FaSave } from 'react-icons/fa';
import api from '../../api/client/axiosInstance';
import './ProfilePage.css';

interface ProfileData {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  accountType: string;
  status: string;
  createdAt: string;
  lastLoginAt: string;
  updatedAt: string;
  company: string | null;
  role: string | null;
  department: string | null;
  storageQuotaMB: number;
  allowedFileTypes: string;
  maxFileSizeMB: number;
  twoFactorEnabled: boolean;
  failedLoginAttempts: number;
}

const ProfilePage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });

  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const response = await api.get('/api/auth/profile');
      return response.data as ProfileData;
    },
  });

  useEffect(() => {
    if (profileData) {
      setFormData({
        firstName: profileData.firstName || '',
        lastName: profileData.lastName || '',
        email: profileData.email || '',
        phone: profileData.phone || '',
      });
    }
  }, [profileData]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: Partial<ProfileData>) => {
      const response = await api.put('/api/auth/profile', data);
      return response.data;
    },
    onSuccess: () => {
      toast.success(t('profile.updated'));
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
    onError: () => {
      toast.error(t('profile.updateFailed'));
    },
  });

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    updateProfileMutation.mutate(formData);
  };

  const handleCancel = () => {
    if (!profileData) return;
    setFormData({
      firstName: profileData.firstName || '',
      lastName: profileData.lastName || '',
      email: profileData.email || '',
      phone: profileData.phone || '',
    });
  };

  if (profileLoading) {
    return (
      <div className="profile-page" aria-busy="true" aria-label="Loading profile">
        <div className="profile-page__skel-title" />
        <div className="profile-page__skel-sub" />
        <div className="profile-page__skel-card" />
      </div>
    );
  }

  return (
    <div className="profile-page">
      <header className="profile-page__header">
        <div>
          <p className="profile-page__eyebrow">Account</p>
          <h1 className="profile-page__title">{t('profile.title')}</h1>
          <p className="profile-page__subtitle">{t('profile.subtitle')}</p>
        </div>
        <button
          type="button"
          className="profile-page__btn profile-page__btn--danger"
          onClick={() => navigate('/change-password')}
        >
          <FaLock aria-hidden />
          <span>{t('profile.changePassword')}</span>
        </button>
      </header>

      <section className="profile-page__card" aria-labelledby="personal-info-heading">
        <div className="profile-page__card-head">
          <div className="profile-page__card-icon" aria-hidden>
            <FaUser />
          </div>
          <div>
            <h2 id="personal-info-heading" className="profile-page__card-title">
              {t('profile.personalInfo')}
            </h2>
            <p className="profile-page__card-desc">
              Update your name, email, and phone number.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="profile-page__grid">
            <div className="profile-page__field">
              <label className="profile-page__label" htmlFor="profile-first-name">
                {t('profile.firstName')}
              </label>
              <input
                id="profile-first-name"
                type="text"
                className="profile-page__input"
                autoComplete="given-name"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              />
            </div>

            <div className="profile-page__field">
              <label className="profile-page__label" htmlFor="profile-last-name">
                {t('profile.lastName')}
              </label>
              <input
                id="profile-last-name"
                type="text"
                className="profile-page__input"
                autoComplete="family-name"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              />
            </div>

            <div className="profile-page__field">
              <label className="profile-page__label" htmlFor="profile-email">
                <FaEnvelope aria-hidden />
                {t('profile.email')}
              </label>
              <input
                id="profile-email"
                type="email"
                className="profile-page__input"
                autoComplete="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="profile-page__field">
              <label className="profile-page__label" htmlFor="profile-phone">
                <FaPhone aria-hidden />
                {t('profile.phone')}
              </label>
              <input
                id="profile-phone"
                type="tel"
                className="profile-page__input"
                autoComplete="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>

          {(profileData?.username || profileData?.accountType || profileData?.status) && (
            <div className="profile-page__meta" aria-label="Account details">
              {profileData.username ? (
                <div className="profile-page__meta-item">
                  <p className="profile-page__meta-label">Username</p>
                  <p className="profile-page__meta-value">{profileData.username}</p>
                </div>
              ) : null}
              {profileData.accountType ? (
                <div className="profile-page__meta-item">
                  <p className="profile-page__meta-label">Account type</p>
                  <p className="profile-page__meta-value">{profileData.accountType}</p>
                </div>
              ) : null}
              {profileData.status ? (
                <div className="profile-page__meta-item">
                  <p className="profile-page__meta-label">Status</p>
                  <p className="profile-page__meta-value">{profileData.status}</p>
                </div>
              ) : null}
            </div>
          )}

          <div className="profile-page__actions">
            <button
              type="button"
              className="profile-page__btn profile-page__btn--ghost"
              onClick={handleCancel}
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="profile-page__btn profile-page__btn--primary"
              disabled={updateProfileMutation.isPending}
            >
              <FaSave aria-hidden />
              <span>
                {updateProfileMutation.isPending
                  ? t('common.saving')
                  : t('profile.saveChanges')}
              </span>
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};

export default ProfilePage;
