import { useEffect, useState } from 'react';

type Seller = {
  id: string;
  email: string;
};

type Product = {
  id: string;
  name: string;
  price: number;
};

const AdminSellers = () => {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedSeller, setSelectedSeller] = useState<Seller | null>(null);
  const [loadingSellers, setLoadingSellers] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const token = localStorage.getItem('token');

  const loadSellers = async () => {
    try {
      setLoadingSellers(true);

      const res = await fetch('http://localhost:8888/api/users/admin/sellers', {
        headers: {
          Authorization: 'Bearer ' + token,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || 'Lỗi tải danh sách seller');
        return;
      }

      setSellers(data.data || []);
    } catch (error) {
      console.error(error);
      alert('Không gọi được API sellers');
    } finally {
      setLoadingSellers(false);
    }
  };

  const loadProducts = async (seller: Seller) => {
    try {
      setSelectedSeller(seller);
      setLoadingProducts(true);

      const res = await fetch(
        `http://localhost:8888/api/users/admin/sellers/${seller.id}/products`,
        {
          headers: {
            Authorization: 'Bearer ' + token,
          },
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || 'Lỗi tải sản phẩm');
        return;
      }

      setProducts(data.data || []);
    } catch (error) {
      console.error(error);
      alert('Không gọi được API products');
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadSellers();
    }
  }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f6f6f6',
        padding: '24px',
        color: '#222',
      }}
    >
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
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
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '16px',
              flexWrap: 'wrap',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: '13px',
                  color: '#ee4d2d',
                  fontWeight: 700,
                  marginBottom: '6px',
                  textTransform: 'uppercase',
                }}
              >
                Seller Center
              </div>
              <h1
                style={{
                  margin: 0,
                  fontSize: '32px',
                  fontWeight: 800,
                  color: '#222',
                }}
              >
                Quản lý Seller
              </h1>
              <p
                style={{
                  margin: '8px 0 0',
                  color: '#666',
                  fontSize: '14px',
                }}
              >
                Quản lý người bán và theo dõi sản phẩm theo từng seller
              </p>
            </div>

            <button
              onClick={loadSellers}
              style={{
                background: '#ee4d2d',
                color: '#fff',
                border: 'none',
                padding: '12px 18px',
                fontWeight: 700,
                cursor: 'pointer',
                borderRadius: '4px',
              }}
            >
              {loadingSellers ? 'Đang tải...' : 'Tải danh sách seller'}
            </button>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '280px 1fr',
            gap: '20px',
          }}
        >
          <div
            style={{
              background: '#fff',
              border: '1px solid #eee',
            }}
          >
            <div
              style={{
                padding: '16px 18px',
                borderBottom: '1px solid #f0f0f0',
                fontWeight: 700,
                fontSize: '18px',
              }}
            >
              Danh sách Seller ({sellers.length})
            </div>

            {loadingSellers ? (
              <div style={{ padding: '16px', color: '#666' }}>Đang tải seller...</div>
            ) : sellers.length === 0 ? (
              <div style={{ padding: '16px', color: '#666' }}>
                Không có seller nào.
              </div>
            ) : (
              <div>
                {sellers.map((seller) => {
                  const active = selectedSeller?.id === seller.id;

                  return (
                    <div
                      key={seller.id}
                      style={{
                        padding: '14px 16px',
                        borderBottom: '1px solid #f5f5f5',
                        background: active ? '#fff1ee' : '#fff',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '15px',
                          fontWeight: 600,
                          color: '#222',
                          marginBottom: '10px',
                          wordBreak: 'break-word',
                        }}
                      >
                        {seller.email}
                      </div>

                      <button
                        onClick={() => loadProducts(seller)}
                        style={{
                          background: active ? '#ee4d2d' : '#fff',
                          color: active ? '#fff' : '#ee4d2d',
                          border: '1px solid #ee4d2d',
                          padding: '8px 12px',
                          cursor: 'pointer',
                          borderRadius: '4px',
                          fontWeight: 600,
                        }}
                      >
                        Xem sản phẩm
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div
            style={{
              background: '#fff',
              border: '1px solid #eee',
            }}
          >
            <div
              style={{
                padding: '16px 18px',
                borderBottom: '1px solid #f0f0f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '12px',
                flexWrap: 'wrap',
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: '20px' }}>Sản phẩm</div>
                <div style={{ color: '#666', fontSize: '14px', marginTop: '4px' }}>
                  {selectedSeller
                    ? `Seller đang chọn: ${selectedSeller.email}`
                    : 'Chọn seller để xem sản phẩm'}
                </div>
              </div>

              <div
                style={{
                  background: '#fff6f5',
                  color: '#ee4d2d',
                  border: '1px solid #ffd8d2',
                  padding: '6px 12px',
                  borderRadius: '4px',
                  fontWeight: 700,
                  fontSize: '14px',
                }}
              >
                {products.length} sản phẩm
              </div>
            </div>

            {loadingProducts ? (
              <div style={{ padding: '18px', color: '#666' }}>Đang tải sản phẩm...</div>
            ) : products.length === 0 ? (
              <div style={{ padding: '18px', color: '#666' }}>
                Chưa có sản phẩm nào được hiển thị.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '14px',
                  }}
                >
                  <thead>
                    <tr style={{ background: '#fafafa' }}>
                      <th
                        style={{
                          textAlign: 'left',
                          padding: '14px 16px',
                          borderBottom: '1px solid #eee',
                        }}
                      >
                        Tên sản phẩm
                      </th>
                      <th
                        style={{
                          textAlign: 'left',
                          padding: '14px 16px',
                          borderBottom: '1px solid #eee',
                          width: '220px',
                        }}
                      >
                        Giá
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => (
                      <tr key={product.id}>
                        <td
                          style={{
                            padding: '14px 16px',
                            borderBottom: '1px solid #f5f5f5',
                            color: '#222',
                            fontWeight: 500,
                          }}
                        >
                          {product.name}
                        </td>
                        <td
                          style={{
                            padding: '14px 16px',
                            borderBottom: '1px solid #f5f5f5',
                            color: '#ee4d2d',
                            fontWeight: 700,
                          }}
                        >
                          {Number(product.price).toLocaleString('vi-VN')} đ
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSellers;