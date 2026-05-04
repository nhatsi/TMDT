import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const SellerCreateProduct = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    shortDescription: '',
    price: '',
    comparePrice: '',
    stockQuantity: '',
    image: '',
  });

  const token = localStorage.getItem('token');

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

      const payload = {
        name: form.name,
        description: form.description,
        shortDescription: form.shortDescription,
        price: Number(form.price),
        comparePrice: form.comparePrice ? Number(form.comparePrice) : 0,
        stockQuantity: form.stockQuantity ? Number(form.stockQuantity) : 0,
        images: form.image ? [form.image] : [],
      };

      console.log('CREATE PRODUCT PAYLOAD:', payload);

      const res = await fetch('http://localhost:8888/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      console.log('CREATE PRODUCT RESPONSE:', data);

      if (!res.ok) {
        alert(data.message || 'Tạo sản phẩm thất bại');
        return;
      }

      alert('Tạo sản phẩm thành công');
      navigate('/seller/products');
    } catch (error) {
      console.error('CREATE PRODUCT ERROR:', error);
      alert('Có lỗi xảy ra khi tạo sản phẩm');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '20px' }}>
        <div
          style={{
            fontSize: '13px',
            color: '#19b4a4',
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
            color: '#1f2937',
          }}
        >
          Thêm sản phẩm
        </h1>

        <p style={{ margin: '8px 0 0', color: '#6b7280' }}>
          Tạo sản phẩm mới cho gian hàng của bạn
        </p>
      </div>

      <div
        style={{
          background: '#fff',
          border: '1px solid #e7ecec',
          borderRadius: '20px',
          padding: '24px',
          boxShadow: '0 10px 24px rgba(15, 23, 42, 0.04)',
        }}
      >
        <div style={{ display: 'grid', gap: '16px' }}>
          <div>
            <label style={labelStyle}>Tên sản phẩm</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              style={inputStyle}
              placeholder="Nhập tên sản phẩm"
            />
          </div>

          <div>
            <label style={labelStyle}>Mô tả ngắn</label>
            <input
              name="shortDescription"
              value={form.shortDescription}
              onChange={handleChange}
              style={inputStyle}
              placeholder="Nhập mô tả ngắn"
            />
          </div>

          <div>
            <label style={labelStyle}>Mô tả chi tiết</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              style={{ ...inputStyle, minHeight: '120px', resize: 'vertical' }}
              placeholder="Nhập mô tả chi tiết"
            />
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '16px',
            }}
          >
            <div>
              <label style={labelStyle}>Giá bán</label>
              <input
                name="price"
                value={form.price}
                onChange={handleChange}
                style={inputStyle}
                placeholder="VD: 299000"
              />
            </div>

            <div>
              <label style={labelStyle}>Giá so sánh</label>
              <input
                name="comparePrice"
                value={form.comparePrice}
                onChange={handleChange}
                style={inputStyle}
                placeholder="VD: 399000"
              />
            </div>

            <div>
              <label style={labelStyle}>Tồn kho</label>
              <input
                name="stockQuantity"
                value={form.stockQuantity}
                onChange={handleChange}
                style={inputStyle}
                placeholder="VD: 10"
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Link ảnh</label>
            <input
              name="image"
              value={form.image}
              onChange={handleChange}
              style={inputStyle}
              placeholder="Dán URL ảnh sản phẩm"
            />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => navigate('/seller/products')}
              style={secondaryBtnStyle}
            >
              Quay lại
            </button>

            <button
              onClick={handleSubmit}
              disabled={loading}
              style={primaryBtnStyle}
            >
              {loading ? 'Đang tạo...' : 'Tạo sản phẩm'}
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
  fontSize: '14px',
  fontWeight: 600,
  color: '#374151',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  border: '1px solid #dce5e5',
  borderRadius: '12px',
  fontSize: '14px',
  outline: 'none',
  background: '#fff',
};

const primaryBtnStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, #19c2b0, #0ea5a4)',
  color: '#fff',
  border: 'none',
  padding: '12px 20px',
  borderRadius: '12px',
  fontWeight: 700,
  cursor: 'pointer',
};

const secondaryBtnStyle: React.CSSProperties = {
  background: '#fff',
  color: '#374151',
  border: '1px solid #dce5e5',
  padding: '12px 20px',
  borderRadius: '12px',
  fontWeight: 700,
  cursor: 'pointer',
};

export default SellerCreateProduct;