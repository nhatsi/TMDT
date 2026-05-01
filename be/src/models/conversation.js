const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const Conversation = sequelize.define(
  'Conversation',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    customerId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'customer_id',
    },
    sellerId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'seller_id',
    },
  },
  {
    tableName: 'conversations',
    underscored: true,
    timestamps: true,
  }
);

module.exports = Conversation;