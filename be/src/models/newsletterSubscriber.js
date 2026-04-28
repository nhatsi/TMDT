const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const NewsletterSubscriber = sequelize.define(
  'NewsletterSubscriber',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    status: {
      type: DataTypes.ENUM('active', 'unsubscribed'),
      defaultValue: 'active',
    },
  },
  {
    tableName: 'newsletter_subscribers',
    timestamps: true,
  }
);

module.exports = NewsletterSubscriber;
