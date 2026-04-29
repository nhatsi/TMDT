import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';

type SellerInfo = {
  id: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  shop_name?: string;
  shop_description?: string;
  shop_avatar?: string;
  shop_banner?: string;
  shop_phone?: string;
  shop_address?: string;
};

type ProductItem = {
  id: string;
  name: string;
  price: number;
  compareAtPrice?: number;
  thumbnail?: string;
  images?: string[];
  slug?: string;
  sold?: number;
  createdAt?: string;
};

type TopProductItem = ProductItem & {
  soldCount?: number;
};

type StoreResponse = {
  seller: SellerInfo | null;
  products: ProductItem[];
  topProducts: TopProductItem[];
};

type ChatMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  senderRole: 'customer' | 'seller';
  content: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
  sender?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  };
};

const SellerStorePage = () => {
  const { sellerId } = useParams<{ sellerId: string }>();

  const [store, setStore] = useState<StoreResponse>({
    seller: null,
    products: [],
    topProducts: [],
  });

  const [loading, setLoading] = useState(true);

  const [searchText, setSearchText] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const token = localStorage.getItem('token');
  const userRaw = localStorage.getItem('user');

  const currentUser = useMemo(() => {
    try {
      return userRaw ? JSON.parse(userRaw) : null;
    } catch {
      return null;
    }
  }, [userRaw]);

  const scrollMessagesToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  useEffect(() => {
    if (isChatOpen) {
      scrollMessagesToBottom();
    }
  }, [messages, isChatOpen]);

  useEffect(() => {
    if (!isChatOpen || !conversationId || !token) return;

    const interval = setInterval(() => {
      loadConversationMessages(conversationId, false);
    }, 4000);

    return () => clearInterval(interval);
  }, [isChatOpen, conversationId, token]);

  const loadStore = async () => {
    try {
      setLoading(true);

      const res = await fetch(`http://localhost:8888/api/users/store/${sellerId}`);
      const data = await res.json();

      if (!res.ok) {
        alert(data.message || 'Không tải được gian hàng');
        setLoading(false);
        return;
      }

      setStore({
        seller: data.data?.seller || null,
        products: data.data?.products || [],
        topProducts: data.data?.topProducts || [],
      });
    } catch (error) {
      console.error(error);
      alert('Có lỗi xảy ra khi tải gian hàng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sellerId) {
      loadStore();
    }
  }, [sellerId]);

  const seller = store.seller;

  const displayShopName =
    seller?.shop_name ||
    `${seller?.firstName || ''} ${seller?.lastName || ''}`.trim() ||
    'Gian hàng';

  const displayAvatar =
    seller?.shop_avatar ||
    seller?.avatar ||
    'https://via.placeholder.com/100x100?text=Shop';

  const displayBanner =
    seller?.shop_banner ||
    'https://via.placeholder.com/1200x260?text=Shop+Banner';

  const displayDescription = seller?.shop_description || 'Chưa có mô tả shop';
  const displayPhone = seller?.shop_phone || 'Chưa cập nhật';
  const displayAddress = seller?.shop_address || 'Chưa cập nhật';

  const totalProducts = store.products.length;
  const soldCount = totalProducts * 3;

  const filteredProducts = [...store.products]
    .filter((product) => {
      const productName = (product.name || '').toLowerCase();
      const keyword = searchText.trim().toLowerCase();

      const price = Number(product.price) || 0;
      const min = minPrice ? Number(minPrice) : null;
      const max = maxPrice ? Number(maxPrice) : null;

      const matchKeyword = keyword ? productName.includes(keyword) : true;
      const matchMin = min !== null ? price >= min : true;
      const matchMax = max !== null ? price <= max : true;

      return matchKeyword && matchMin && matchMax;
    })
    .sort((a, b) => {
      if (sortBy === 'price-asc') {
        return (Number(a.price) || 0) - (Number(b.price) || 0);
      }

      if (sortBy === 'price-desc') {
        return (Number(b.price) || 0) - (Number(a.price) || 0);
      }

      if (sortBy === 'best-selling') {
        return (Number(b.sold) || 0) - (Number(a.sold) || 0);
      }

      return (
        new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
    });

  const openChatWithSeller = async () => {
    try {
      if (!token) {
        alert('Vui lòng đăng nhập để chat với shop');
        return;
      }

      if (!currentUser) {
        alert('Không tìm thấy thông tin người dùng');
        return;
      }

      if (currentUser.role !== 'customer') {
        alert('Chỉ khách hàng mới có thể chat với shop ở trang này');
        return;
      }

      if (!seller?.id) {
        alert('Không tìm thấy thông tin seller');
        return;
      }

      setIsChatOpen(true);
      setChatLoading(true);

      const res = await fetch('http://localhost:8888/api/chat/conversation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token,
        },
        body: JSON.stringify({
          sellerId: seller.id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || 'Không thể mở cuộc trò chuyện');
        return;
      }

      const newConversationId = data.data.id;
      setConversationId(newConversationId);
      await loadConversationMessages(newConversationId, true);
    } catch (error) {
      console.error(error);
      alert('Có lỗi xảy ra khi mở chat');
    } finally {
      setChatLoading(false);
    }
  };

  const loadConversationMessages = async (id: string, showError = true) => {
    try {
      const res = await fetch(
        `http://localhost:8888/api/chat/conversation/${id}/messages`,
        {
          headers: {
            Authorization: 'Bearer ' + token,
          },
        }
      );

      const data = await res.json();

      if (!res.ok) {
        if (showError) {
          alert(data.message || 'Không tải được tin nhắn');
        }
        return;
      }

      setMessages(data.data || []);
    } catch (error) {
      console.error(error);
      if (showError) {
        alert('Có lỗi xảy ra khi tải tin nhắn');
      }
    }
  };

  const handleSendMessage = async () => {
    try {
      if (!conversationId) return;
      if (!messageInput.trim()) return;

      setSendingMessage(true);

      const res = await fetch(
        `http://localhost:8888/api/chat/conversation/${conversationId}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + token,
          },
          body: JSON.stringify({
            content: messageInput.trim(),
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || 'Gửi tin nhắn thất bại');
        return;
      }

      setMessages((prev) => [...prev, data.data]);
      setMessageInput('');
      scrollMessagesToBottom();
    } catch (error) {
      console.error(error);
      alert('Có lỗi xảy ra khi gửi tin nhắn');
    } finally {
      setSendingMessage(false);
    }
  };

  const closeChatModal = () => {
    setIsChatOpen(false);
    setChatLoading(false);
    setSendingMessage(false);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f6f6f6',
        paddingBottom: '40px',
      }}
    >
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px' }}>
        {loading ? (
          <div
            style={{
              background: '#fff',
              border: '1px solid #eee',
              padding: '30px',
              textAlign: 'center',
              color: '#666',
            }}
          >
            Đang tải gian hàng...
          </div>
        ) : !seller ? (
          <div
            style={{
              background: '#fff',
              border: '1px solid #eee',
              padding: '30px',
              textAlign: 'center',
              color: '#666',
            }}
          >
            Không tìm thấy gian hàng
          </div>
        ) : (
          <>
            <div
              style={{
                background: '#fff',
                border: '1px solid #eee',
                overflow: 'hidden',
                marginBottom: '20px',
                borderRadius: '16px',
              }}
            >
              <img
                src={displayBanner}
                alt="Shop banner"
                style={{
                  width: '100%',
                  height: '280px',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />

              <div
                style={{
                  padding: '24px 28px',
                  display: 'flex',
                  gap: '24px',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  marginTop: '-40px',
                }}
              >
                <img
                  src={displayAvatar}
                  alt="Shop avatar"
                  style={{
                    width: '110px',
                    height: '110px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '4px solid #fff',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
                    background: '#fff',
                  }}
                />

                <div style={{ flex: 1, minWidth: '280px' }}>
                  <div
                    style={{
                      fontSize: '13px',
                      color: '#ee4d2d',
                      fontWeight: 700,
                      marginBottom: '6px',
                    }}
                  >
                    SHOP PAGE
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      flexWrap: 'wrap',
                      marginBottom: '8px',
                    }}
                  >
                    <h1
                      style={{
                        margin: 0,
                        fontSize: '36px',
                        fontWeight: 800,
                        color: '#222',
                      }}
                    >
                      {displayShopName}
                    </h1>

                    <span
                      style={{
                        background: '#ee4d2d',
                        color: '#fff',
                        padding: '5px 10px',
                        borderRadius: '999px',
                        fontSize: '12px',
                        fontWeight: 700,
                      }}
                    >
                      Shop uy tín
                    </span>
                  </div>

                  <p
                    style={{
                      margin: '0 0 12px',
                      color: '#666',
                      lineHeight: 1.6,
                      maxWidth: '760px',
                    }}
                  >
                    {displayDescription}
                  </p>

                  <div
                    style={{
                      display: 'flex',
                      gap: '12px',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div style={statBadgeStyle}>Sản phẩm: {totalProducts}</div>
                    <div style={statBadgeStyle}>Đã bán: {soldCount}+</div>
                    <div style={statBadgeStyle}>Địa chỉ: {displayAddress}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <button onClick={openChatWithSeller} style={primaryButtonStyle}>
                    Chat shop
                  </button>

                  <button
                    onClick={() => {
                      const el = document.getElementById('shop-products-section');
                      if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }
                    }}
                    style={secondaryButtonStyle}
                  >
                    Xem tất cả sản phẩm
                  </button>
                </div>
              </div>
            </div>

            <div
              style={{
                background: '#fff',
                border: '1px solid #eee',
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '20px',
                boxShadow: '0 6px 18px rgba(0,0,0,0.04)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '18px',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: '13px',
                      color: '#ee4d2d',
                      fontWeight: 700,
                      marginBottom: '4px',
                    }}
                  >
                    BEST SELLERS
                  </div>
                  <div
                    style={{
                      fontSize: '24px',
                      fontWeight: 800,
                      color: '#222',
                    }}
                  >
                    Top sản phẩm bán chạy
                  </div>
                </div>

                <div style={{ color: '#666', fontSize: '14px' }}>
                  Những sản phẩm nổi bật của shop
                </div>
              </div>

              {store.topProducts.length === 0 ? (
                <div style={{ color: '#666' }}>Chưa có dữ liệu bán chạy</div>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                    gap: '16px',
                  }}
                >
                  {store.topProducts.map((product) => {
                    const image =
                      product.thumbnail ||
                      product.images?.[0] ||
                      'https://via.placeholder.com/400x400?text=Product';

                    const finalPrice = product.price;

                    return (
                      <Link
                        key={product.id}
                        to={`/products/${product.id}`}
                        style={{ textDecoration: 'none', color: 'inherit' }}
                      >
                        <div
                          style={{
                            border: '1px solid #eee',
                            background: '#fff',
                            overflow: 'hidden',
                            borderRadius: '14px',
                            boxShadow: '0 6px 18px rgba(0,0,0,0.05)',
                            height: '100%',
                          }}
                        >
                          <img
                            src={image}
                            alt={product.name}
                            style={{
                              width: '100%',
                              aspectRatio: '1 / 1',
                              objectFit: 'cover',
                              display: 'block',
                              background: '#f8f8f8',
                            }}
                          />

                          <div style={{ padding: '16px' }}>
                            <div
                              style={{
                                fontSize: '15px',
                                fontWeight: 600,
                                color: '#222',
                                minHeight: '44px',
                                lineHeight: 1.4,
                                marginBottom: '10px',
                              }}
                            >
                              {product.name}
                            </div>

                            <div
                              style={{
                                display: 'inline-block',
                                marginBottom: '8px',
                                background: '#ecfeff',
                                color: '#0f766e',
                                padding: '4px 8px',
                                borderRadius: '999px',
                                fontSize: '12px',
                                fontWeight: 700,
                              }}
                            >
                              Đã bán: {product.soldCount || 0}
                            </div>

                            <div
                              style={{
                                fontSize: '20px',
                                fontWeight: 800,
                                color: '#ee4d2d',
                              }}
                            >
                              {Number(finalPrice).toLocaleString('vi-VN')} đ
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            <div
              id="shop-products-section"
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) 360px',
                gap: '20px',
                alignItems: 'start',
              }}
            >
              <div
                style={{
                  background: '#fff',
                  border: '1px solid #eee',
                  borderRadius: '16px',
                  padding: '24px',
                  boxShadow: '0 6px 18px rgba(0,0,0,0.04)',
                }}
              >
                <div
                  style={{
                    fontSize: '20px',
                    fontWeight: 800,
                    marginBottom: '18px',
                    color: '#222',
                  }}
                >
                  Sản phẩm của shop
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr 1fr 1fr auto',
                    gap: '12px',
                    marginBottom: '20px',
                    alignItems: 'end',
                  }}
                >
                  <div>
                    <div style={filterLabelStyle}>Tìm theo tên</div>
                    <input
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      placeholder="Nhập tên sản phẩm..."
                      style={filterInputStyle}
                    />
                  </div>

                  <div>
                    <div style={filterLabelStyle}>Giá từ</div>
                    <input
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                      placeholder="0"
                      type="number"
                      style={filterInputStyle}
                    />
                  </div>

                  <div>
                    <div style={filterLabelStyle}>Đến</div>
                    <input
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                      placeholder="99999999"
                      type="number"
                      style={filterInputStyle}
                    />
                  </div>

                  <div>
                    <div style={filterLabelStyle}>Sắp xếp</div>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      style={filterInputStyle}
                    >
                      <option value="newest">Mới nhất</option>
                      <option value="best-selling">Bán chạy</option>
                      <option value="price-asc">Giá thấp đến cao</option>
                      <option value="price-desc">Giá cao đến thấp</option>
                    </select>
                  </div>

                  <button
                    onClick={() => {
                      setSearchText('');
                      setMinPrice('');
                      setMaxPrice('');
                      setSortBy('newest');
                    }}
                    style={{
                      ...secondaryButtonStyle,
                      height: '46px',
                    }}
                  >
                    Xóa lọc
                  </button>
                </div>

                {filteredProducts.length === 0 ? (
                  <div style={{ color: '#666' }}>Shop chưa có sản phẩm nào</div>
                ) : (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                      gap: '18px',
                    }}
                  >
                    {filteredProducts.map((product) => {
                      const image =
                        product.thumbnail ||
                        product.images?.[0] ||
                        'https://via.placeholder.com/400x400?text=Product';

                      const finalPrice = product.price;

                      return (
                        <Link
                          key={product.id}
                          to={`/products/${product.id}`}
                          style={{ textDecoration: 'none', color: 'inherit' }}
                        >
                          <div
                            style={{
                              border: '1px solid #eee',
                              background: '#fff',
                              overflow: 'hidden',
                              borderRadius: '14px',
                              boxShadow: '0 6px 18px rgba(0,0,0,0.05)',
                              height: '100%',
                            }}
                          >
                            <img
                              src={image}
                              alt={product.name}
                              style={{
                                width: '100%',
                                aspectRatio: '1 / 1',
                                objectFit: 'cover',
                                display: 'block',
                                background: '#f8f8f8',
                              }}
                            />

                            <div style={{ padding: '16px' }}>
                              <div
                                style={{
                                  fontSize: '16px',
                                  fontWeight: 600,
                                  color: '#222',
                                  minHeight: '48px',
                                  lineHeight: 1.5,
                                  marginBottom: '10px',
                                }}
                              >
                                {product.name}
                              </div>

                              <div
                                style={{
                                  display: 'inline-block',
                                  marginBottom: '8px',
                                  background: '#fff1f2',
                                  color: '#ef4444',
                                  padding: '4px 8px',
                                  borderRadius: '999px',
                                  fontSize: '12px',
                                  fontWeight: 700,
                                }}
                              >
                                Giá tốt
                              </div>

                              <div
                                style={{
                                  fontSize: '24px',
                                  fontWeight: 800,
                                  color: '#ee4d2d',
                                }}
                              >
                                {Number(finalPrice).toLocaleString('vi-VN')} đ
                              </div>
                            </div>
                          </div>
                        </Link>
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
                  borderRadius: '16px',
                  boxShadow: '0 6px 18px rgba(0,0,0,0.04)',
                }}
              >
                <div
                  style={{
                    fontSize: '20px',
                    fontWeight: 800,
                    marginBottom: '18px',
                    color: '#222',
                  }}
                >
                  Thông tin shop
                </div>

                <InfoRow label="Tên shop" value={displayShopName} />
                <InfoRow label="Số điện thoại" value={displayPhone} />
                <InfoRow label="Địa chỉ" value={displayAddress} />
                <InfoRow label="Số sản phẩm" value={String(totalProducts)} />
                <InfoRow label="Đã bán" value={`${soldCount}+`} />
              </div>
            </div>
          </>
        )}
      </div>

      {isChatOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.45)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '560px',
              height: '700px',
              background: '#fff',
              borderRadius: '22px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 30px 80px rgba(0,0,0,0.25)',
            }}
          >
            <div
              style={{
                padding: '18px 20px',
                borderBottom: '1px solid #eef2f7',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background:
                  'linear-gradient(135deg, rgba(20,184,166,0.08), rgba(34,197,94,0.04))',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <img
                  src={displayAvatar}
                  alt="Shop avatar"
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '2px solid #fff',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
                  }}
                />

                <div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#222' }}>
                    Chat với shop
                  </div>
                  <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>
                    {displayShopName}
                  </div>
                </div>
              </div>

              <button
                onClick={closeChatModal}
                style={{
                  background: '#fff',
                  border: '1px solid #e5e7eb',
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#666',
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>

            <div
              style={{
                flex: 1,
                padding: '16px',
                overflowY: 'auto',
                background:
                  'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
              }}
            >
              {chatLoading ? (
                <div style={centerStateStyle}>
                  <div style={stateTitleStyle}>Đang tải cuộc trò chuyện...</div>
                  <div style={stateSubStyle}>Vui lòng chờ một chút</div>
                </div>
              ) : messages.length === 0 ? (
                <div style={centerStateStyle}>
                  <div style={stateTitleStyle}>Chưa có tin nhắn nào</div>
                  <div style={stateSubStyle}>
                    Hãy gửi tin nhắn đầu tiên cho shop
                  </div>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.senderRole === 'customer';

                  return (
                    <div
                      key={msg.id}
                      style={{
                        display: 'flex',
                        justifyContent: isMine ? 'flex-end' : 'flex-start',
                        marginBottom: '12px',
                      }}
                    >
                      <div
                        style={{
                          maxWidth: '76%',
                          background: isMine
                            ? 'linear-gradient(135deg, #14b8a6, #0f766e)'
                            : '#fff',
                          color: isMine ? '#fff' : '#222',
                          padding: '11px 14px',
                          borderRadius: isMine
                            ? '16px 16px 4px 16px'
                            : '16px 16px 16px 4px',
                          boxShadow: '0 6px 18px rgba(0,0,0,0.08)',
                          fontSize: '14px',
                          lineHeight: 1.55,
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                        }}
                      >
                        <div>{msg.content}</div>
                        <div
                          style={{
                            fontSize: '11px',
                            marginTop: '6px',
                            opacity: isMine ? 0.9 : 0.55,
                            textAlign: 'right',
                          }}
                        >
                          {new Date(msg.createdAt).toLocaleTimeString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              <div ref={messagesEndRef} />
            </div>

            <div
              style={{
                borderTop: '1px solid #eef2f7',
                padding: '14px',
                display: 'flex',
                gap: '10px',
                background: '#fff',
              }}
            >
              <input
                type="text"
                placeholder="Nhập tin nhắn..."
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                style={{
                  flex: 1,
                  border: '1px solid #d1d5db',
                  borderRadius: '14px',
                  padding: '13px 14px',
                  fontSize: '14px',
                  outline: 'none',
                  background: '#f8fafc',
                }}
              />

              <button
                onClick={handleSendMessage}
                disabled={sendingMessage}
                style={{
                  background: 'linear-gradient(135deg, #14b8a6, #0f766e)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '14px',
                  padding: '0 20px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  opacity: sendingMessage ? 0.7 : 1,
                  minWidth: '82px',
                }}
              >
                {sendingMessage ? '...' : 'Gửi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <div
    style={{
      padding: '12px 0',
      borderBottom: '1px solid #f1f1f1',
    }}
  >
    <div
      style={{
        fontSize: '13px',
        color: '#888',
        marginBottom: '4px',
      }}
    >
      {label}
    </div>
    <div
      style={{
        fontSize: '15px',
        color: '#222',
        fontWeight: 600,
        lineHeight: 1.5,
      }}
    >
      {value}
    </div>
  </div>
);

const statBadgeStyle: React.CSSProperties = {
  background: '#f8fafc',
  border: '1px solid #e5e7eb',
  color: '#334155',
  padding: '8px 12px',
  borderRadius: '999px',
  fontSize: '13px',
  fontWeight: 600,
};

const primaryButtonStyle: React.CSSProperties = {
  background: '#14b8a6',
  color: '#fff',
  border: 'none',
  padding: '12px 18px',
  borderRadius: '10px',
  fontWeight: 700,
  cursor: 'pointer',
};

const secondaryButtonStyle: React.CSSProperties = {
  background: '#fff',
  color: '#111827',
  border: '1px solid #d1d5db',
  padding: '12px 18px',
  borderRadius: '10px',
  fontWeight: 700,
  cursor: 'pointer',
};

const filterLabelStyle: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: 600,
  color: '#555',
  marginBottom: '6px',
};

const filterInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  border: '1px solid #d1d5db',
  borderRadius: '10px',
  fontSize: '14px',
  outline: 'none',
  boxSizing: 'border-box',
  background: '#fff',
};

const centerStateStyle: React.CSSProperties = {
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  color: '#64748b',
};

const stateTitleStyle: React.CSSProperties = {
  fontSize: '18px',
  fontWeight: 800,
  color: '#334155',
  marginBottom: '6px',
};

const stateSubStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#64748b',
};

export default SellerStorePage;