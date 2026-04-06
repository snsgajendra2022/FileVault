import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { FaArrowLeft, FaHeart, FaCreditCard, FaAmazon, FaDollarSign, FaLock, FaCheck, FaInfoCircle } from 'react-icons/fa';
import api from '../services/api';

interface PlanDetails {
  id: number;
  planName: string;
  displayName: string;
  monthlyPrice: number;
  yearlyPrice: number;
  storageQuotaGB: number;
  maxUploadsPerMonth: number;
  maxConcurrentUploads: number;
  allowedFileTypes: string[];
  encryptionEnabled: boolean;
  cloudStorageEnabled: boolean;
  compressionEnabled: boolean;
  prioritySupport: boolean;
  isPopular: boolean;
  sortOrder: number;
}

interface CheckoutFormData {
  email: string;
  paymentMethod: 'card' | 'amazon' | 'cashapp';
  saveInfo: boolean;
  // Card payment fields
  cardNumber: string;
  expiryDate: string;
  cvc: string;
  cardholderName: string;
  // Billing fields
  country: string;
  address: string;
  pin: string;
  // Business fields
  isBusiness: boolean;
}

const CheckoutPage = () => {
  const { t } = useTranslation();
  const { planId } = useParams<{ planId: string }>();
  const [plan, setPlan] = useState<PlanDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CheckoutFormData>({
    email: '',
    paymentMethod: 'card',
    saveInfo: true,
    // Card payment fields
    cardNumber: '',
    expiryDate: '',
    cvc: '',
    cardholderName: '',
    // Billing fields
    country: 'India',
    address: '',
    pin: '',
    // Business fields
    isBusiness: false
  });
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (planId) {
      fetchPlanDetails();
    }
  }, [planId]);

  useEffect(() => {
    if (user?.email) {
      setFormData(prev => ({ ...prev, email: user.email }));
    }
  }, [user]);

  const fetchPlanDetails = async () => {
    try {
      const response = await api.get(`/api/plans/${planId}`);
      setPlan(response.data);
    } catch (error) {
      console.error('Error fetching plan details:', error);
      toast.error(t('checkoutPage.toastLoadFailed'));
      navigate('/plans');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const upgradeData = {
        planId: parseInt(planId!),
        billingCycle: 'MONTHLY',
        prorate: true
      };

      await api.post('/api/plans/subscribe', upgradeData);
      toast.success(t('checkoutPage.toastUpgraded', { name: plan?.displayName ?? '' }));
      navigate('/studio/dashboard');
    } catch (error: any) {
      console.error('Upgrade failed:', error);
      toast.error(error.response?.data?.message || t('checkoutPage.toastUpgradeFailed'));
    } finally {
      setLoading(false);
    }
  };

  if (!plan) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-white/20 border-t-white"></div>
          <div className="absolute inset-0 animate-ping rounded-full h-16 w-16 border-4 border-white/10"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/plans')}
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
              >
                <FaArrowLeft className="h-4 w-4 mr-2" />
                {t('checkoutPage.backToPlans')}
              </button>
            </div>
            <div className="flex items-center">
              <FaHeart className="h-6 w-6 text-purple-500 mr-2" />
              <span className="text-xl font-bold text-gray-900">{t('checkoutPage.brand')}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Panel - Subscription Summary */}
          <div className="bg-gray-900 rounded-2xl p-8 text-white">
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2">{t('checkoutPage.subscribeTo', { name: plan.displayName })}</h1>
              <div className="text-4xl font-bold text-purple-400 mb-4">
                {t('checkoutPage.perMonth', { price: plan.monthlyPrice.toFixed(2) })}
              </div>
            </div>

            <div className="space-y-6">
              {/* Plan Details */}
              <div className="bg-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4">{plan.displayName}</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">{t('checkoutPage.monthlySubscription', { name: plan.displayName })}</span>
                    <span className="font-semibold">${plan.monthlyPrice.toFixed(2)}</span>
                  </div>
                  <div className="text-sm text-gray-400">{t('checkoutPage.billedMonthly')}</div>
                </div>
              </div>

              {/* Features */}
              <div className="bg-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4">{t('checkoutPage.planFeatures')}</h3>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <FaCheck className="h-4 w-4 text-green-400 mr-3" />
                    <span>{t('checkoutPage.storageGb', { n: plan.storageQuotaGB })}</span>
                  </div>
                  <div className="flex items-center">
                    <FaCheck className="h-4 w-4 text-green-400 mr-3" />
                    <span>{t('checkoutPage.uploadsPerMonth', { n: plan.maxUploadsPerMonth })}</span>
                  </div>
                  <div className="flex items-center">
                    <FaCheck className="h-4 w-4 text-green-400 mr-3" />
                    <span>{t('checkoutPage.concurrentUploads', { n: plan.maxConcurrentUploads })}</span>
                  </div>
                  {plan.encryptionEnabled && (
                    <div className="flex items-center">
                      <FaCheck className="h-4 w-4 text-green-400 mr-3" />
                      <span>{t('checkoutPage.e2eEncryption')}</span>
                    </div>
                  )}
                  {plan.cloudStorageEnabled && (
                    <div className="flex items-center">
                      <FaCheck className="h-4 w-4 text-green-400 mr-3" />
                      <span>{t('checkoutPage.cloudStorageIntegration')}</span>
                    </div>
                  )}
                  {plan.prioritySupport && (
                    <div className="flex items-center">
                      <FaCheck className="h-4 w-4 text-green-400 mr-3" />
                      <span>{t('checkoutPage.prioritySupport')}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Summary */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">{t('checkoutPage.subtotal')}</span>
                  <span className="font-semibold">${plan.monthlyPrice.toFixed(2)}</span>
                </div>
                
                <button type="button" className="w-full text-left text-purple-400 hover:text-purple-300 transition-colors">
                  {t('checkoutPage.addPromotionCode')}
                </button>
                
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <span className="text-gray-300 mr-2">{t('checkoutPage.tax')}</span>
                    <FaInfoCircle className="h-4 w-4 text-gray-400" />
                  </div>
                  <span className="text-gray-400">{t('checkoutPage.enterAddressToCalculate')}</span>
                </div>
                
                <div className="border-t border-gray-700 pt-4">
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>{t('checkoutPage.totalDueToday')}</span>
                    <span className="text-purple-400">${plan.monthlyPrice.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Contact & Payment */}
          <div className="bg-white rounded-2xl p-8 shadow-lg">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Contact Information */}
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('checkoutPage.contactInformation')}</h2>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    {t('checkoutPage.email')}
                  </label>
                  <input
                    type="email"
                    id="email"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    placeholder={t('checkoutPage.emailPlaceholder')}
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('checkoutPage.paymentMethod')}</h2>
                <div className="space-y-4">
                  <label className="flex items-center p-4 border border-gray-200 rounded-xl cursor-pointer hover:border-purple-300 transition-colors">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="card"
                      checked={formData.paymentMethod === 'card'}
                      onChange={(e) => setFormData({...formData, paymentMethod: e.target.value as any})}
                      className="h-4 w-4 text-purple-600 focus:ring-purple-500"
                    />
                    <div className="ml-4 flex items-center">
                      <FaCreditCard className="h-5 w-5 text-gray-600 mr-3" />
                      <span className="font-medium">{t('checkoutPage.card')}</span>
                    </div>
                    <div className="ml-auto flex space-x-2">
                      <div className="w-8 h-5 bg-blue-600 rounded"></div>
                      <div className="w-8 h-5 bg-red-600 rounded"></div>
                      <div className="w-8 h-5 bg-yellow-600 rounded"></div>
                      <div className="w-8 h-5 bg-orange-600 rounded"></div>
                    </div>
                  </label>

                  <label className="flex items-center p-4 border border-gray-200 rounded-xl cursor-pointer hover:border-purple-300 transition-colors">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="amazon"
                      checked={formData.paymentMethod === 'amazon'}
                      onChange={(e) => setFormData({...formData, paymentMethod: e.target.value as any})}
                      className="h-4 w-4 text-purple-600 focus:ring-purple-500"
                    />
                    <div className="ml-4 flex items-center">
                      <FaAmazon className="h-5 w-5 text-gray-600 mr-3" />
                      <span className="font-medium">{t('checkoutPage.amazonPay')}</span>
                    </div>
                  </label>

                  <label className="flex items-center p-4 border border-gray-200 rounded-xl cursor-pointer hover:border-purple-300 transition-colors">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="cashapp"
                      checked={formData.paymentMethod === 'cashapp'}
                      onChange={(e) => setFormData({...formData, paymentMethod: e.target.value as any})}
                      className="h-4 w-4 text-purple-600 focus:ring-purple-500"
                    />
                    <div className="ml-4 flex items-center">
                      <FaDollarSign className="h-5 w-5 text-gray-600 mr-3" />
                      <span className="font-medium">{t('checkoutPage.cashAppPay')}</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Payment Details Based on Selected Method */}
              {formData.paymentMethod === 'card' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900">{t('checkoutPage.cardInformation')}</h3>
                  
                  {/* Card Number */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('checkoutPage.cardNumber')}
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="1234 1234 1234 1234"
                        value={formData.cardNumber}
                        onChange={(e) => setFormData({...formData, cardNumber: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all pr-20"
                      />
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex space-x-1">
                        <div className="w-8 h-5 bg-blue-600 rounded"></div>
                        <div className="w-8 h-5 bg-red-600 rounded"></div>
                        <div className="w-8 h-5 bg-yellow-600 rounded"></div>
                        <div className="w-8 h-5 bg-orange-600 rounded"></div>
                      </div>
                    </div>
                  </div>

                  {/* Expiry and CVC */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('checkoutPage.expirationDate')}
                      </label>
                      <input
                        type="text"
                        placeholder="MM / YY"
                        value={formData.expiryDate}
                        onChange={(e) => setFormData({...formData, expiryDate: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('checkoutPage.cvc')}
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder={t('checkoutPage.cvcPlaceholder')}
                          value={formData.cvc}
                          onChange={(e) => setFormData({...formData, cvc: e.target.value})}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all pr-10"
                        />
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <div className="w-6 h-4 bg-gray-200 rounded text-xs flex items-center justify-center text-gray-500">123</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Cardholder Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('checkoutPage.cardholderName')}
                    </label>
                    <input
                      type="text"
                      placeholder={t('checkoutPage.fullNameOnCard')}
                      value={formData.cardholderName}
                      onChange={(e) => setFormData({...formData, cardholderName: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    />
                  </div>

                  {/* Country and PIN */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('checkoutPage.countryOrRegion')}
                      </label>
                      <select
                        value={formData.country}
                        onChange={(e) => setFormData({...formData, country: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                      >
                        <option value="India">{t('checkoutPage.countryIndia')}</option>
                        <option value="United States">{t('checkoutPage.countryUnitedStates')}</option>
                        <option value="United Kingdom">{t('checkoutPage.countryUnitedKingdom')}</option>
                        <option value="Canada">{t('checkoutPage.countryCanada')}</option>
                        <option value="Australia">{t('checkoutPage.countryAustralia')}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('checkoutPage.pin')}
                      </label>
                      <input
                        type="text"
                        placeholder={t('checkoutPage.pinPlaceholder')}
                        value={formData.pin}
                        onChange={(e) => setFormData({...formData, pin: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>
                </div>
              )}

              {formData.paymentMethod === 'amazon' && (
                <div className="space-y-6">
                  <div className="flex items-center mb-4">
                    <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center mr-3">
                      <span className="text-white text-sm font-bold">pay</span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">{t('checkoutPage.amazonPayHeading')}</h3>
                  </div>
                  
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('checkoutPage.name')}
                    </label>
                    <input
                      type="text"
                      placeholder={t('checkoutPage.fullName')}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    />
                  </div>

                  {/* Billing Address */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('checkoutPage.billingAddress')}
                    </label>
                    <select
                      value={formData.country}
                      onChange={(e) => setFormData({...formData, country: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all mb-3"
                    >
                      <option value="India">{t('checkoutPage.countryIndia')}</option>
                      <option value="United States">{t('checkoutPage.countryUnitedStates')}</option>
                      <option value="United Kingdom">{t('checkoutPage.countryUnitedKingdom')}</option>
                      <option value="Canada">{t('checkoutPage.countryCanada')}</option>
                      <option value="Australia">{t('checkoutPage.countryAustralia')}</option>
                    </select>
                    <input
                      type="text"
                      placeholder={t('checkoutPage.addressPlaceholder')}
                      value={formData.address}
                      onChange={(e) => setFormData({...formData, address: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    />
                    <button type="button" className="text-sm text-purple-600 hover:text-purple-500 mt-2">
                      {t('checkoutPage.enterAddressManually')}
                    </button>
                  </div>

                  <div className="flex items-center text-sm text-gray-600">
                    <div className="w-5 h-5 bg-gray-300 rounded mr-2"></div>
                    {t('checkoutPage.amazonRedirectNote')}
                  </div>
                </div>
              )}

              {formData.paymentMethod === 'cashapp' && (
                <div className="space-y-6">
                  <div className="flex items-center mb-4">
                    <div className="w-8 h-8 bg-black rounded-full mr-2"></div>
                    <div className="w-8 h-8 bg-green-500 rounded flex items-center justify-center mr-3">
                      <span className="text-white font-bold">$</span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">{t('checkoutPage.cashAppHeading')}</h3>
                  </div>
                  
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('checkoutPage.name')}
                    </label>
                    <input
                      type="text"
                      placeholder={t('checkoutPage.fullName')}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    />
                  </div>

                  {/* Billing Address */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('checkoutPage.billingAddress')}
                    </label>
                    <div className="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-xl mb-3">
                      {t('checkoutPage.unitedStatesStatic')}
                    </div>
                    <input
                      type="text"
                      placeholder={t('checkoutPage.addressPlaceholder')}
                      value={formData.address}
                      onChange={(e) => setFormData({...formData, address: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    />
                    <button type="button" className="text-sm text-gray-600 hover:text-gray-500 mt-2">
                      {t('checkoutPage.enterAddressManually')}
                    </button>
                  </div>

                  <div className="flex items-center text-sm text-gray-600">
                    <div className="w-5 h-5 bg-gray-300 rounded mr-2"></div>
                    {t('checkoutPage.cashAppQrNote')}
                  </div>
                </div>
              )}

              {/* Business Checkbox */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isBusiness"
                  checked={formData.isBusiness}
                  onChange={(e) => setFormData({...formData, isBusiness: e.target.checked})}
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                />
                <label htmlFor="isBusiness" className="ml-2 block text-sm text-gray-700">
                  {t('checkoutPage.purchasingAsBusiness')}
                </label>
              </div>

              {/* Save Info Checkbox */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="saveInfo"
                  checked={formData.saveInfo}
                  onChange={(e) => setFormData({...formData, saveInfo: e.target.checked})}
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                />
                <label htmlFor="saveInfo" className="ml-2 block text-sm text-gray-700">
                  {t('checkoutPage.saveInfoCheckout')}
                </label>
              </div>

              {/* Security Notice */}
              <div className="text-sm text-gray-600 text-center">
                {t('checkoutPage.paySecurelyPrefix')}{' '}
                <button type="button" className="text-purple-600 hover:text-purple-500 font-medium">
                  {t('checkoutPage.link')}
                </button>
              </div>

              {/* Subscribe Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-purple-600 text-white py-4 px-6 rounded-xl font-semibold text-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
                    {t('checkoutPage.processing')}
                  </div>
                ) : (
                  t('checkoutPage.subscribe')
                )}
              </button>

              {/* Disclaimer */}
              <div className="text-xs text-gray-500 text-center">
                {t('checkoutPage.subscribeDisclaimer')}
              </div>

              {/* Footer */}
              <div className="text-center text-xs text-gray-400">
                <div className="flex items-center justify-center mb-2">
                  <FaLock className="h-3 w-3 mr-1" />
                  {t('checkoutPage.poweredBySecure')}
                </div>
                <div className="flex justify-center space-x-4">
                  <button type="button" className="text-gray-400 hover:text-gray-600 transition-colors">
                    {t('checkoutPage.terms')}
                  </button>
                  {/* <Link to="/privacy-policy" className="text-gray-400 hover:text-gray-600 transition-colors">
                    Privacy
                  </Link> */}
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
