const express = require('express');
const chatController = require('../controllers/chat.controller');
const { authenticate } = require('../middlewares/authenticate');

const router = express.Router();

router.use(authenticate);

// Customer tạo hoặc lấy conversation với seller
router.post('/conversation', chatController.createOrGetConversation);

// Lấy danh sách conversation của seller
router.get('/seller/conversations', chatController.getSellerConversations);

// Lấy danh sách conversation của customer
router.get('/customer/conversations', chatController.getCustomerConversations);

// Lấy tin nhắn của 1 conversation
router.get(
  '/conversation/:conversationId/messages',
  chatController.getConversationMessages
);

// Gửi tin nhắn trong 1 conversation
router.post(
  '/conversation/:conversationId/messages',
  chatController.sendMessage
);

module.exports = router;