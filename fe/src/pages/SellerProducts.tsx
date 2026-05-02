import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

type Product = {
  id: string;
  name: string;
  price: number;
};

const SellerProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const navigate = useNavigate();

  const token = localStorage.getItem('token');

  const loadProducts = async () => {
    const res = await fetch('http://localhost:8888/api/products/seller/products', {
      headers: {
        Authorization: 'Bearer ' + token,
      },
    });

    const data = await res.json();
    console.log('SELLER PRODUCTS:', data);

    setProducts(data.data || []);
  };

  useEffect(() => {
    loadProducts();
  }, []);

  return (
    
  <div style={{ padding: 20 }}>
    <div
  style={{
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    gap: '16px',
    flexWrap: 'wrap',
  }}
>
  <div>
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
    <h1 style={{ margin: 0, fontSize: '32px', fontWeight: 800, color: '#1f2937' }}>
      Sản phẩm của tôi
    </h1>
    <p style={{ margin: '8px 0 0', color: '#6b7280' }}>
      Quản lý toàn bộ sản phẩm mà shop bạn đang đăng bán
    </p>
  </div>

  <button
    onClick={() => navigate('/seller/products/create')}
    style={{
      background: 'linear-gradient(135deg, #19c2b0, #0ea5a4)',
      color: '#fff',
      border: 'none',
      padding: '12px 18px',
      borderRadius: '12px',
      fontWeight: 700,
      cursor: 'pointer',
    }}
  >
    + Thêm sản phẩm
  </button>
</div>
    <h2 style={{ marginBottom: 20 }}>🛍️ My Products</h2>

    {products.length === 0 ? (
      <p>Không có sản phẩm</p>
    ) : (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
          gap: 20,
        }}
      >
        {products.map((p) => (
          <div
            key={p.id}
            style={{
              border: '1px solid #eee',
              borderRadius: 10,
              padding: 15,
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              background: '#fff',
            }}
          >
            <h4 style={{ marginBottom: 10 }}>{p.name}</h4>

            <div style={{ color: '#ee4d2d', fontWeight: 'bold' }}>
              💰 {Number(p.price).toLocaleString('vi-VN')} đ
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);  
};

export default SellerProducts;