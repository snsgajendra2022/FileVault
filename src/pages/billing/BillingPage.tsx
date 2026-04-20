import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaCreditCard, FaShieldAlt, FaCheck, FaPlus, FaEdit, FaTimes } from 'react-icons/fa';

const BillingPage = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('overview');

  const billingHistory = [
    { id: 1, date: '2024-01-15', amount: 29.99, statusKey: 'billingPage.statusPaid' as const, invoice: 'INV-2024-001' },
    { id: 2, date: '2023-12-15', amount: 29.99, statusKey: 'billingPage.statusPaid' as const, invoice: 'INV-2023-012' },
    { id: 3, date: '2023-11-15', amount: 29.99, statusKey: 'billingPage.statusPaid' as const, invoice: 'INV-2023-011' },
  ];

  const paymentMethods = [
    { id: 1, type: 'card', last4: '4242', brand: 'Visa', expiry: '12/25', isDefault: true },
    { id: 2, type: 'card', last4: '5555', brand: 'Mastercard', expiry: '08/26', isDefault: false },
  ];

  return (
    <div className="space-y-8">
      <div className="text-center mb-10">
        <h1 className="text-5xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
          {t('billingPage.title')}
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
          {t('billingPage.subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
        <div className="bg-gradient-to-br from-white via-blue-50/30 to-purple-50/30 rounded-2xl p-8 border border-blue-100/50 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium mb-2">{t('billingPage.currentBalance')}</p>
              <p className="text-3xl font-bold text-gray-800">$0.00</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
              <FaCheck className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-white via-green-50/30 to-emerald-50/30 rounded-2xl p-8 border border-green-100/50 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium mb-2">{t('billingPage.nextPayment')}</p>
              <p className="text-3xl font-bold text-gray-800">$29.99</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <FaCreditCard className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-white via-yellow-50/30 to-orange-50/30 rounded-2xl p-8 border border-yellow-100/50 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium mb-2">{t('billingPage.paymentMethods')}</p>
              <p className="text-3xl font-bold text-gray-800">2</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
              <FaShieldAlt className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-white via-purple-50/30 to-pink-50/30 rounded-2xl p-8 border border-purple-100/50 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium mb-2">{t('billingPage.totalSpent')}</p>
              <p className="text-3xl font-bold text-gray-800">$89.97</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
              <FaCreditCard className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-center mb-8">
        <div className="bg-gradient-to-r from-gray-100 to-gray-200 rounded-2xl p-2 shadow-lg">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-8 py-4 rounded-xl text-base font-semibold transition-all duration-300 ${
              activeTab === 'overview'
                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg transform scale-105'
                : 'text-gray-600 hover:text-gray-800 hover:bg-white/50'
            }`}
          >
            {t('billingPage.tabOverview')}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('payment-methods')}
            className={`px-8 py-4 rounded-xl text-base font-semibold transition-all duration-300 ${
              activeTab === 'payment-methods'
                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg transform scale-105'
                : 'text-gray-600 hover:text-gray-800 hover:bg-white/50'
            }`}
          >
            {t('billingPage.tabPaymentMethods')}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-8 py-4 rounded-xl text-base font-semibold transition-all duration-300 ${
              activeTab === 'history'
                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg transform scale-105'
                : 'text-gray-600 hover:text-gray-800 hover:bg-white/50'
            }`}
          >
            {t('billingPage.tabHistory')}
          </button>
        </div>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-8">
          <div className="bg-gradient-to-br from-white via-blue-50/30 to-purple-50/30 rounded-3xl shadow-2xl border border-blue-100/50 p-8">
            <div className="flex items-center space-x-6 mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <FaCreditCard className="h-8 w-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">{t('billingPage.currentPlan')}</h2>
                <p className="text-lg text-gray-600">{t('billingPage.planSubtitle')}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-blue-100/50">
                <p className="text-sm text-gray-500 mb-2">{t('billingPage.nextPayment')}</p>
                <p className="text-2xl font-bold text-gray-800">$29.99</p>
                <p className="text-sm text-gray-600">{t('billingPage.dueOn', { date: 'Feb 15, 2024' })}</p>
              </div>
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-blue-100/50">
                <p className="text-sm text-gray-500 mb-2">{t('billingPage.billingCycle')}</p>
                <p className="text-2xl font-bold text-gray-800">{t('billingPage.monthly')}</p>
                <p className="text-sm text-gray-600">{t('billingPage.autoRenewal')}</p>
              </div>
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-blue-100/50">
                <p className="text-sm text-gray-500 mb-2">{t('billingPage.paymentMethod')}</p>
                <p className="text-2xl font-bold text-gray-800">{t('billingPage.visaMasked', { last4: '4242' })}</p>
                <p className="text-sm text-gray-600">{t('billingPage.defaultPaymentMethod')}</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-white via-green-50/30 to-emerald-50/30 rounded-3xl shadow-2xl border border-green-100/50 p-8">
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                <FaCheck className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800">{t('billingPage.recentTransactions')}</h2>
            </div>

            <div className="space-y-4">
              {billingHistory.slice(0, 3).map((transaction) => (
                <div key={transaction.id} className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-green-100/50 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                      <FaCheck className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">{t('billingPage.descProMonthly')}</p>
                      <p className="text-sm text-gray-600">{transaction.date} • {transaction.invoice}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-800">${transaction.amount}</p>
                    <p className="text-sm text-green-600 font-medium">{t(transaction.statusKey)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'payment-methods' && (
        <div className="space-y-8">
          <div className="bg-gradient-to-br from-white via-blue-50/30 to-purple-50/30 rounded-3xl shadow-2xl border border-blue-100/50 p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <FaCreditCard className="h-6 w-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800">{t('billingPage.paymentMethodsSection')}</h2>
              </div>
              <button type="button" className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 shadow-lg transform hover:scale-105 flex items-center space-x-2">
                <FaPlus className="h-4 w-4" />
                <span>{t('billingPage.addPaymentMethod')}</span>
              </button>
            </div>

            <div className="space-y-6">
              {paymentMethods.map((method) => (
                <div key={method.id} className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-blue-100/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                        <FaCreditCard className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">{method.brand} •••• {method.last4}</p>
                        <p className="text-sm text-gray-600">{t('billingPage.expires', { expiry: method.expiry })}</p>
                        {method.isDefault && (
                          <span className="inline-block bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xs px-2 py-1 rounded-full mt-1">
                            {t('billingPage.defaultBadge')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-3">
                      <button type="button" className="bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium hover:from-gray-200 hover:to-gray-300 transition-all duration-300 shadow-md transform hover:scale-105">
                        <FaEdit className="h-4 w-4" />
                      </button>
                      <button type="button" className="bg-gradient-to-r from-red-100 to-pink-100 text-red-600 px-4 py-2 rounded-lg font-medium hover:from-red-200 hover:to-pink-200 transition-all duration-300 shadow-md transform hover:scale-105">
                        <FaTimes className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-gradient-to-br from-white via-purple-50/30 to-pink-50/30 rounded-3xl shadow-2xl border border-purple-100/50 p-8">
          <div className="flex items-center space-x-4 mb-8">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg">
              <FaCreditCard className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">{t('billingPage.billingHistorySection')}</h2>
          </div>

          <div className="space-y-4">
            {billingHistory.map((transaction) => (
              <div key={transaction.id} className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-purple-100/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                      <FaCreditCard className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">{t('billingPage.descProMonthly')}</p>
                      <p className="text-sm text-gray-600">{transaction.date} • {transaction.invoice}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="font-bold text-gray-800">${transaction.amount}</p>
                      <p className="text-sm text-green-600 font-medium">{t(transaction.statusKey)}</p>
                    </div>
                    <button type="button" className="bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-600 px-4 py-2 rounded-lg font-medium hover:from-indigo-200 hover:to-purple-200 transition-all duration-300 shadow-md transform hover:scale-105">
                      <FaCheck className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BillingPage;
