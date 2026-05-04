import React, { useMemo, useRef, useState } from 'react';

type Product = {
  product_id: number;
  name: string;
  category?: string;
  price?: number;
  score?: number;
  rank_score?: number;
  reason?: string;
  description?: string;
};

type AIResponse = {
  type?: 'chat' | 'search' | 'recommend' | 'error';
  intent?: string;
  intent_score?: number;
  message?: string;
  answer?: string;
  score?: number;
  products?: Product[];
  suggestions?: string[];
  status?: string;
};

type ChatMessage = {
  role: 'user' | 'assistant';
  text: string;
  products?: Product[];
  suggestions?: string[];
};

async function askAssistant(message: string, userId: number | null = 1): Promise<AIResponse> {
  const res = await fetch('http://localhost:8888/api/ai/assistant', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message,
      user_id: userId,
    }),
  });

  return await res.json();
}

function formatPrice(price?: number) {
  if (price == null) return '';
  return `${price.toLocaleString('vi-VN')}đ`;
}

const ChatAI: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      text: 'Xin chào, mình là AI Shop Assistant. Bạn có thể hỏi về sản phẩm, xin gợi ý hoặc hỏi chính sách shop.',
      suggestions: ['Giày dưới 500k', 'Gợi ý cho tôi', 'Có COD không'],
    },
  ]);

  const chatBodyRef = useRef<HTMLDivElement | null>(null);

  const canSend = useMemo(() => message.trim().length > 0 && !loading, [message, loading]);

  const scrollToBottom = () => {
    setTimeout(() => {
      if (chatBodyRef.current) {
        chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
      }
    }, 50);
  };

  const sendMessage = async (rawMessage: string) => {
    const trimmed = rawMessage.trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessage = {
      role: 'user',
      text: trimmed,
    };

    setMessages((prev) => [...prev, userMsg]);
    setMessage('');
    setLoading(true);
    scrollToBottom();

    try {
      const data = await askAssistant(trimmed, 1);

      let assistantText = 'Mình chưa xử lý được yêu cầu này.';
      let products: Product[] | undefined = undefined;
      let suggestions: string[] | undefined = undefined;

      if (data.type === 'chat') {
        assistantText = data.message || data.answer || 'Mình chưa có câu trả lời phù hợp.';
        suggestions = data.suggestions || [];
      } else if (data.type === 'search') {
        assistantText = data.message || 'Mình đã tìm thấy một số sản phẩm phù hợp.';
        products = data.products || [];
        suggestions = data.suggestions || [];
      } else if (data.type === 'recommend') {
        assistantText = data.message || 'Mình có một vài gợi ý cho bạn.';
        products = data.products || [];
        suggestions = data.suggestions || [];
      } else if (data.type === 'error' || data.status === 'error') {
        assistantText = data.message || 'Có lỗi xảy ra khi gọi AI assistant.';
      }

      const assistantMsg: ChatMessage = {
        role: 'assistant',
        text: assistantText,
        products,
        suggestions,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      scrollToBottom();
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: 'Không kết nối được tới AI assistant.',
        },
      ]);
      scrollToBottom();
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    await sendMessage(message);
  };

  const handleSuggestionClick = async (suggestion: string) => {
    await sendMessage(suggestion);
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen((prev) => !prev)}
        style={{
          position: 'fixed',
          left: 20,
          bottom: 20,
          width: 58,
          height: 58,
          borderRadius: '50%',
          border: 'none',
          background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
          color: '#fff',
          cursor: 'pointer',
          boxShadow: '0 10px 24px rgba(79, 70, 229, 0.35)',
          zIndex: 9999,
          fontSize: 24,
        }}
        title="AI Shop Assistant"
      >
        🤖
      </button>

      {open && (
        <div
          style={{
            position: 'fixed',
            left: 20,
            bottom: 88,
            width: 360,
            height: 520,
            background: '#fff',
            borderRadius: 18,
            overflow: 'hidden',
            boxShadow: '0 18px 45px rgba(0,0,0,0.22)',
            border: '1px solid rgba(0,0,0,0.08)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              padding: '14px 16px',
              background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>AI Shop Assistant</div>
              <div style={{ fontSize: 12, opacity: 0.9 }}>Tư vấn sản phẩm và hỗ trợ shop</div>
            </div>

            <button
              onClick={() => setOpen(false)}
              style={{
                border: 'none',
                background: 'transparent',
                color: '#fff',
                cursor: 'pointer',
                fontSize: 18,
              }}
            >
              ✕
            </button>
          </div>

          <div
            ref={chatBodyRef}
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: 14,
              background: '#f8fafc',
            }}
          >
            {messages.map((msg, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  marginBottom: 12,
                }}
              >
                <div style={{ maxWidth: '82%' }}>
                  <div
                    style={{
                      padding: '10px 12px',
                      borderRadius: 14,
                      background: msg.role === 'user' ? '#4f46e5' : '#fff',
                      color: msg.role === 'user' ? '#fff' : '#111827',
                      border: msg.role === 'user' ? 'none' : '1px solid #e5e7eb',
                      boxShadow: msg.role === 'user' ? 'none' : '0 2px 10px rgba(0,0,0,0.04)',
                      whiteSpace: 'pre-wrap',
                      fontSize: 14,
                      lineHeight: 1.5,
                    }}
                  >
                    {msg.text}
                  </div>

                  {msg.products && msg.products.length > 0 && (
                    <div style={{ marginTop: 8, display: 'grid', gap: 8 }}>
                      {msg.products.slice(0, 3).map((p) => (
                        <div
                          key={p.product_id}
                          style={{
                            background: '#fff',
                            border: '1px solid #e5e7eb',
                            borderRadius: 12,
                            padding: 10,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                          }}
                        >
                          <div
                            style={{
                              fontWeight: 600,
                              fontSize: 14,
                              color: '#111827',
                              marginBottom: 4,
                            }}
                          >
                            {p.name}
                          </div>

                          <div
                            style={{
                              fontSize: 12,
                              color: '#6b7280',
                              marginBottom: 6,
                            }}
                          >
                            {p.category || 'Sản phẩm'}
                          </div>

                          <div
                            style={{
                              fontSize: 14,
                              fontWeight: 700,
                              color: '#dc2626',
                            }}
                          >
                            {formatPrice(p.price)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {msg.suggestions && msg.suggestions.length > 0 && (
                    <div
                      style={{
                        marginTop: 8,
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 8,
                      }}
                    >
                      {msg.suggestions.map((suggestion, i) => (
                        <button
                          key={`${suggestion}-${i}`}
                          onClick={() => handleSuggestionClick(suggestion)}
                          disabled={loading}
                          style={{
                            border: '1px solid #c7d2fe',
                            background: '#eef2ff',
                            color: '#4338ca',
                            borderRadius: 999,
                            padding: '6px 10px',
                            fontSize: 12,
                            cursor: loading ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div
                  style={{
                    background: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: 14,
                    padding: '10px 12px',
                    fontSize: 14,
                    color: '#6b7280',
                  }}
                >
                  Đang xử lý...
                </div>
              </div>
            )}
          </div>

          <div
            style={{
              borderTop: '1px solid #e5e7eb',
              background: '#fff',
              padding: 12,
            }}
          >
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Hỏi về sản phẩm, COD, gợi ý..."
                style={{
                  flex: 1,
                  border: '1px solid #d1d5db',
                  borderRadius: 12,
                  padding: '10px 12px',
                  outline: 'none',
                  fontSize: 14,
                }}
              />

              <button
                onClick={handleSend}
                disabled={!canSend}
                style={{
                  border: 'none',
                  borderRadius: 12,
                  padding: '0 16px',
                  background: canSend ? '#4f46e5' : '#c7d2fe',
                  color: '#fff',
                  cursor: canSend ? 'pointer' : 'not-allowed',
                  fontWeight: 600,
                }}
              >
                Gửi
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatAI;