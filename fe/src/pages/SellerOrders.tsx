import { useEffect, useState } from 'react';

type SellerOrderItem = {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  total: number;
  status: string;
  createdAt: string;
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string;
  } | null;
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending':
      return '#f59e0b';
    case 'processing':
      return '#3b82f6';
    case 'shipped':
      return '#8b5cf6';
    case 'delivered':
      return '#22c55e';
    case 'cancelled':
      return '#ef4444';
    default:
      return '#666';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'pending':
      return 'Chờ xử lý';
    case 'processing':
      return 'Đang xử lý';
    case 'shipped':
      return 'Đã giao cho vận chuyển';
    case 'delivered':
      return 'Đã giao hàng';
    case 'cancelled':
      return 'Đã hủy';
    default:
      return status;
  }
};

const getNextStatus = (status: string) => {
  switch (status) {
    case 'pending':
      return 'processing';
    case 'processing':
      return 'shipped';
    case 'shipped':
      return 'delivered';
    default:
      return null;
  }
};

const SellerOrders = () => {
  const [orders, setOrders] = useState<SellerOrderItem[]>([]);
  const token = localStorage.getItem('token');

  const loadOrders = async () => {
    try {
      const res = await fetch('http://localhost:8888/api/products/seller/orders', {
        headers: {
          Authorization: 'Bearer ' + token,
        },
      });

      const data = await res.json();
      console.log('SELLER ORDERS:', data);

      if (!res.ok) {
        alert(data.message || 'Không tải được đơn hàng');
        return;
      }

      setOrders(data.data || []);
    } catch (error) {
      console.error(error);
      alert('Có lỗi xảy ra khi tải đơn hàng');
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const updateOrderStatus = async (orderItemId: string, nextStatus: string) => {
    try {
      const token = localStorage.getItem('token');

      const res = await fetch(
        `http://localhost:8888/api/products/seller/orders/${orderItemId}/status`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + token,
          },
          body: JSON.stringify({ status: nextStatus }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || 'Cập nhật trạng thái thất bại');
        return;
      }

      alert('Cập nhật trạng thái thành công');
      loadOrders();
    } catch (error) {
      console.error(error);
      alert('Có lỗi xảy ra khi cập nhật trạng thái');
    }
  };

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
            Quản lý đơn hàng
          </h1>

          <p style={{ margin: '8px 0 0', color: '#666' }}>
            Danh sách đơn hàng liên quan tới sản phẩm của shop bạn
          </p>
        </div>

        <div
          style={{
            background: '#fff',
            border: '1px solid #eee',
            overflowX: 'auto',
          }}
        >
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              minWidth: '1100px',
            }}
          >
            <thead>
              <tr style={{ background: '#fafafa' }}>
                <th style={thStyle}>Mã đơn</th>
                <th style={thStyle}>Khách mua</th>
                <th style={thStyle}>Sản phẩm</th>
                <th style={thStyle}>Số lượng</th>
                <th style={thStyle}>Giá</th>
                <th style={thStyle}>Thành tiền</th>
                <th style={thStyle}>Trạng thái</th>
                <th style={thStyle}>Ngày tạo</th>
                <th style={thStyle}>Hành động</th>
              </tr>
            </thead>

            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '24px', textAlign: 'center', color: '#666' }}>
                    Chưa có đơn hàng
                  </td>
                </tr>
              ) : (
                orders.map((item) => (
                  <tr key={item.id} style={{ borderTop: '1px solid #eef2f2' }}>
                    <td style={tdStyle}>#{item.orderId}</td>

                    <td style={tdStyle}>
                      {item.customer ? (
                        <div>
                          <div style={{ fontWeight: 700 }}>
                            {item.customer.name || 'Khách hàng'}
                          </div>
                          <div style={{ fontSize: '12px', color: '#6b7280' }}>
                            {item.customer.email}
                          </div>
                          <div style={{ fontSize: '12px', color: '#6b7280' }}>
                            {item.customer.phone}
                          </div>
                        </div>
                      ) : (
                        'Không rõ'
                      )}
                    </td>

                    <td style={tdStyle}>{item.productName}</td>
                    <td style={tdStyle}>{item.quantity}</td>

                    <td style={tdStyle}>
                      {Number(item.price).toLocaleString('vi-VN')} đ
                    </td>

                    <td style={tdStyle}>
                      {Number(item.total).toLocaleString('vi-VN')} đ
                    </td>

                    <td style={tdStyle}>
                      <span
                        style={{
                          color: '#fff',
                          background: getStatusColor(item.status),
                          padding: '6px 10px',
                          borderRadius: '999px',
                          fontSize: '12px',
                          fontWeight: 700,
                        }}
                      >
                        {getStatusLabel(item.status)}
                      </span>
                    </td>

                    <td style={tdStyle}>
                      {item.createdAt
                        ? new Date(item.createdAt).toLocaleString('vi-VN')
                        : ''}
                    </td>

                    <td style={tdStyle}>
                      {getNextStatus(item.status) ? (
                        <button
                          onClick={() =>
                            updateOrderStatus(item.id, getNextStatus(item.status)!)
                          }
                          style={{
                            background: '#14b8a6',
                            color: '#fff',
                            border: 'none',
                            padding: '8px 12px',
                            borderRadius: '10px',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          Chuyển sang {getStatusLabel(getNextStatus(item.status)!)}
                        </button>
                      ) : (
                        <span style={{ color: '#9ca3af', fontWeight: 600 }}>
                          Hoàn tất
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '14px 16px',
  fontSize: '14px',
  color: '#444',
  borderBottom: '1px solid #eee',
};

const tdStyle: React.CSSProperties = {
  padding: '14px 16px',
  fontSize: '14px',
  color: '#222',
};

export default SellerOrders;