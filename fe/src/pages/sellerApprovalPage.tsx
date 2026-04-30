import React, { useEffect, useState } from 'react';
import axios from 'axios';

type SellerRequest = {
  id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  seller_status?: string;
  shop_name?: string;
  shop_description?: string;
  shop_phone?: string;
  shop_address?: string;
  createdAt?: string;
};

const getToken = () => localStorage.getItem('token');

const getSellerName = (seller: SellerRequest) => {
  if (seller.shop_name) return seller.shop_name;

  const fullName = `${seller.firstName || ''} ${seller.lastName || ''}`.trim();
  return fullName || seller.email;
};

const formatDate = (date?: string) => {
  if (!date) return '-';

  return new Date(date).toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

const SellerApprovalPage: React.FC = () => {
  const [sellerRequests, setSellerRequests] = useState<SellerRequest[]>([]);
  const [loading, setLoading] = useState(false);

  const authHeaders = {
    Authorization: `Bearer ${getToken()}`,
  };

  const loadSellerRequests = async () => {
    try {
      setLoading(true);

      const res = await axios.get('/api/admin/seller-requests', {
        headers: authHeaders,
      });

      setSellerRequests(res.data?.data?.sellers || []);
    } catch (error) {
      console.error('LOAD SELLER REQUESTS ERROR:', error);
      alert('Không tải được danh sách yêu cầu seller');
    } finally {
      setLoading(false);
    }
  };

  const approveSeller = async (sellerId: string) => {
    if (!window.confirm('Bạn có chắc muốn duyệt seller này?')) return;

    try {
      await axios.put(
        `/api/admin/seller-requests/${sellerId}/approve`,
        {},
        { headers: authHeaders }
      );

      alert('Duyệt seller thành công');
      loadSellerRequests();
    } catch (error: any) {
      console.error('APPROVE SELLER ERROR:', error);
      alert(error?.response?.data?.message || 'Duyệt seller thất bại');
    }
  };

  const rejectSeller = async (sellerId: string) => {
    if (!window.confirm('Bạn có chắc muốn từ chối seller này?')) return;

    try {
      await axios.put(
        `/api/admin/seller-requests/${sellerId}/reject`,
        {},
        { headers: authHeaders }
      );

      alert('Từ chối seller thành công');
      loadSellerRequests();
    } catch (error: any) {
      console.error('REJECT SELLER ERROR:', error);
      alert(error?.response?.data?.message || 'Từ chối seller thất bại');
    }
  };

  useEffect(() => {
    loadSellerRequests();
  }, []);

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Duyệt Seller</h1>
          <p style={styles.subtitle}>
            Kiểm duyệt các tài khoản đăng ký trở thành người bán trên hệ thống.
          </p>
        </div>

        <button type="button" onClick={loadSellerRequests} style={styles.refreshButton}>
          Tải lại
        </button>
      </div>

      <div style={styles.card}>
        {loading ? (
          <div style={styles.empty}>Đang tải danh sách yêu cầu...</div>
        ) : sellerRequests.length === 0 ? (
          <div style={styles.empty}>Không có yêu cầu seller nào đang chờ duyệt.</div>
        ) : (
          <div style={styles.table}>
            <div style={{ ...styles.row, ...styles.head }}>
              <div>Shop</div>
              <div>Email</div>
              <div>Số điện thoại</div>
              <div>Địa chỉ</div>
              <div>Ngày gửi</div>
              <div>Thao tác</div>
            </div>

            {sellerRequests.map((seller) => (
              <div key={seller.id} style={styles.row}>
                <div>
                  <div style={styles.strong}>{getSellerName(seller)}</div>
                  <div style={styles.muted}>
                    {seller.shop_description || 'Chưa có mô tả'}
                  </div>
                </div>

                <div>{seller.email}</div>
                <div>{seller.shop_phone || seller.phone || '-'}</div>
                <div>{seller.shop_address || '-'}</div>
                <div>{formatDate(seller.createdAt)}</div>

                <div style={styles.actions}>
                  <button
                    type="button"
                    onClick={() => approveSeller(seller.id)}
                    style={styles.approveButton}
                  >
                    Duyệt
                  </button>

                  <button
                    type="button"
                    onClick={() => rejectSeller(seller.id)}
                    style={styles.rejectButton}
                  >
                    Từ chối
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: 24,
    background: '#f8fafc',
    minHeight: '100vh',
  },

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },

  title: {
    margin: 0,
    fontSize: 28,
    fontWeight: 800,
    color: '#0f172a',
  },

  subtitle: {
    margin: '6px 0 0',
    color: '#64748b',
  },

  refreshButton: {
    border: 'none',
    borderRadius: 10,
    padding: '10px 16px',
    background: '#2563eb',
    color: '#fff',
    fontWeight: 700,
    cursor: 'pointer',
  },

  card: {
    background: '#fff',
    borderRadius: 16,
    padding: 20,
    boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
    border: '1px solid #e2e8f0',
  },

  table: {
    width: '100%',
    overflowX: 'auto',
  },

  row: {
    display: 'grid',
    gridTemplateColumns: '1.3fr 1.4fr 1fr 1.3fr 0.8fr 1fr',
    gap: 12,
    alignItems: 'center',
    padding: '14px 10px',
    borderBottom: '1px solid #e2e8f0',
  },

  head: {
    background: '#f1f5f9',
    borderRadius: 10,
    fontWeight: 800,
    color: '#334155',
    borderBottom: 'none',
  },

  strong: {
    fontWeight: 700,
    color: '#0f172a',
  },

  muted: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 4,
  },

  actions: {
    display: 'flex',
    gap: 8,
  },

  approveButton: {
    border: 'none',
    borderRadius: 8,
    padding: '8px 12px',
    background: '#16a34a',
    color: '#fff',
    fontWeight: 700,
    cursor: 'pointer',
  },

  rejectButton: {
    border: 'none',
    borderRadius: 8,
    padding: '8px 12px',
    background: '#dc2626',
    color: '#fff',
    fontWeight: 700,
    cursor: 'pointer',
  },

  empty: {
    padding: 30,
    textAlign: 'center',
    color: '#64748b',
    background: '#f8fafc',
    borderRadius: 12,
  },
};
export default SellerApprovalPage;