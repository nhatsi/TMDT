import { useEffect, useState } from 'react';

type RevenueData = {
  totalRevenue: number;
  totalOrders: number;
  completedOrders: number;
  averageOrderValue: number;
};

const SellerRevenue = () => {
  const [revenue, setRevenue] = useState<RevenueData>({
    totalRevenue: 0,
    totalOrders: 0,
    completedOrders: 0,
    averageOrderValue: 0,
  });

  const token = localStorage.getItem('token');

  const loadRevenue = async () => {
    try {
      const res = await fetch(
        'http://localhost:8888/api/products/seller/revenue',
        {
          headers: {
            Authorization: 'Bearer ' + token,
          },
        }
      );

      const data = await res.json();
      console.log('SELLER REVENUE:', data);

      if (!res.ok) {
        alert(data.message || 'Không tải được doanh thu');
        return;
      }

      const totalRevenue = data.data?.totalRevenue || 0;
      const totalOrders = data.data?.totalOrders || 0;

      // Vì mình chỉ lấy delivered nên:
      const completedOrders = totalOrders;

      const averageOrderValue =
        totalOrders > 0 ? totalRevenue / totalOrders : 0;

      setRevenue({
        totalRevenue,
        totalOrders,
        completedOrders,
        averageOrderValue,
      });
    } catch (error) {
      console.error(error);
      alert('Có lỗi xảy ra khi tải doanh thu');
    }
  };

  useEffect(() => {
    loadRevenue();
  }, []);

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
            Doanh thu Seller
          </h1>

          <p style={{ margin: '8px 0 0', color: '#666' }}>
            Theo dõi hiệu quả kinh doanh của shop bạn
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            gap: '20px',
          }}
        >
          <div style={cardStyle}>
            <div style={labelStyle}>Tổng doanh thu</div>
            <div style={{ ...valueStyle, color: '#ee4d2d' }}>
              {Number(revenue.totalRevenue).toLocaleString('vi-VN')} đ
            </div>
          </div>

          <div style={cardStyle}>
            <div style={labelStyle}>Tổng số đơn</div>
            <div style={valueStyle}>{revenue.totalOrders}</div>
          </div>

          <div style={cardStyle}>
            <div style={labelStyle}>Đơn đã giao</div>
            <div style={valueStyle}>{revenue.completedOrders}</div>
          </div>

          <div style={cardStyle}>
            <div style={labelStyle}>Giá trị trung bình / đơn</div>
            <div style={valueStyle}>
              {Number(revenue.averageOrderValue).toLocaleString('vi-VN')} đ
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
};

const labelStyle: React.CSSProperties = {
  color: '#666',
  fontSize: '14px',
  marginBottom: '8px',
};

const valueStyle: React.CSSProperties = {
  fontSize: '30px',
  fontWeight: 800,
  color: '#222',
};

export default SellerRevenue;