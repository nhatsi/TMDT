'use strict';

const sequelize = require('../config/sequelize');

// Ensure all models are registered before syncing
require('../models');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up() {
    /**
     * Use the existing Sequelize model definitions to create all tables.
     * This keeps the migration logic in sync with the current models
     * and only runs once at the beginning of the migration chain.
     */
    try {
      await sequelize.sync({ force: false });
    } finally {
      await sequelize.close();
    }
  },

  async down() {
    /**
     * Drop every model-defined table. This is primarily for completeness;
     * it is uncommon to roll back the initial schema in production.
     */
    const queryInterface = sequelize.getQueryInterface();
    try {
      await queryInterface.dropAllTables();
    } finally {
      await sequelize.close();
    }
  },
};
