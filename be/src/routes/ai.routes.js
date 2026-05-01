const express = require('express');
const axios = require('axios');

const router = express.Router();
const AI_BASE_URL = 'http://127.0.0.1:5001';

// =========================
// RECOMMEND
// =========================
router.get('/recommend/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const response = await axios.get(`${AI_BASE_URL}/recommend/${userId}`);

    return res.json({
      type: 'recommend',
      products: response.data,
      suggestions: [
        'Xem sản phẩm rẻ hơn',
        'Giày dưới 500k',
        'Có mẫu nào đẹp hơn không',
      ],
    });
  } catch (error) {
    console.error('AI recommend error:', error.response?.data || error.message);
    return res.status(500).json({
      status: 'error',
      message: 'Lỗi gọi AI recommend',
    });
  }
});

// =========================
// SEARCH
// =========================
router.get('/search', async (req, res) => {
  try {
    const q = req.query.q || '';
    const response = await axios.get(`${AI_BASE_URL}/search`, {
      params: { q },
    });

    return res.json(response.data);
  } catch (error) {
    console.error('AI search error:', error.response?.data || error.message);
    return res.status(500).json({
      status: 'error',
      message: 'Lỗi gọi AI search',
    });
  }
});

// =========================
// CHAT (FAQ)
// =========================
router.post('/chat', async (req, res) => {
  try {
    const response = await axios.post(`${AI_BASE_URL}/chat`, req.body);

    return res.json({
      type: 'chat',
      message: response.data.answer,
      score: response.data.score,
      suggestions: [
        'Giày dưới 500k',
        'Gợi ý cho tôi',
        'Sản phẩm bán chạy',
      ],
    });
  } catch (error) {
    console.error('AI chat error:', error.response?.data || error.message);
    return res.status(500).json({
      status: 'error',
      message: 'Lỗi gọi AI chat',
    });
  }
});

// =========================
// ASSISTANT (MAIN)
// =========================
router.post('/assistant', async (req, res) => {
  try {
    const { message, user_id } = req.body || {};

    if (!message || !String(message).trim()) {
      return res.status(400).json({
        status: 'error',
        message: 'Thiếu message',
      });
    }

    // 👉 1. Detect intent
    const intentRes = await axios.post(`${AI_BASE_URL}/intent`, {
      message,
    });

    const intent = intentRes.data.intent;
    const intentScore = intentRes.data.score;

    // =========================
    // FAQ
    // =========================
    if (intent === 'faq') {
      const response = await axios.post(`${AI_BASE_URL}/chat`, {
        question: message,
      });

      return res.json({
        type: 'chat',
        intent: 'faq',
        intent_score: intentScore,
        message: response.data.answer,
        score: response.data.score,
        suggestions: [
          'Giày dưới 500k',
          'Gợi ý cho tôi',
          'Sản phẩm bán chạy',
        ],
      });
    }

    // =========================
    // RECOMMEND
    // =========================
    if (intent === 'recommend') {
      const response = await axios.get(
        `${AI_BASE_URL}/recommend/${user_id || 1}`
      );

      return res.json({
        type: 'recommend',
        intent: 'personal_recommendation',
        intent_score: intentScore,
        message: 'Đây là một số sản phẩm gợi ý cho bạn:',
        products: response.data,
        suggestions: [
          'Xem sản phẩm rẻ hơn',
          'Giày dưới 500k',
          'Có mẫu nào đẹp hơn không',
        ],
      });
    }

    // =========================
    // SEARCH (DEFAULT)
    // =========================
    const response = await axios.get(`${AI_BASE_URL}/search`, {
      params: { q: message },
    });

    const products = response.data;
    let msg = '';
    let suggestions = [];

    if (!products.length) {
      msg = 'Mình chưa tìm thấy sản phẩm phù hợp.';
      suggestions = [
        'Gợi ý cho tôi',
        'Sản phẩm bán chạy',
        'Giày dưới 500k',
      ];
    } else {
      msg = `Mình tìm thấy ${products.length} sản phẩm phù hợp:\n\n`;

      products.slice(0, 3).forEach((p, i) => {
        msg += `${i + 1}. ${p.name} - ${Number(p.price).toLocaleString('vi-VN')}đ\n`;
      });

      msg += '\n👉 Bạn muốn:\n';
      msg += '- Xem sản phẩm tương tự\n';
      msg += '- Xem giá rẻ hơn\n';
      msg += '- Xem mẫu cao cấp hơn';

      suggestions = [
        'Xem sản phẩm tương tự',
        'Xem giá rẻ hơn',
        'Xem mẫu cao cấp hơn',
      ];
    }

    return res.json({
      type: 'search',
      intent: 'product_search',
      intent_score: intentScore,
      message: msg,
      products,
      suggestions,
    });
  } catch (error) {
    console.error('AI assistant error:', error.response?.data || error.message);
    return res.status(500).json({
      status: 'error',
      message: 'Lỗi gọi AI assistant',
    });
  }
});

module.exports = router;