import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Input from '@/components/common/Input';
import { PremiumButton } from '@/components/common';
import { useRegisterSellerMutation } from '@/services/authApi';

const SellerRegisterPage: React.FC = () => {
  const navigate = useNavigate();

  const [registerSeller, { isLoading }] = useRegisterSellerMutation();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    shopName: '',
    shopPhone: '',
    shopAddress: '',
    shopDescription: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: '',
    }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Vui lòng nhập họ tên';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Vui lòng nhập email';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email không hợp lệ';
    }

    if (!formData.password) {
      newErrors.password = 'Vui lòng nhập mật khẩu';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Mật khẩu phải có ít nhất 6 ký tự';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Vui lòng xác nhận mật khẩu';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Mật khẩu xác nhận không khớp';
    }

    if (!formData.shopName.trim()) {
      newErrors.shopName = 'Vui lòng nhập tên shop';
    }

    if (!formData.shopPhone.trim()) {
      newErrors.shopPhone = 'Vui lòng nhập số điện thoại shop';
    }

    if (!formData.shopAddress.trim()) {
      newErrors.shopAddress = 'Vui lòng nhập địa chỉ shop';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      await registerSeller({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        shopName: formData.shopName,
        shopPhone: formData.shopPhone,
        shopAddress: formData.shopAddress,
        shopDescription: formData.shopDescription,
      }).unwrap();

      toast.success(
        'Đăng ký Seller thành công. Vui lòng chờ admin duyệt tài khoản.'
      );

      navigate('/login');
    } catch (err: any) {
      console.log('❌ Register seller failed:', err);

      toast.error(
        err?.data?.message ||
          err?.message ||
          'Đăng ký Seller thất bại, vui lòng thử lại'
      );
    }
  };

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-md p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-neutral-800 dark:text-neutral-100 mb-2">
              Đăng Ký Seller
            </h1>

            <p className="text-neutral-600 dark:text-neutral-400">
              Tạo tài khoản bán hàng trên ShopMini
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100 mb-4">
              Thông tin tài khoản
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <Input
                name="name"
                label="Họ tên"
                value={formData.name}
                onChange={handleChange}
                placeholder="Nhập họ tên"
                error={errors.name}
                required
              />

              <Input
                name="email"
                type="email"
                label="Email"
                value={formData.email}
                onChange={handleChange}
                placeholder="your.email@example.com"
                error={errors.email}
                required
              />

              <Input
                name="password"
                type="password"
                label="Mật khẩu"
                value={formData.password}
                onChange={handleChange}
                placeholder="Nhập mật khẩu"
                error={errors.password}
                required
              />

              <Input
                name="confirmPassword"
                type="password"
                label="Xác nhận mật khẩu"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Nhập lại mật khẩu"
                error={errors.confirmPassword}
                required
              />
            </div>

            <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100 mb-4">
              Thông tin shop
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <Input
                name="shopName"
                label="Tên shop"
                value={formData.shopName}
                onChange={handleChange}
                placeholder="Nhập tên shop"
                error={errors.shopName}
                required
              />

              <Input
                name="shopPhone"
                label="Số điện thoại shop"
                value={formData.shopPhone}
                onChange={handleChange}
                placeholder="Nhập số điện thoại"
                error={errors.shopPhone}
                required
              />

              <div className="md:col-span-2">
                <Input
                  name="shopAddress"
                  label="Địa chỉ shop"
                  value={formData.shopAddress}
                  onChange={handleChange}
                  placeholder="Nhập địa chỉ shop"
                  error={errors.shopAddress}
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Mô tả shop
                </label>

                <textarea
                  name="shopDescription"
                  value={formData.shopDescription}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Nhập mô tả ngắn về shop"
                  className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-4 py-3 text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <button
  type="submit"
  disabled={isLoading}
  className="w-full h-12 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold shadow-lg hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
>
  {isLoading ? 'Đang gửi yêu cầu...' : '→ Gửi yêu cầu đăng ký Seller'}
</button>
          </form>

          <div className="text-center mt-6">
            <p className="text-neutral-600 dark:text-neutral-400">
              Đã có tài khoản?{' '}
              <Link
                to="/login"
                className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
              >
                Đăng nhập
              </Link>
            </p>
          </div>

          <div className="mt-6 p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 text-sm">
            Sau khi gửi yêu cầu, tài khoản seller cần được admin duyệt trước khi
            được phép đăng sản phẩm và bán hàng trên hệ thống.
          </div>
        </div>
      </div>
    </div>
  );
};

export default SellerRegisterPage;