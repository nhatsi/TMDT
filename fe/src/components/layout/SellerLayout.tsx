import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';

const SellerLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [messageBadge, setMessageBadge] = useState(0);

  const userRaw = localStorage.getItem('user');
  const user = userRaw ? JSON.parse(userRaw) : null;
  const token = localStorage.getItem('token');

  const loadMessageBadge = async () => {
    try {
      if (!token || !user) return;
      if (user.role !== 'seller') return;

      const res = await fetch('http://localhost:8888/api/chat/seller/conversations', {
        headers: {
          Authorization: 'Bearer ' + token,
        },
      });

      const data = await res.json();

      if (!res.ok) return;

      setMessageBadge((data.data || []).length);
    } catch (error) {
      console.error('Load message badge error:', error);
    }
  };

  useEffect(() => {
    loadMessageBadge();

    const interval = setInterval(() => {
      loadMessageBadge();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const menuItems = [
    { label: 'Tổng quan', path: '/seller/dashboard', icon: '📊' },
    { label: 'Sản phẩm của tôi', path: '/seller/products', icon: '📦' },
    { label: 'Đơn hàng', path: '/seller/orders', icon: '🧾' },
    { label: 'Doanh thu', path: '/seller/revenue', icon: '💰' },
    { label: 'Hồ sơ shop', path: '/seller/profile', icon: '👤' },
    { label: 'Tin nhắn', path: '/seller/messages', icon: '💬', badge: messageBadge },
  ];

  const currentPath = location.pathname;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f6f6f6',
      }}
    >
      <div
        style={{
          background: '#fff',
          borderBottom: '1px solid #e5e7eb',
          padding: '14px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: '#14b8a6',
            }}
          />
          <div>
            <div
              style={{
                fontSize: '18px',
                fontWeight: 800,
                color: '#111827',
              }}
            >
              ShopMini Seller Center
            </div>
            <div
              style={{
                fontSize: '13px',
                color: '#6b7280',
              }}
            >
              Khu quản lý dành cho người bán
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => navigate('/')}
            style={headerSecondaryButtonStyle}
          >
            Về trang chủ
          </button>

          <button
            onClick={() => {
              if (user?.id) {
                navigate(`/store/${user.id}`);
              } else {
                navigate('/');
              }
            }}
            style={headerPrimaryButtonStyle}
          >
            Xem gian hàng
          </button>
        </div>
      </div>

      <div
        style={{
          maxWidth: '1360px',
          margin: '0 auto',
          padding: '28px 24px',
          display: 'grid',
          gridTemplateColumns: '300px minmax(0, 1fr)',
          gap: '24px',
          alignItems: 'start',
        }}
      >
        <aside
          style={{
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: '20px',
            padding: '20px',
            boxShadow: '0 6px 18px rgba(0,0,0,0.04)',
            position: 'sticky',
            top: '92px',
          }}
        >
          <div
            style={{
              fontSize: '14px',
              fontWeight: 700,
              color: '#14b8a6',
              marginBottom: '8px',
            }}
          >
            KÊNH NGƯỜI BÁN
          </div>

          <div
            style={{
              fontSize: '22px',
              fontWeight: 800,
              color: '#1f2937',
              marginBottom: '18px',
            }}
          >
            Seller Center
          </div>

          <div
            style={{
              height: '1px',
              background: '#eceff3',
              marginBottom: '12px',
            }}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {menuItems.map((item) => {
              const isActive = currentPath === item.path;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    padding: '16px 18px',
                    borderRadius: '18px',
                    textDecoration: 'none',
                    background: isActive ? '#ecfeff' : '#fff',
                    border: isActive ? '1px solid #99f6e4' : '1px solid transparent',
                    color: isActive ? '#0f766e' : '#374151',
                    fontWeight: 700,
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                    }}
                  >
                    <span style={{ fontSize: '18px' }}>{item.icon}</span>
                    <span>{item.label}</span>
                  </div>

                  {item.badge && item.badge > 0 && (
                    <span
                      style={{
                        minWidth: '22px',
                        height: '22px',
                        padding: '0 6px',
                        borderRadius: '999px',
                        background: '#ef4444',
                        color: '#fff',
                        fontSize: '12px',
                        fontWeight: 800,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        lineHeight: 1,
                      }}
                    >
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </aside>

        <main style={{ minWidth: 0 }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

const headerPrimaryButtonStyle: React.CSSProperties = {
  background: '#14b8a6',
  color: '#fff',
  border: 'none',
  borderRadius: '14px',
  padding: '12px 18px',
  fontWeight: 800,
  cursor: 'pointer',
};

const headerSecondaryButtonStyle: React.CSSProperties = {
  background: '#fff',
  color: '#111827',
  border: '1px solid #d1d5db',
  borderRadius: '14px',
  padding: '12px 18px',
  fontWeight: 800,
  cursor: 'pointer',
};

export default SellerLayout;