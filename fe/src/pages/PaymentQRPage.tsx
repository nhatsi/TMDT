import PremiumButton from '@/components/common/PremiumButton';
import BankTransferQR from '@/components/payment/BankTransferQR';
import {
  useGetOrderByIdQuery,
  useCancelOrderMutation,
} from '@/services/orderApi';
import { RootState } from '@/store';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { addNotification } from '@/features/ui/uiSlice';
import { useDispatch } from 'react-redux';

const PaymentQRPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  const dispatch = useDispatch();
  const orderId = searchParams.get('orderId');
  const numberOrder = searchParams.get('numberOrder');
  const amountParam = searchParams.get('amount');

  const [amount, setAmount] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(15 * 60); // 15 minutes in seconds
  const [isExpired, setIsExpired] = useState<boolean>(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(3); // Countdown for redirect

  // Mutation for cancelling order
  const [cancelOrder, { isLoading: isCancelling }] = useCancelOrderMutation();

  // Poll order status every 5 seconds
  const {
    data: orderData,
    isLoading: isOrderLoading,
    isError,
    refetch,
  } = useGetOrderByIdQuery(orderId || '', {
    pollingInterval: 5000, // 5 seconds
    refetchOnFocus: false,
    refetchOnReconnect: false,
    skip: !orderId,
  });

  useEffect(() => {
    if (amountParam) {
      setAmount(parseFloat(amountParam));
    }
  }, [amountParam]);

  // Check order status and show success message if paid
  useEffect(() => {
    if (orderData?.data) {
      const order = orderData.data;

      // If payment status is 'paid', show success modal and redirect to orders page
      if (order.paymentStatus === 'paid') {
        setShowSuccessMessage(true);
        // Start countdown from 3 seconds
        let currentCount = 3;
        setCountdown(currentCount);
        
        const countdownInterval = setInterval(() => {
          currentCount--;
          setCountdown(currentCount);
          
          if (currentCount <= 0) {
            clearInterval(countdownInterval);
            navigate('/orders');
          }
        }, 1000);
        
        // Cleanup interval on unmount or when orderData changes
        return () => clearInterval(countdownInterval);
      }

      // If order is cancelled, redirect to orders page with notification
      if (order.status === 'cancelled') {
        dispatch(
          addNotification({
            type: 'warning',
            message: 'Đơn hàng đã bị hủy. Không thể thanh toán lại.',
            duration: 3000,
          })
        );
        navigate('/orders');
      }
    }
  }, [orderData, navigate, dispatch]);

  // Timer effect for payment expiration
  useEffect(() => {
    if (isExpired || timeLeft <= 0) {
      setIsExpired(true);
      // Only cancel order if it's not already cancelled and timer expires
      if (orderId && !isCancelling && orderData?.data?.status !== 'cancelled') {
        cancelOrder(orderId)
          .unwrap()
          .then(() => {
            console.log('Order cancelled due to payment timeout');
            // Redirect to cart after cancellation
            setTimeout(() => {
              navigate('/cart');
            }, 1500);
          })
          .catch((error) => {
            console.error('Failed to cancel order:', error);
            // Still redirect even if cancellation fails
            setTimeout(() => {
              navigate('/cart');
            }, 1500);
          });
      }
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsExpired(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isExpired, timeLeft, orderId, cancelOrder, isCancelling, navigate]);

  // Format time for display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle back to cart
  const handleBackToCart = () => {
    if (isAuthenticated) {
      navigate('/orders');
    } else {
      navigate('/cart');
    }
  };

  // Define icons as React components
  const CheckCircleIcon = ({ className }: { className: string }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );

  const ClockIcon = ({ className }: { className: string }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );

  const QrCodeIcon = ({ className }: { className: string }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
      />
    </svg>
  );

  if (!orderId || !amountParam) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-900 dark:to-neutral-800">
        <div className="text-center p-8 bg-white dark:bg-neutral-800 rounded-2xl shadow-lg max-w-md w-full mx-4">
          <div className="w-16 h-16 bg-error-100 dark:bg-error-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8 text-error-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-neutral-800 dark:text-neutral-100 mb-2">
            Liên kết không hợp lệ
          </h2>
          <p className="text-neutral-600 dark:text-neutral-400 mb-6">
            Không tìm thấy thông tin đơn hàng. Vui lòng kiểm tra lại liên kết.
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
          >
            Trở về trang chủ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br  from-neutral-50 to-neutral-100 dark:from-neutral-900 dark:to-neutral-800 py-8">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-neutral-800 dark:text-neutral-100 mb-2">
            Thanh Toán Qua QR
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            Quét mã QR để hoàn tất thanh toán
          </p>
        </div>

        <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-xl p-6 md:p-8 mb-8">
          {/* Success Modal - Shown when payment is detected */}
          {showSuccessMessage && (
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
              onClick={() => countdown <= 0 && navigate('/orders')} // Allow clicking background to navigate if countdown finished
            >
              <div 
                className="bg-white dark:bg-neutral-800 rounded-xl shadow-xl max-w-md w-full p-6 transform transition-all"
                onClick={(e) => e.stopPropagation()} // Prevent click from propagating to background
              >
                <div className="text-center">
                  <div className="w-16 h-16 bg-success-100 dark:bg-success-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg
                      className="h-8 w-8 text-success-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-neutral-800 dark:text-neutral-100 mb-2">
                    Thanh toán thành công!
                  </h3>
                  <p className="text-neutral-600 dark:text-neutral-400 mb-6">
                    Đơn hàng của bạn đã được thanh toán thành công.
                  </p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-500 mb-6">
                    Đang chuyển hướng đến trang đơn hàng trong <span id="countdown">{countdown}</span> giây...
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Order Info */}
          <div className="flex items-center justify-between mb-6 pb-6 border-b border-neutral-200 dark:border-neutral-700">
            <div>
              <h3 className="font-semibold text-neutral-800 dark:text-neutral-100">
                ID đơn hàng
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 text-sm">
                {orderId}
              </p>
            </div>
            <div className="text-right">
              <h3 className="font-semibold text-neutral-800 dark:text-neutral-100">
                Tổng cộng
              </h3>
              <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                {new Intl.NumberFormat('vi-VN', {
                  style: 'currency',
                  currency: 'VND',
                }).format(amount)}
              </p>
            </div>
          </div>

          {/* Timer */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center bg-warning-50 dark:bg-warning-900/20 rounded-full px-4 py-2">
              <ClockIcon className="h-5 w-5 text-warning-500 mr-2" />
              <span
                className={`font-medium ${
                  isExpired
                    ? 'text-error-500'
                    : 'text-warning-600 dark:text-warning-400'
                }`}
              >
                {isExpired
                  ? 'Đã hết thời gian thanh toán'
                  : `Thời gian còn lại: ${formatTime(timeLeft)}`}
              </span>
            </div>
          </div>

          {/* QR Code Section */}
          <div className="text-center mb-8">
            <div className="inline-block p-4 bg-white rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm mb-4">
              <QrCodeIcon className="h-10 w-10 text-neutral-400 mx-auto mb-2" />
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
                Quét mã QR bằng ứng dụng ngân hàng của bạn
              </p>
              {orderId && (
                <BankTransferQR
                  amount={amount}
                  orderId={orderId}
                  numberOrder={numberOrder!}
                />
              )}
            </div>
          </div>

          {/* Payment Instructions */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 mb-6">
            <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2 flex items-center">
              <CheckCircleIcon className="h-5 w-5 mr-2" />
              Hướng dẫn thanh toán:
            </h4>
            <ol className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-decimal list-inside">
              <li>Mở ứng dụng ngân hàng trên điện thoại</li>
              <li>Chọn chức năng quét mã QR</li>
              <li>Quét mã QR trên màn hình</li>
              <li>Xác nhận thông tin và hoàn tất thanh toán</li>
            </ol>
          </div>

          {/* Action Buttons */}
          {!(orderData?.data?.status === 'cancelled') && (
            <div className="flex flex-col sm:flex-row gap-4">
              <PremiumButton
                variant="danger"
                size="large"
                className="flex-1"
                isProcessing={isCancelling}
                processingText="Đang hủy..."
                onClick={async () => {
                  if (orderId) {
                    try {
                      await cancelOrder(orderId).unwrap();
                      dispatch(
                        addNotification({
                          type: 'success',
                          message: 'Đơn hàng đã được hủy thành công',
                          duration: 3000,
                        })
                      );
                      navigate('/orders');
                    } catch (error) {
                      dispatch(
                        addNotification({
                          type: 'error',
                          message: 'Hủy đơn hàng thất bại',
                          duration: 3000,
                        })
                      );
                    }
                  }
                }}
              >
                {isCancelling ? 'Đang hủy...' : 'Hủy đơn hàng'}
              </PremiumButton>
            </div>
          )}
        </div>

        {/* Security Notice */}
        <div className="text-center text-sm text-neutral-500 dark:text-neutral-400">
          <p>Giao dịch này được bảo mật hoàn toàn</p>
          <p className="mt-1">Mọi thông tin thanh toán đều được mã hóa</p>
        </div>
      </div>
    </div>
  );
};

export default PaymentQRPage;
