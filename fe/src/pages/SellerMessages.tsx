import { useEffect, useRef, useState } from 'react';

type ConversationItem = {
  id: string;
  customerId: string;
  sellerId: string;
  createdAt: string;
  updatedAt: string;
  customer?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  };
  messages?: {
    id: string;
    content: string;
    createdAt: string;
  }[];
};

type MessageItem = {
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

const SellerMessages = () => {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [selectedConversation, setSelectedConversation] =
    useState<ConversationItem | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const token = localStorage.getItem('token');

  const scrollMessagesToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  useEffect(() => {
    scrollMessagesToBottom();
  }, [messages]);

  useEffect(() => {
    if (!selectedConversation || !token) return;

    const interval = setInterval(() => {
      loadMessages(selectedConversation.id, false);
    }, 4000);

    return () => clearInterval(interval);
  }, [selectedConversation, token]);

  const loadConversations = async () => {
    try {
      setLoading(true);

      const res = await fetch(
        'http://localhost:8888/api/chat/seller/conversations',
        {
          headers: {
            Authorization: 'Bearer ' + token,
          },
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || 'Không tải được danh sách cuộc trò chuyện');
        return;
      }

      setConversations(data.data || []);

      if (data.data && data.data.length > 0 && !selectedConversation) {
        setSelectedConversation(data.data[0]);
        loadMessages(data.data[0].id, true);
      }
    } catch (error) {
      console.error(error);
      alert('Có lỗi xảy ra khi tải cuộc trò chuyện');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId: string, showError = true) => {
    try {
      setMessagesLoading(true);

      const res = await fetch(
        `http://localhost:8888/api/chat/conversation/${conversationId}/messages`,
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
    } finally {
      setMessagesLoading(false);
    }
  };

  const handleSelectConversation = (conversation: ConversationItem) => {
    setSelectedConversation(conversation);
    loadMessages(conversation.id, true);
  };

  const handleSendMessage = async () => {
    try {
      if (!selectedConversation) return;
      if (!messageInput.trim()) return;

      setSending(true);

      const res = await fetch(
        `http://localhost:8888/api/chat/conversation/${selectedConversation.id}/messages`,
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
      loadConversations();
      scrollMessagesToBottom();
    } catch (error) {
      console.error(error);
      alert('Có lỗi xảy ra khi gửi tin nhắn');
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f6f6f6',
        padding: '24px',
      }}
    >
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        <div
          style={{
            background: '#fff',
            border: '1px solid #eee',
            padding: '20px 24px',
            marginBottom: '20px',
            borderRadius: '16px',
            boxShadow: '0 6px 18px rgba(0,0,0,0.04)',
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
            Tin nhắn khách hàng
          </h1>

          <p style={{ margin: '8px 0 0', color: '#666' }}>
            Quản lý hội thoại và phản hồi khách hàng của shop bạn
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '360px minmax(0, 1fr)',
            gap: '20px',
            alignItems: 'start',
          }}
        >
          <div
            style={{
              background: '#fff',
              border: '1px solid #eee',
              borderRadius: '18px',
              overflow: 'hidden',
              minHeight: '680px',
              boxShadow: '0 6px 18px rgba(0,0,0,0.04)',
            }}
          >
            <div
              style={{
                padding: '18px',
                borderBottom: '1px solid #eef2f7',
                fontSize: '22px',
                fontWeight: 800,
                color: '#222',
              }}
            >
              Cuộc trò chuyện
            </div>

            <div>
              {loading ? (
                <div style={{ padding: '18px', color: '#666' }}>
                  Đang tải hội thoại...
                </div>
              ) : conversations.length === 0 ? (
                <div style={emptyBoxStyle}>
                  <div style={emptyTitleStyle}>Chưa có khách nào nhắn tin</div>
                  <div style={emptySubStyle}>
                    Khi khách bắt đầu chat, hội thoại sẽ hiện ở đây
                  </div>
                </div>
              ) : (
                conversations.map((conversation) => {
                  const customerName = `${conversation.customer?.firstName || ''} ${
                    conversation.customer?.lastName || ''
                  }`.trim();

                  const lastMessage = conversation.messages?.[0]?.content || '';
                  const isActive = selectedConversation?.id === conversation.id;

                  return (
                    <button
                      key={conversation.id}
                      onClick={() => handleSelectConversation(conversation)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '16px 18px',
                        border: 'none',
                        borderBottom: '1px solid #f3f4f6',
                        background: isActive ? '#ecfeff' : '#fff',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '15px',
                          fontWeight: 800,
                          color: '#111827',
                          marginBottom: '6px',
                        }}
                      >
                        {customerName || conversation.customer?.email || 'Khách hàng'}
                      </div>

                      <div
                        style={{
                          fontSize: '13px',
                          color: '#6b7280',
                          lineHeight: 1.5,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {lastMessage || 'Chưa có tin nhắn'}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div
            style={{
              background: '#fff',
              border: '1px solid #eee',
              borderRadius: '18px',
              overflow: 'hidden',
              minHeight: '680px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 6px 18px rgba(0,0,0,0.04)',
            }}
          >
            <div
              style={{
                padding: '18px 20px',
                borderBottom: '1px solid #eef2f7',
                background:
                  'linear-gradient(135deg, rgba(20,184,166,0.08), rgba(34,197,94,0.04))',
              }}
            >
              {selectedConversation ? (
                <>
                  <div
                    style={{
                      fontSize: '20px',
                      fontWeight: 800,
                      color: '#222',
                    }}
                  >
                    {`${selectedConversation.customer?.firstName || ''} ${
                      selectedConversation.customer?.lastName || ''
                    }`.trim() ||
                      selectedConversation.customer?.email ||
                      'Khách hàng'}
                  </div>

                  <div
                    style={{
                      fontSize: '13px',
                      color: '#666',
                      marginTop: '4px',
                    }}
                  >
                    {selectedConversation.customer?.email || ''}
                  </div>
                </>
              ) : (
                <div
                  style={{
                    fontSize: '16px',
                    fontWeight: 700,
                    color: '#666',
                  }}
                >
                  Chọn một cuộc trò chuyện
                </div>
              )}
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
              {!selectedConversation ? (
                <div style={emptyBoxStyle}>
                  <div style={emptyTitleStyle}>Chưa chọn cuộc trò chuyện</div>
                  <div style={emptySubStyle}>Hãy chọn một khách hàng ở bên trái</div>
                </div>
              ) : messagesLoading ? (
                <div style={emptyBoxStyle}>
                  <div style={emptyTitleStyle}>Đang tải tin nhắn...</div>
                </div>
              ) : messages.length === 0 ? (
                <div style={emptyBoxStyle}>
                  <div style={emptyTitleStyle}>Chưa có tin nhắn nào</div>
                  <div style={emptySubStyle}>Hãy bắt đầu phản hồi khách hàng</div>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.senderRole === 'seller';

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
                          maxWidth: '75%',
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

            {selectedConversation && (
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
                  placeholder="Nhập phản hồi cho khách hàng..."
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
                  disabled={sending}
                  style={{
                    background: 'linear-gradient(135deg, #14b8a6, #0f766e)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '14px',
                    padding: '0 20px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    opacity: sending ? 0.7 : 1,
                    minWidth: '84px',
                  }}
                >
                  {sending ? '...' : 'Gửi'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const emptyBoxStyle: React.CSSProperties = {
  height: '100%',
  minHeight: '220px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  color: '#64748b',
  padding: '20px',
};

const emptyTitleStyle: React.CSSProperties = {
  fontSize: '18px',
  fontWeight: 800,
  color: '#334155',
  marginBottom: '6px',
};

const emptySubStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#64748b',
};

export default SellerMessages;