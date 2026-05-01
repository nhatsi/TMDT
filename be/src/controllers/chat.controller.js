const { Conversation, Message, User } = require('../models');
const { AppError } = require('../middlewares/errorHandler');

// Tạo hoặc lấy conversation giữa customer và seller
const createOrGetConversation = async (req, res, next) => {
  try {
    const customerId = req.user.id;
    const { sellerId } = req.body;

    if (!sellerId) {
      throw new AppError('Thiếu sellerId', 400);
    }

    if (customerId === sellerId) {
      throw new AppError('Không thể tự chat với chính mình', 400);
    }

    const seller = await User.findByPk(sellerId);

    if (!seller) {
      throw new AppError('Không tìm thấy seller', 404);
    }

    let conversation = await Conversation.findOne({
      where: {
        customerId,
        sellerId,
      },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        customerId,
        sellerId,
      });
    }

    res.status(200).json({
      status: 'success',
      data: conversation,
    });
  } catch (error) {
    next(error);
  }
};

// Lấy tin nhắn của 1 conversation
const getConversationMessages = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;

    const conversation = await Conversation.findByPk(conversationId);

    if (!conversation) {
      throw new AppError('Không tìm thấy cuộc trò chuyện', 404);
    }

    if (
      conversation.customerId !== userId &&
      conversation.sellerId !== userId
    ) {
      throw new AppError('Bạn không có quyền xem cuộc trò chuyện này', 403);
    }

    const messages = await Message.findAll({
      where: { conversationId },
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
      ],
      order: [['createdAt', 'ASC']],
    });

    res.status(200).json({
      status: 'success',
      data: messages,
    });
  } catch (error) {
    next(error);
  }
};

// Gửi tin nhắn
const sendMessage = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      throw new AppError('Nội dung tin nhắn không được để trống', 400);
    }

    const conversation = await Conversation.findByPk(conversationId);

    if (!conversation) {
      throw new AppError('Không tìm thấy cuộc trò chuyện', 404);
    }

    let senderRole = null;

    if (conversation.customerId === userId) {
      senderRole = 'customer';
    } else if (conversation.sellerId === userId) {
      senderRole = 'seller';
    } else {
      throw new AppError('Bạn không có quyền gửi tin nhắn trong cuộc trò chuyện này', 403);
    }

    const message = await Message.create({
      conversationId,
      senderId: userId,
      senderRole,
      content: content.trim(),
      isRead: false,
    });

    const fullMessage = await Message.findByPk(message.id, {
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
      ],
    });

    res.status(201).json({
      status: 'success',
      data: fullMessage,
    });
  } catch (error) {
    next(error);
  }
};

// Seller lấy danh sách conversation của mình
const getSellerConversations = async (req, res, next) => {
  try {
    const sellerId = req.user.id;

    const conversations = await Conversation.findAll({
      where: { sellerId },
      include: [
        {
          model: User,
          as: 'customer',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
        {
          model: Message,
          as: 'messages',
          separate: true,
          limit: 1,
          order: [['createdAt', 'DESC']],
        },
      ],
      order: [['updatedAt', 'DESC']],
    });

    res.status(200).json({
      status: 'success',
      data: conversations,
    });
  } catch (error) {
    next(error);
  }
};

// Customer lấy danh sách conversation của mình
const getCustomerConversations = async (req, res, next) => {
  try {
    const customerId = req.user.id;

    const conversations = await Conversation.findAll({
      where: { customerId },
      include: [
        {
          model: User,
          as: 'seller',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
        {
          model: Message,
          as: 'messages',
          separate: true,
          limit: 1,
          order: [['createdAt', 'DESC']],
        },
      ],
      order: [['updatedAt', 'DESC']],
    });

    res.status(200).json({
      status: 'success',
      data: conversations,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOrGetConversation,
  getConversationMessages,
  sendMessage,
  getSellerConversations,
  getCustomerConversations,
};