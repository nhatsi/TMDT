import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import Button from '@/components/common/Button';
import { PremiumButton } from '@/components/common';
import Input from '@/components/common/Input';
import {
  useLoginMutation,
  useResendVerificationMutation,
} from '@/services/authApi';
import { loginSuccess } from '@/features/auth/authSlice';

const LoginPage: React.FC = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {}
  );

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const [login, { isLoading, error }] = useLoginMutation();
  const [resendVerification, { isLoading: isResending }] =
    useResendVerificationMutation();

  // Get the redirect path from location state or default to home
  const from = (location.state as any)?.from?.pathname || '/';

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};
    let isValid = true;

    if (!email) {
      newErrors.email = t('auth.login.validation.emailRequired');
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = t('auth.login.validation.emailInvalid');
      isValid = false;
    }

    if (!password) {
      newErrors.password = t('auth.login.validation.passwordRequired');
      isValid = false;
    } else if (password.length < 6) {
      newErrors.password = t('auth.login.validation.passwordMinLength');
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    // Only prevent default if an event is provided
    e?.preventDefault();

    if (!validateForm()) return;

    try {
      console.log('🚀 Attempting login with:', { email, password: '***' });

      const result = await login({ email, password }).unwrap();

      console.log('✅ Login successful:', result);

      // Dispatch success to Redux store
      dispatch(loginSuccess(result));

      // Redirect to the page they were trying to access
      navigate(from, { replace: true });
    } catch (err: any) {
      console.log('❌ Login failed:', err);
      // Error is already handled by RTK Query and displayed in UI
    }
  };

  const handleResendVerification = async () => {
    if (!email) {
      setError(t('auth.login.validation.emailRequired'));
      return;
    }

    try {
      await resendVerification({ email }).unwrap();
      // Show success message
      alert(t('auth.login.verificationSent'));
    } catch (err: any) {
      console.log('❌ Resend verification failed:', err);
      setError(
        err?.data?.message ||
          err?.message ||
          t('auth.login.errors.resendFailed')
      );
    }
  };

  const handleButtonClick = (e: React.MouseEvent) => {
    // Call handleSubmit without an event to prevent default behavior conflicts
    handleSubmit();
  };

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-md mx-auto">
        <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-md p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-neutral-800 dark:text-neutral-100 mb-2">
              {t('auth.login.title')}
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400">
              {t('auth.login.subtitle')}
            </p>
          </div>

          <form>
            <div className="mb-6">
              <Input
                type="email"
                label={t('auth.login.emailLabel')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('auth.login.emailPlaceholder')}
                error={errors.email}
                required
              />
            </div>

            <div className="mb-6">
              <div className="flex justify-between items-center mb-1">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
                >
                  {t('auth.login.passwordLabel')}
                </label>
                <Link
                  to="/forgot-password"
                  className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                >
                  {t('auth.login.forgotPassword')}
                </Link>
              </div>
              <Input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('auth.login.passwordPlaceholder')}
                error={errors.password}
                required
              />
            </div>

            <div className="mb-6">
              <PremiumButton
                variant="primary"
                size="large"
                iconType="arrow-right"
                isProcessing={isLoading}
                processingText="Đang đăng nhập..."
                onClick={handleButtonClick}
                className="w-full h-12"
              >
                {t('auth.login.signInButton')}
              </PremiumButton>
            </div>
          </form>
          <div className="text-center">
            <p className="text-neutral-600 dark:text-neutral-400">
              {t('auth.login.noAccount')}{' '}
              <Link
                to="/register"
                className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
              >
                {t('auth.login.signUpLink')}
              </Link>
            </p>
          </div>
          <div className="min-h-[60px] h-full mt-4">
            {error && (
              <div className="p-4 bg-error-100 dark:bg-error-900/30 text-error-700 dark:text-error-400 rounded-lg">
                {typeof error === 'string'
                  ? error
                  : (error as any)?.data?.message ||
                    (error as any)?.message ||
                    t('auth.login.errors.invalidCredentials')}
                {(error as any)?.data?.message?.includes(
                  'Vui lòng xác thực email'
                ) && (
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={handleResendVerification}
                      disabled={isResending}
                      className="text-primary-600 dark:text-primary-400 hover:underline disabled:opacity-50"
                    >
                      {isResending
                        ? t('auth.login.resendingVerification', 'Sending...')
                        : t(
                            'auth.login.resendVerification',
                            'Resend verification email'
                          )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
