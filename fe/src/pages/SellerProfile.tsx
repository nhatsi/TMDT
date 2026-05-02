import { useEffect, useState } from 'react';

type ShopProfile = {
  shop_name: string;
  shop_description: string;
  shop_avatar: string;
  shop_banner: string;
  shop_phone: string;
  shop_address: string;
};

const SellerProfile = () => {
  const [form, setForm] = useState<ShopProfile>({
    shop_name: '',
    shop_description: '',
    shop_avatar: '',
    shop_banner: '',
    shop_phone: '',
    shop_address: '',
  });

  const token = localStorage.getItem('token');

  const loadProfile = async () => {
    try {
      const res = await fetch('http://localhost:8888/api/users/seller/shop-profile', {
        headers: {
          Authorization: 'Bearer ' + token,
        },
      });

      const data = await res.json();
      console.log('SHOP PROFILE:', data);

      if (!res.ok) {
        alert(data.message || 'Không tải được hồ sơ shop');
        return;
      }

      setForm({
        shop_name: data.data?.shop_name || '',
        shop_description: data.data?.shop_description || '',
        shop_avatar: data.data?.shop_avatar || '',
        shop_banner: data.data?.shop_banner || '',
        shop_phone: data.data?.shop_phone || '',
        shop_address: data.data?.shop_address || '',
      });
    } catch (error) {
      console.error(error);
      alert('Có lỗi xảy ra khi tải hồ sơ shop');
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const saveProfile = async () => {
    try {
      const res = await fetch('http://localhost:8888/api/users/seller/shop-profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token,
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || 'Cập nhật thất bại');
        return;
      }

      alert('Cập nhật hồ sơ shop thành công');
      loadProfile();
    } catch (error) {
      console.error(error);
      alert('Có lỗi xảy ra khi cập nhật hồ sơ shop');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f6f6f6', padding: '24px' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <div
          style={{
            background: '#fff',
            border: '1px solid #eee',
            padding: '20px 24px',
            marginBottom: '20px',
          }}
        >
          <div
            style={{
              fontSize: '13px',
              color: '#ee4d2d',
              fontWeight: 700,
              marginBottom: '6px',
            }}
          >
            SELLER CENTER
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: '32px',
              fontWeight: 800,
              color: '#222',
            }}
          >
            Hồ sơ shop
          </h1>

          <p style={{ margin: '8px 0 0', color: '#666' }}>
            Cập nhật thông tin hiển thị cho gian hàng của bạn
          </p>
        </div>

        <div
          style={{
            background: '#fff',
            border: '1px solid #eee',
            padding: '24px',
            display: 'grid',
            gap: '16px',
          }}
        >
          <div>
            <label style={labelStyle}>Tên shop</label>
            <input
              name="shop_name"
              value={form.shop_name}
              onChange={handleChange}
              style={inputStyle}
              placeholder="Ví dụ: Shop Công Nghệ Minh Anh"
            />
          </div>

          <div>
            <label style={labelStyle}>Mô tả shop</label>
            <textarea
              name="shop_description"
              value={form.shop_description}
              onChange={handleChange}
              style={{ ...inputStyle, minHeight: '120px', resize: 'vertical' }}
              placeholder="Mô tả ngắn về shop của bạn"
            />
          </div>

          <div>
            <label style={labelStyle}>Link avatar shop</label>
            <input
              name="shop_avatar"
              value={form.shop_avatar}
              onChange={handleChange}
              style={inputStyle}
              placeholder="https://..."
            />
          </div>

          <div>
            <label style={labelStyle}>Link banner shop</label>
            <input
              name="shop_banner"
              value={form.shop_banner}
              onChange={handleChange}
              style={inputStyle}
              placeholder="https://..."
            />
          </div>

          <div>
            <label style={labelStyle}>Số điện thoại shop</label>
            <input
              name="shop_phone"
              value={form.shop_phone}
              onChange={handleChange}
              style={inputStyle}
              placeholder="0123456789"
            />
          </div>

          <div>
            <label style={labelStyle}>Địa chỉ shop</label>
            <input
              name="shop_address"
              value={form.shop_address}
              onChange={handleChange}
              style={inputStyle}
              placeholder="Địa chỉ hiển thị của shop"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={saveProfile} style={buttonStyle}>
              Lưu hồ sơ shop
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '8px',
  fontWeight: 600,
  color: '#333',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  border: '1px solid #ddd',
  borderRadius: '8px',
  fontSize: '14px',
  outline: 'none',
  boxSizing: 'border-box',
};

const buttonStyle: React.CSSProperties = {
  background: '#14b8a6',
  color: '#fff',
  border: 'none',
  padding: '12px 18px',
  borderRadius: '10px',
  fontWeight: 700,
  cursor: 'pointer',
};

export default SellerProfile;