const stripeService = require('../services/payment/stripeService');
const {
  Order,
  User,
  OrderItem,
  Product,
  ProductVariant,
  Cart,
  CartItem,
} = require('../models');
const { AppError } = require('../middlewares/errorHandler');
const { Op } = require('sequelize');

// Helper: parse orderIds from Stripe metadata
const parseOrderIdsFromPaymentIntent = (paymentIntent) => {
  if (paymentIntent.metadata && paymentIntent.metadata.orderIds) {
    try {
      const parsed = JSON.parse(paymentIntent.metadata.orderIds);

      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch (error) {
      console.error('Cannot parse orderIds metadata:', error);
    }
  }

  if (paymentIntent.metadata && paymentIntent.metadata.orderId) {
    return [paymentIntent.metadata.orderId];
  }

  return [];
};

// Helper: reduce inventory for multiple orders
const reduceInventoryForOrders = async (orderIds) => {
  if (!orderIds || orderIds.length === 0) {
    return;
  }

  const orderItems = await OrderItem.findAll({
    where: {
      orderId: orderIds,
    },
  });

  for (const item of orderItems) {
    if (item.variantId) {
      await ProductVariant.decrement(
        { stockQuantity: item.quantity },
        { where: { id: item.variantId } }
      );
    } else {
      await Product.decrement(
        { stockQuantity: item.quantity },
        { where: { id: item.productId } }
      );

      const product = await Product.findByPk(item.productId);
      if (product && product.stockQuantity <= 0) {
        await product.update({ inStock: false });
      }
    }
  }
};

// Helper: clear user cart after successful payment
const clearUserCart = async (userId) => {
  try {
    const cart = await Cart.findOne({
      where: { userId, status: 'active' },
    });

    if (cart) {
      await cart.update({ status: 'converted' });

      await CartItem.destroy({
        where: { cartId: cart.id },
      });

      console.log(`Cart cleared for user ${userId}`);
    }
  } catch (error) {
    console.error(`Error clearing cart for user ${userId}:`, error);
  }
};

// Create payment intent
const createPaymentIntent = async (req, res, next) => {
  try {
    const { amount, currency = 'usd', orderId, orderIds } = req.body;
    const userId = req.user.id;

    if (!amount || amount <= 0) {
      throw new AppError('Invalid amount', 400);
    }

    const normalizedOrderIds =
      Array.isArray(orderIds) && orderIds.length > 0
        ? orderIds
        : orderId
          ? [orderId]
          : [];

    console.log('Creating payment intent with metadata:', {
      userId,
      orderId: orderId || '',
      orderIds: normalizedOrderIds,
    });

    const paymentIntent = await stripeService.createPaymentIntent({
      amount,
      currency,
      metadata: {
        userId: String(userId),
        orderId: normalizedOrderIds[0]
          ? String(normalizedOrderIds[0])
          : orderId
            ? String(orderId)
            : '',
        orderIds: JSON.stringify(normalizedOrderIds),
      },
    });

    console.log('Payment intent created:', {
      id: paymentIntent.paymentIntentId,
      metadata: paymentIntent.metadata,
    });

    res.status(200).json({
      status: 'success',
      data: paymentIntent,
    });
  } catch (error) {
    next(error);
  }
};

// Confirm payment
const confirmPayment = async (req, res, next) => {
  try {
    const { paymentIntentId } = req.body;

    if (!paymentIntentId) {
      throw new AppError('Payment intent ID is required', 400);
    }

    const paymentIntent =
      await stripeService.confirmPaymentIntent(paymentIntentId);

    console.log('Payment Intent Retrieved:', {
      id: paymentIntent.id,
      status: paymentIntent.status,
      metadata: paymentIntent.metadata,
    });

    const orderIds = parseOrderIdsFromPaymentIntent(paymentIntent);

    if (orderIds.length > 0) {
      console.log('Updating orders:', orderIds);
      console.log('Payment Intent Status:', paymentIntent.status);

      const existingOrders = await Order.findAll({
        where: {
          id: orderIds,
        },
      });

      console.log(
        'Existing orders found:',
        existingOrders.map((order) => ({
          id: order.id,
          number: order.number,
          currentStatus: order.status,
          currentPaymentStatus: order.paymentStatus,
        }))
      );

      if (existingOrders.length > 0 && paymentIntent.status === 'succeeded') {
        const unpaidOrders = existingOrders.filter(
          (order) => order.paymentStatus !== 'paid'
        );

        const unpaidOrderIds = unpaidOrders.map((order) => order.id);

        if (unpaidOrderIds.length > 0) {
          const updateResult = await Order.update(
            {
              status: 'processing',
              paymentStatus: 'paid',
              paymentTransactionId: paymentIntent.id,
              paymentProvider: 'stripe',
              updatedAt: new Date(),
            },
            {
              where: {
                id: unpaidOrderIds,
              },
            }
          );

          console.log('Orders update result:', updateResult);

          await reduceInventoryForOrders(unpaidOrderIds);

          console.log(
            `Inventory reduced for orders ${unpaidOrderIds.join(
              ', '
            )} after Stripe payment confirmation`
          );
        } else {
          console.log('All orders already paid, skip inventory reduction');
        }

        await clearUserCart(existingOrders[0].userId);
      } else if (existingOrders.length === 0) {
        console.log('Orders not found for IDs:', orderIds);
      } else {
        console.log('Payment not succeeded, status:', paymentIntent.status);
      }
    } else {
      console.log('No orderIds found in payment intent metadata');
    }

    res.status(200).json({
      status: 'success',
      data: {
        paymentIntent: {
          id: paymentIntent.id,
          status: paymentIntent.status,
          amount:
            paymentIntent.currency === 'vnd'
              ? paymentIntent.amount
              : paymentIntent.amount / 100,
          currency: paymentIntent.currency,
          orderIds,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// Create customer
const createCustomer = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const user = await User.findByPk(userId);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Check if user already has a Stripe customer ID
    if (user.stripeCustomerId) {
      const customer = await stripeService.getCustomer(user.stripeCustomerId);

      return res.status(200).json({
        status: 'success',
        data: { customer },
      });
    }

    // Create new Stripe customer
    const customer = await stripeService.createCustomer({
      email: user.email,
      name: `${user.firstName} ${user.lastName}`,
      metadata: {
        userId: user.id,
      },
    });

    // Save Stripe customer ID to user
    await user.update({ stripeCustomerId: customer.id });

    res.status(201).json({
      status: 'success',
      data: { customer },
    });
  } catch (error) {
    next(error);
  }
};

// Get payment methods
const getPaymentMethods = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const user = await User.findByPk(userId);

    if (!user || !user.stripeCustomerId) {
      return res.status(200).json({
        status: 'success',
        data: { paymentMethods: [] },
      });
    }

    const paymentMethods = await stripeService.getPaymentMethods(
      user.stripeCustomerId
    );

    res.status(200).json({
      status: 'success',
      data: { paymentMethods },
    });
  } catch (error) {
    next(error);
  }
};

// Create setup intent for saving payment methods
const createSetupIntent = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const user = await User.findByPk(userId);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Create customer if doesn't exist
    let customerId = user.stripeCustomerId;

    if (!customerId) {
      const customer = await stripeService.createCustomer({
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        metadata: { userId: user.id },
      });

      customerId = customer.id;
      await user.update({ stripeCustomerId: customerId });
    }

    const setupIntent = await stripeService.createSetupIntent(customerId);

    res.status(200).json({
      status: 'success',
      data: setupIntent,
    });
  } catch (error) {
    next(error);
  }
};

// Handle Stripe webhooks
const handleWebhook = async (req, res, next) => {
  try {
    // For sandbox/development, temporarily skip webhook verification
    console.log('Webhook received in sandbox mode');
    return res.status(200).json({ received: true });

    // Uncomment below when you have real webhook secret
    // const signature = req.headers['stripe-signature'];
    // const payload = req.body;
    // const event = await stripeService.handleWebhook(payload, signature);

    // Handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;

      case 'customer.created':
        console.log('Customer created:', event.data.object.id);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    next(error);
  }
};

// Helper function to handle successful payments
const handlePaymentSucceeded = async (paymentIntent) => {
  try {
    const orderIds = parseOrderIdsFromPaymentIntent(paymentIntent);

    if (orderIds.length === 0) {
      console.log('No orderIds found in webhook payment intent metadata');
      return;
    }

    const existingOrders = await Order.findAll({
      where: {
        id: orderIds,
      },
    });

    if (existingOrders.length === 0) {
      console.log('No orders found for webhook orderIds:', orderIds);
      return;
    }

    const unpaidOrders = existingOrders.filter(
      (order) => order.paymentStatus !== 'paid'
    );

    const unpaidOrderIds = unpaidOrders.map((order) => order.id);

    if (unpaidOrderIds.length === 0) {
      console.log('Webhook orders already paid, skip inventory reduction');
      return;
    }

    await Order.update(
      {
        status: 'processing',
        paymentStatus: 'paid',
        paymentTransactionId: paymentIntent.id,
        paymentProvider: 'stripe',
        updatedAt: new Date(),
      },
      {
        where: {
          id: unpaidOrderIds,
        },
      }
    );

    await reduceInventoryForOrders(unpaidOrderIds);

    console.log(
      `Payment succeeded and inventory reduced for orders: ${unpaidOrderIds.join(
        ', '
      )}`
    );

    await clearUserCart(existingOrders[0].userId);
  } catch (error) {
    console.error('Error handling payment succeeded:', error);
  }
};

// Helper function to handle failed payments
const handlePaymentFailed = async (paymentIntent) => {
  try {
    const orderIds = parseOrderIdsFromPaymentIntent(paymentIntent);

    if (orderIds.length === 0) {
      console.log('No orderIds found for failed payment');
      return;
    }

    await Order.update(
      {
        paymentStatus: 'failed',
        paymentTransactionId: paymentIntent.id,
        paymentProvider: 'stripe',
        updatedAt: new Date(),
      },
      {
        where: {
          id: orderIds,
        },
      }
    );

    console.log(`Payment failed for orders: ${orderIds.join(', ')}`);
  } catch (error) {
    console.error('Error handling payment failed:', error);
  }
};

// Create refund
const createRefund = async (req, res, next) => {
  try {
    const { orderId, amount, reason } = req.body;

    if (!orderId) {
      throw new AppError('Order ID is required', 400);
    }

    const order = await Order.findByPk(orderId);

    if (!order) {
      throw new AppError('Order not found', 404);
    }

    if (!order.paymentTransactionId) {
      throw new AppError('No payment transaction found for this order', 400);
    }

    const refund = await stripeService.createRefund({
      paymentIntentId: order.paymentTransactionId,
      amount,
      reason,
    });

    // Update order payment status
    await order.update({
      paymentStatus: 'refunded',
    });

    res.status(200).json({
      status: 'success',
      data: { refund },
    });
  } catch (error) {
    next(error);
  }
};

// Verify SePay webhook using API key authentication
const verifySePayApiKey = (req) => {
  // SePay sends API key in Authorization header as "Authorization": "Apikey API_KEY_CUA_BAN"
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    console.error('No Authorization header provided in SePay webhook');
    return false;
  }

  // Check if the header starts with "Apikey "
  if (!authHeader.startsWith('Apikey ')) {
    console.error('Invalid Authorization header format in SePay webhook');
    return false;
  }

  // Extract the API key from the header
  const providedApiKey = authHeader.substring(7).trim(); // Remove "Apikey " prefix
  const expectedApiKey = process.env.SEPAY_API_KEY;

  if (!expectedApiKey) {
    console.warn('SePay API key not configured in environment variables');

    // In development, you might want to allow the webhook without API key verification
    return (
      process.env.NODE_ENV === 'development' ||
      process.env.NODE_ENV === 'test'
    );
  }

  // Compare the provided API key with the expected one
  // Use constant-time comparison to prevent timing attacks
  const expectedLength = expectedApiKey.length;
  const providedLength = providedApiKey.length;
  let mismatch = expectedLength !== providedLength;

  for (let i = 0; i < Math.max(expectedLength, providedLength); i++) {
    const expectedChar = expectedApiKey.charCodeAt(i) || 0;
    const providedChar = providedApiKey.charCodeAt(i) || 0;

    mismatch |= expectedChar ^ providedChar;
  }

  if (mismatch !== 0) {
    console.error('Invalid SePay API key provided');
    return false;
  }

  return true;
};

