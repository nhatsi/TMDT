const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const Message = sequelize.define(
  'Message',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    conversationId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'conversation_id',
    },
    senderId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'sender_id',
    },
    senderRole: {
      type: DataTypes.ENUM('customer', 'seller'),
      allowNull: false,
      field: 'sender_role',
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_read',
    },
  },
  {
    tableName: 'messages',
    underscored: true,
    timestamps: true,
  }
);

module.exports = Message;