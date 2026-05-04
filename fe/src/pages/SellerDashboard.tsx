import { useEffect, useState } from 'react';

type DashboardData = {
  totalProducts: number;
  totalOrders: number;
  pendingOrders: number;
  shippingOrders: number;
  deliveredOrders: number;
  totalRevenue: number;
  revenueByDate: {
    date: string;
    revenue: number;
  }[];
};

const SellerDashboard = () => {
  const [dashboard, setDashboard] = useState<DashboardData>({
    totalProducts: 0,
    totalOrders: 0,
    pendingOrders: 0,
    shippingOrders: 0,
    deliveredOrders: 0,
    totalRevenue: 0,
    revenueByDate: [],
  });

  const token = localStorage.getItem('token');

  const loadDashboard = async () => {
    try {
      const res = await fetch('http://localhost:8888/api/products/seller/dashboard', {
        headers: {
          Authorization: 'Bearer ' + token,
        },
      });

      const data = await res.json();
      console.log('SELLER DASHBOARD:', data);

      if (!res.ok) {
        alert(data.message || 'Không tải được dashboard');
        return;
      }

      setDashboard({
        totalProducts: data.data?.totalProducts || 0,
        totalOrders: data.data?.totalOrders || 0,
        pendingOrders: data.data?.pendingOrders || 0,
        shippingOrders: data.data?.shippingOrders || 0,
        deliveredOrders: data.data?.deliveredOrders || 0,
        totalRevenue: data.data?.totalRevenue || 0,
        revenueByDate: data.data?.revenueByDate || [],
      });
    } catch (error) {
      console.error(error);
      alert('Có lỗi xảy ra khi tải dashboard');
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const maxRevenue = Math.max(...dashboard.revenueByDate.map((x) => x.revenue), 1);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f6f6f6',
        padding: '24px',
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div
          style={{
            background: 'linear-gradient(135deg, #ee4d2d, #ff7a59)',
            padding: '28px',
            marginBottom: '24px',
            borderRadius: '20px',
            color: '#fff',
            boxShadow: '0 12px 30px rgba(238,77,45,0.18)',
          }}
        >
          <div
            style={{
              fontSize: '13px',
              color: '#fff',
              fontWeight: 700,
              marginBottom: '8px',
              opacity: 0.95,
              letterSpacing: '0.8px',
            }}
          >
            SELLER CENTER
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: '34px',
              fontWeight: 800,
              color: '#fff',
            }}
          >
            Bảng điều khiển Seller
          </h1>

          <p
            style={{
              margin: '10px 0 0',
              color: 'rgba(255,255,255,0.92)',
              fontSize: '15px',
              lineHeight: 1.6,
            }}
          >
            Theo dõi nhanh hoạt động kinh doanh, doanh thu và trạng thái đơn hàng của shop bạn
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '20px',
            marginBottom: '24px',
          }}
        >
          <div style={cardStyle}>
            <div style={labelStyle}>Tổng sản phẩm</div>
            <div style={valueStyle}>{dashboard.totalProducts}</div>
          </div>

          <div style={cardStyle}>
            <div style={labelStyle}>Tổng đơn hàng</div>
            <div style={valueStyle}>{dashboard.totalOrders}</div>
          </div>

          <div style={cardStyle}>
            <div style={labelStyle}>Tổng doanh thu</div>
            <div style={{ ...valueStyle, color: '#ee4d2d', fontSize: '28px' }}>
              {Number(dashboard.totalRevenue).toLocaleString('vi-VN')} đ
            </div>
          </div>

          <div style={cardStyle}>
            <div style={labelStyle}>Đơn chờ xử lý</div>
            <div style={{ ...valueStyle, color: '#f59e0b' }}>{dashboard.pendingOrders}</div>
          </div>

          <div style={cardStyle}>
            <div style={labelStyle}>Đơn đang giao</div>
            <div style={{ ...valueStyle, color: '#3b82f6' }}>{dashboard.shippingOrders}</div>
          </div>

          <div style={cardStyle}>
            <div style={labelStyle}>Đơn đã giao</div>
            <div style={{ ...valueStyle, color: '#10b981' }}>{dashboard.deliveredOrders}</div>
          </div>
        </div>

        <div
          style={{
            background: '#fff',
            border: '1px solid #eee',
            padding: '24px',
            marginBottom: '24px',
            borderRadius: '18px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.05)',
          }}
        >
          <div
            style={{
              fontSize: '24px',
              fontWeight: 800,
              color: '#111827',
              marginBottom: '12px',
            }}
          >
            Tổng quan hoạt động
          </div>

          <div
            style={{
              fontSize: '15px',
              color: '#6b7280',
              lineHeight: 1.8,
            }}
          >
            Gian hàng hiện có <b>{dashboard.totalProducts}</b> sản phẩm, đã tiếp nhận{' '}
            <b>{dashboard.totalOrders}</b> đơn hàng và đạt tổng doanh thu{' '}
            <b>{Number(dashboard.totalRevenue).toLocaleString('vi-VN')} đ</b>. Hiện tại có{' '}
            <b>{dashboard.pendingOrders}</b> đơn chờ xử lý, <b>{dashboard.shippingOrders}</b> đơn
            đang giao và <b>{dashboard.deliveredOrders}</b> đơn đã hoàn tất.
          </div>
        </div>

        <div
          style={{
            background: '#fff',
            border: '1px solid #eee',
            padding: '24px',
            marginTop: '0',
            borderRadius: '18px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.05)',
            marginBottom: '24px',
          }}
        >
          <div
            style={{
              fontSize: '24px',
              fontWeight: 800,
              color: '#111827',
              marginBottom: '8px',
            }}
          >
            Doanh thu theo ngày
          </div>

          <div
            style={{
              fontSize: '14px',
              color: '#6b7280',
              marginBottom: '18px',
            }}
          >
            Biểu đồ doanh thu giúp seller theo dõi xu hướng kinh doanh theo từng ngày
          </div>

          {dashboard.revenueByDate.length === 0 ? (
            <div style={{ color: '#666' }}>Chưa có dữ liệu doanh thu</div>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: '16px',
                height: '260px',
                paddingTop: '20px',
              }}
            >
              {dashboard.revenueByDate.map((item) => {
                const barHeight = (item.revenue / maxRevenue) * 180;

                return (
                  <div
                    key={item.date}
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      height: '100%',
                    }}
                  >
                    <div
                      style={{
                        marginBottom: '8px',
                        fontSize: '12px',
                        color: '#444',
                        fontWeight: 600,
                        textAlign: 'center',
                      }}
                    >
                      {Number(item.revenue).toLocaleString('vi-VN')} đ
                    </div>

                    <div
                      style={{
                        width: '100%',
                        maxWidth: '70px',
                        height: `${barHeight}px`,
                        background: '#14b8a6',
                        borderRadius: '10px 10px 0 0',
                      }}
                    />

                    <div
                      style={{
                        marginTop: '10px',
                        fontSize: '12px',
                        color: '#666',
                        textAlign: 'center',
                      }}
                    >
                      {new Date(item.date).toLocaleDateString('vi-VN')}
                    </div>
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
            padding: '24px',
            borderRadius: '18px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.05)',
          }}
        >
          <div
            style={{
              fontSize: '24px',
              fontWeight: 800,
              color: '#111827',
              marginBottom: '16px',
            }}
          >
            Trạng thái đơn hàng
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '14px',
            }}
          >
            <div
              style={{
                background: '#fff7ed',
                color: '#9a3412',
                padding: '16px',
                borderRadius: '14px',
                border: '1px solid #fed7aa',
              }}
            >
              <div style={{ fontSize: '14px', marginBottom: '6px', fontWeight: 600 }}>
                Chờ xử lý
              </div>
              <div style={{ fontSize: '28px', fontWeight: 800 }}>{dashboard.pendingOrders}</div>
            </div>

            <div
              style={{
                background: '#eff6ff',
                color: '#1d4ed8',
                padding: '16px',
                borderRadius: '14px',
                border: '1px solid #bfdbfe',
              }}
            >
              <div style={{ fontSize: '14px', marginBottom: '6px', fontWeight: 600 }}>
                Đang giao
              </div>
              <div style={{ fontSize: '28px', fontWeight: 800 }}>{dashboard.shippingOrders}</div>
            </div>

            <div
              style={{
                background: '#ecfdf5',
                color: '#047857',
                padding: '16px',
                borderRadius: '14px',
                border: '1px solid #a7f3d0',
              }}
            >
              <div style={{ fontSize: '14px', marginBottom: '6px', fontWeight: 600 }}>
                Đã giao
              </div>
              <div style={{ fontSize: '28px', fontWeight: 800 }}>{dashboard.deliveredOrders}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const cardStyle: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #eee',
  padding: '24px',
  borderRadius: '18px',
  boxShadow: '0 8px 24px rgba(0,0,0,0.05)',
};

const labelStyle: React.CSSProperties = {
  color: '#6b7280',
  fontSize: '14px',
  marginBottom: '8px',
  fontWeight: 600,
};

const valueStyle: React.CSSProperties = {
  fontSize: '32px',
  fontWeight: 800,
  color: '#111827',
};

export default SellerDashboard;