// Handle SePay webhook
const handleSePayWebhook = async (req, res, next) => {
  try {
    // Verify the webhook source using API key authentication
    if (!verifySePayApiKey(req)) {
      console.error('Invalid SePay API key');

      return res.status(401).json({ error: 'Unauthorized webhook request' });
    }

    const {
      id,
      gateway,
      transactionDate,
      accountNumber,
      code,
      content,
      transferType,
      transferAmount,
      accumulated,
      subAccount,
      referenceCode,
      description,
    } = req.body;

    console.log('SePay webhook received:', {
      id,
      transferAmount,
      content,
      transferType,
    });

    // Validate required fields
    if (!id || !transferType || !transferAmount || !transactionDate) {
      console.log('Missing required fields in SePay webhook');

      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate data types
    if (typeof id !== 'number' && typeof id !== 'string') {
      console.log('Invalid transaction ID type in SePay webhook');

      return res.status(400).json({ error: 'Invalid transaction ID type' });
    }

    if (
      typeof transferAmount !== 'number' ||
      typeof transferType !== 'string'
    ) {
      console.log('Invalid data types in SePay webhook');

      return res.status(400).json({ error: 'Invalid data types' });
    }

    // Validate transfer amount is positive
    if (transferAmount <= 0) {
      console.log('Invalid transfer amount:', transferAmount);

      return res
        .status(400)
        .json({ error: 'Transfer amount must be positive' });
    }

    // Validate transfer type
    if (!['in', 'out'].includes(transferType)) {
      console.log('Invalid transfer type:', transferType);

      return res.status(400).json({ error: 'Invalid transfer type' });
    }

    // Only process incoming transactions (money coming in)
    if (transferType !== 'in') {
      console.log('Ignoring outgoing transaction');

      return res.status(200).json({
        received: true,
        message: 'Outgoing transaction ignored',
      });
    }

    // Validate transaction date format
    const parsedTransactionDate = new Date(transactionDate);

    if (isNaN(parsedTransactionDate.getTime())) {
      console.log('Invalid transaction date format:', transactionDate);

      return res
        .status(400)
        .json({ error: 'Invalid transaction date format' });
    }

    // Extract order ID from content or code
    let orderId = null;

    // Try to extract order ID from content
    if (content) {
      const patterns = [
        /ORD[-_]?(\d+)/i,
        /ORDER[-_]?(\d+)/i,
        /ORD[-_]?\w+/i,
        /ORDER[-_]?\w+/i,
        /order[-_\s]?(\d+)/i,
        /SEPAY(\d+)/i,
        /SEPAY[-_\s]?(\d+)/i,
        /\b(\d{6,})\b/,
      ];

      for (const pattern of patterns) {
        const match = content.match(pattern);

        if (match) {
          orderId = match[0];

          if (orderId) {
            orderId = orderId.trim();
            break;
          }
        }
      }
    }

    // Also try to extract from code if not found in content
    if (!orderId && code) {
      const codePatterns = [
        /ORD[-_]?(\d+)/i,
        /ORDER[-_]?(\d+)/i,
        /ORD[-_]?\w+/i,
        /ORDER[-_]?\w+/i,
        /order[-_\s]?(\d+)/i,
        /SEPAY(\d+)/i,
        /SEPAY[-_\s]?(\d+)/i,
        /\b(\d{6,})\b/,
      ];

      for (const pattern of codePatterns) {
        const match = code.match(pattern);

        if (match) {
          orderId = match[0];

          if (orderId) {
            orderId = orderId.trim();
            break;
          }
        }
      }
    }

    // If we still can't find an order ID, use the referenceCode
    if (!orderId && referenceCode) {
      const refPatterns = [
        /ORD[-_]?(\d+)/i,
        /ORDER[-_]?(\d+)/i,
        /ORD[-_]?\w+/i,
        /ORDER[-_]?\w+/i,
        /order[-_\s]?(\d+)/i,
        /SEPAY(\d+)/i,
        /SEPAY[-_\s]?(\d+)/i,
        /\b(\d{6,})\b/,
      ];

      for (const pattern of refPatterns) {
        const match = referenceCode.match(pattern);

        if (match) {
          orderId = match[0];

          if (orderId) {
            orderId = orderId.trim();
            break;
          }
        }
      }
    }

    if (!orderId) {
      console.log('No order ID found in webhook data');

      return res.status(200).json({
        received: true,
        message: 'No order ID found in transaction, processed successfully',
      });
    }

    console.log('Looking for order with ID:', orderId);

    // Find the order in the database
    let order = null;

    // Try multiple ways to find the order
    try {
      // First, try to find by exact order number
      order = await Order.findOne({
        where: {
          number: orderId,
        },
      });

      // If not found, try variations of the order number format
      if (!order) {
        if (orderId.startsWith('ORD') && orderId.length > 7) {
          const formattedOrderId = `${orderId.substring(
            0,
            3
          )}-${orderId.substring(3, 7)}-${orderId.substring(7)}`;

          order = await Order.findOne({
            where: {
              number: formattedOrderId,
            },
          });
        }
      }

      // If still not found, try the reverse: if webhook has hyphens, remove them for DB lookup
      if (!order && orderId.includes('-')) {
        const unformattedOrderId = orderId.replace(/-/g, '');

        order = await Order.findOne({
          where: {
            number: unformattedOrderId,
          },
        });

        if (!order) {
          const formattedOrderId = `${unformattedOrderId.substring(
            0,
            3
          )}-${unformattedOrderId.substring(
            3,
            7
          )}-${unformattedOrderId.substring(7)}`;

          order = await Order.findOne({
            where: {
              number: formattedOrderId,
            },
          });
        }
      }

      // If still not found, try looking for a numeric ID match in the 'number' field
      if (!order) {
        const numericPart = parseInt(orderId.replace(/\D/g, ''));

        if (!isNaN(numericPart)) {
          order = await Order.findOne({
            where: {
              number: { [Op.iLike]: `%${numericPart}%` },
            },
          });
        }
      }

      // If we still haven't found it, try a more comprehensive search
      if (!order) {
        order = await Order.findOne({
          where: {
            [Op.or]: [{ number: { [Op.iLike]: `%${orderId}%` } }],
          },
        });
      }
    } catch (error) {
      console.error('Database error finding order:', error);

      return res.status(500).json({ error: 'Error processing order' });
    }

    if (!order) {
      console.log('Order not found:', orderId);

      return res.status(200).json({
        received: true,
        message: `Order with ID ${orderId} not found, processed successfully`,
      });
    }

    // Verify that the transfer amount matches the order total
    const orderTotal = parseFloat(order.total);
    const transferAmountInVND = transferAmount;

    console.log('Comparing amounts:', {
      orderNumber: order.number,
      orderTotal: orderTotal,
      transferAmount: transferAmountInVND,
      isMatch: Math.abs(orderTotal - transferAmountInVND) < 0.01,
    });

    // Check if amount matches
    if (Math.abs(orderTotal - transferAmountInVND) > 0.01) {
      console.log(
        `Amount mismatch: Order total ${orderTotal} vs Transfer amount ${transferAmountInVND}`
      );

      return res.status(200).json({
        received: true,
        message: 'Amount mismatch detected, processed successfully',
      });
    }

    // Prevent duplicate processing
    if (order.paymentTransactionId && order.paymentTransactionId === id.toString()) {
      console.log('Duplicate webhook received for transaction ID:', id);

      return res.status(200).json({
        received: true,
        message: 'Webhook already processed',
      });
    }

    // Update the order status to paid and processing if not already processed
    if (order.paymentStatus === 'pending' || order.paymentStatus === 'unpaid') {
      await Order.update(
        {
          status: 'processing',
          paymentStatus: 'paid',
          paymentTransactionId: id.toString(),
          paymentProvider: 'sepay',
          updatedAt: new Date(),
        },
        {
          where: { id: order.id },
        }
      );

      await reduceInventoryForOrders([order.id]);

      console.log('Order updated successfully:', {
        orderId: order.id,
        orderNumber: order.number,
        paymentStatus: 'paid',
        status: 'processing',
        transactionId: id,
        paymentDate: parsedTransactionDate,
      });

      await clearUserCart(order.userId);
    } else {
      console.log('Order already processed:', {
        orderId: order.id,
        orderNumber: order.number,
        currentPaymentStatus: order.paymentStatus,
        currentOrderStatus: order.status,
      });

      return res.status(200).json({
        received: true,
        message: 'Order already processed, webhook acknowledged',
      });
    }

    res.status(200).json({
      received: true,
      message: 'SePay webhook processed successfully',
      orderId: order.id,
      orderNumber: order.number,
      transactionId: id,
    });
  } catch (error) {
    console.error('Error processing SePay webhook:', error);
    next(error);
  }
};

module.exports = {
  createPaymentIntent,
  confirmPayment,
  createCustomer,
  getPaymentMethods,
  createSetupIntent,
  handleWebhook,
  createRefund,
  handleSePayWebhook,
};