const {
  Order,
  OrderItem,
  Cart,
  CartItem,
  Product,
  ProductVariant,
  Voucher,
  RefundRequest,
  sequelize,
} = require('../models');
const { AppError } = require('../middlewares/errorHandler');
const emailService = require('../services/email/emailService');
const { trackUserBehavior } = require('../services/userBehavior.service');
const normalizeVoucherCode = (code) => {
  return String(code || '').trim().toUpperCase();
};

const calculateVoucherDiscount = (voucher, subtotal) => {
  const orderSubtotal = Number(subtotal || 0);

  if (!voucher) {
    return 0;
  }

  let discountAmount = 0;

  if (voucher.discount_type === 'percent') {
    discountAmount =
      (orderSubtotal * Number(voucher.discount_value || 0)) / 100;

    if (voucher.max_discount !== null && voucher.max_discount !== undefined) {
      discountAmount = Math.min(discountAmount, Number(voucher.max_discount));
    }
  }

  if (voucher.discount_type === 'fixed') {
    discountAmount = Number(voucher.discount_value || 0);
  }

  discountAmount = Math.min(discountAmount, orderSubtotal);

  return Math.max(Math.round(discountAmount), 0);
};

const validateVoucherForSubtotal = async (voucherCode, subtotal) => {
  const code = normalizeVoucherCode(voucherCode);

  if (!code) {
    return {
      voucher: null,
      discountAmount: 0,
    };
  }

  const voucher = await Voucher.findOne({
    where: {
      code,
    },
  });

  if (!voucher) {
    throw new AppError('Mã giảm giá không tồn tại', 400);
  }

  if (!voucher.is_active) {
    throw new AppError('Mã giảm giá đã bị tắt', 400);
  }

  const now = new Date();

  if (voucher.start_date && new Date(voucher.start_date) > now) {
    throw new AppError('Mã giảm giá chưa đến thời gian sử dụng', 400);
  }

  if (voucher.end_date && new Date(voucher.end_date) < now) {
    throw new AppError('Mã giảm giá đã hết hạn', 400);
  }

  if (
    voucher.usage_limit !== null &&
    voucher.usage_limit !== undefined &&
    Number(voucher.used_count) >= Number(voucher.usage_limit)
  ) {
    throw new AppError('Mã giảm giá đã hết lượt sử dụng', 400);
  }

  if (Number(subtotal) < Number(voucher.min_order_value || 0)) {
    throw new AppError(
      `Đơn hàng chưa đạt giá trị tối thiểu ${Number(
        voucher.min_order_value || 0
      ).toLocaleString('vi-VN')}đ để dùng mã này`,
      400
    );
  }

  const discountAmount = calculateVoucherDiscount(voucher, subtotal);

  return {
    voucher,
    discountAmount,
  };
};

// Apply voucher before creating order
const applyVoucher = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { voucherCode } = req.body;

    if (!voucherCode) {
      throw new AppError('Vui lòng nhập mã giảm giá', 400);
    }

    const cart = await Cart.findOne({
      where: {
        userId,
        status: 'active',
      },
      include: [
        {
          association: 'items',
          include: [
            {
              model: Product,
              attributes: ['id', 'name', 'price'],
            },
            {
              model: ProductVariant,
              attributes: ['id', 'name', 'price'],
            },
          ],
        },
      ],
    });

    if (!cart || !cart.items || cart.items.length === 0) {
      throw new AppError('Giỏ hàng trống', 400);
    }

    let subtotal = 0;

    for (const item of cart.items) {
      const product = item.Product;
      const variant = item.ProductVariant;

      if (!product) {
        throw new AppError('Sản phẩm không tồn tại', 400);
      }

      const price = Number(variant ? variant.price : product.price);
      subtotal += price * Number(item.quantity);
    }

    const { voucher, discountAmount } = await validateVoucherForSubtotal(
      voucherCode,
      subtotal
    );

    res.status(200).json({
      status: 'success',
      message: 'Áp dụng mã giảm giá thành công',
      data: {
        voucher: {
          id: voucher.id,
          code: voucher.code,
          name: voucher.name,
          description: voucher.description,
          discount_type: voucher.discount_type,
          discount_value: voucher.discount_value,
          min_order_value: voucher.min_order_value,
          max_discount: voucher.max_discount,
        },
        subtotal,
        discountAmount,
        totalAfterDiscount: Math.max(subtotal - discountAmount, 0),
      },
    });
  } catch (error) {
    next(error);
  }
};

// Create order from cart
const createOrder = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const userId = req.user.id;
    const {
      shippingFirstName,
      shippingLastName,
      shippingCompany,
      shippingAddress1,
      shippingAddress2,
      shippingCity,
      shippingState,
      shippingZip,
      shippingCountry,
      shippingPhone,
      billingFirstName,
      billingLastName,
      billingCompany,
      billingAddress1,
      billingAddress2,
      billingCity,
      billingState,
      billingZip,
      billingCountry,
      billingPhone,
      paymentMethod,
      notes,
      voucherCode,
    } = req.body;

    if (!paymentMethod) {
      throw new AppError('Vui lòng chọn phương thức thanh toán', 400);
    }

    const cart = await Cart.findOne({
      where: {
        userId,
        status: 'active',
      },
      include: [
        {
          association: 'items',
          include: [
            {
              model: Product,
              attributes: [
                'id',
                'name',
                'slug',
                'price',
                'thumbnail',
                'inStock',
                'stockQuantity',
                'sku',
                'seller_id',
              ],
            },
            {
              model: ProductVariant,
              attributes: ['id', 'name', 'price', 'stockQuantity', 'sku'],
            },
          ],
        },
      ],
      transaction,
    });

    if (!cart || !cart.items || cart.items.length === 0) {
      throw new AppError('Giỏ hàng trống', 400);
    }

    for (const item of cart.items) {
      const product = item.Product;
      const variant = item.ProductVariant;

      if (!product) {
        throw new AppError('Sản phẩm không tồn tại', 400);
      }

      if (!product.seller_id) {
        throw new AppError(`Sản phẩm "${product.name}" chưa có seller`, 400);
      }

      if (!product.inStock) {
        throw new AppError(`Sản phẩm "${product.name}" đã hết hàng`, 400);
      }

      if (variant) {
        if (variant.stockQuantity < item.quantity) {
          throw new AppError(
            `Biến thể "${variant.name}" của sản phẩm "${product.name}" chỉ còn ${variant.stockQuantity} sản phẩm`,
            400
          );
        }
      } else if (product.stockQuantity < item.quantity) {
        throw new AppError(
          `Sản phẩm "${product.name}" chỉ còn ${product.stockQuantity} sản phẩm`,
          400
        );
      }
    }

    let cartSubtotal = 0;

    for (const item of cart.items) {
      const product = item.Product;
      const variant = item.ProductVariant;
      const price = Number(variant ? variant.price : product.price);

      cartSubtotal += price * Number(item.quantity);
    }

    let appliedVoucher = null;
    let totalVoucherDiscount = 0;
    const normalizedVoucherCode = normalizeVoucherCode(voucherCode);

    if (normalizedVoucherCode) {
      const voucherResult = await validateVoucherForSubtotal(
        normalizedVoucherCode,
        cartSubtotal
      );

      appliedVoucher = voucherResult.voucher;
      totalVoucherDiscount = voucherResult.discountAmount;
    }

    const groupedItemsBySeller = {};

    for (const item of cart.items) {
      const sellerId = item.Product.seller_id;

      if (!groupedItemsBySeller[sellerId]) {
        groupedItemsBySeller[sellerId] = [];
      }

      groupedItemsBySeller[sellerId].push(item);
    }

    const sellerIds = Object.keys(groupedItemsBySeller);
    const isCOD = paymentMethod === 'cod';

    await Order.update(
      { status: 'cancelled' },
      {
        where: {
          userId,
          status: 'pending',
        },
        transaction,
      }
    );

    const createdOrders = [];
    const baseCount = await Order.count({ transaction });

    let allocatedDiscount = 0;

    for (let index = 0; index < sellerIds.length; index++) {
      const sellerId = sellerIds[index];
      const sellerItems = groupedItemsBySeller[sellerId];

      let subtotal = 0;
      const tax = 0;
      const shippingCost = 0;

      for (const item of sellerItems) {
        const product = item.Product;
        const variant = item.ProductVariant;
        const price = Number(variant ? variant.price : product.price);

        subtotal += price * Number(item.quantity);
      }

      let discount = 0;

      if (appliedVoucher && totalVoucherDiscount > 0 && cartSubtotal > 0) {
        if (index === sellerIds.length - 1) {
          discount = totalVoucherDiscount - allocatedDiscount;
        } else {
          discount = Math.round((subtotal / cartSubtotal) * totalVoucherDiscount);
          allocatedDiscount += discount;
        }
      }

      discount = Math.min(discount, subtotal);

      const total = Math.max(subtotal + tax + shippingCost - discount, 0);

      const commissionRate = 0.05;
      const commissionBase = Math.max(subtotal - discount, 0);
      const commissionAmount = commissionBase * commissionRate;
      const sellerNetAmount = commissionBase - commissionAmount;

      const date = new Date();
      const year = date.getFullYear().toString().substr(-2);
      const month = (date.getMonth() + 1).toString().padStart(2, '0');

      const orderNumber = `ORD-${year}${month}-${(baseCount + index + 1)
        .toString()
        .padStart(5, '0')}`;

      const order = await Order.create(
        {
          number: orderNumber,
          userId,

          shippingFirstName,
          shippingLastName,
          shippingCompany,
          shippingAddress1,
          shippingAddress2,
          shippingCity,
          shippingState,
          shippingZip,
          shippingCountry,
          shippingPhone,

          billingFirstName,
          billingLastName,
          billingCompany,
          billingAddress1,
          billingAddress2,
          billingCity,
          billingState,
          billingZip,
          billingCountry,
          billingPhone,

          paymentMethod,
          paymentStatus: isCOD ? 'unpaid' : 'pending',

          subtotal,
          tax,
          shippingCost,
          discount,
          voucherId: appliedVoucher ? appliedVoucher.id : null,
          voucherCode: appliedVoucher ? appliedVoucher.code : null,
          total,
          notes,

          status: 'pending',

          commissionAmount,
          sellerNetAmount,
        },
        { transaction }
      );

      const orderItems = [];

      for (const item of sellerItems) {
        const product = item.Product;
        const variant = item.ProductVariant;
        const price = Number(variant ? variant.price : product.price);
        const itemSubtotal = price * Number(item.quantity);

        const orderItem = await OrderItem.create(
          {
            orderId: order.id,
            productId: product.id,
            variantId: variant ? variant.id : null,
            name: product.name,
            sku: variant ? variant.sku : product.sku,
            price,
            quantity: item.quantity,
            subtotal: itemSubtotal,
            image: product.thumbnail,
            attributes: variant ? { variant: variant.name } : {},
          },
          { transaction }
        );

        orderItems.push(orderItem);

        if (isCOD) {
          if (variant) {
            const newVariantStock = variant.stockQuantity - item.quantity;

            await variant.update(
              {
                stockQuantity: newVariantStock,
              },
              { transaction }
            );
          } else {
            const newProductStock = product.stockQuantity - item.quantity;

            await product.update(
              {
                stockQuantity: newProductStock,
                inStock: newProductStock > 0,
              },
              { transaction }
            );
          }
        }
      }

      createdOrders.push({
        order,
        orderItems,
        sellerId,
      });
    }

    if (appliedVoucher) {
      await appliedVoucher.increment('used_count', {
        by: 1,
        transaction,
      });
    }

    await CartItem.destroy({
      where: {
        cartId: cart.id,
      },
      transaction,
    });

    await transaction.commit();



    for (const createdOrder of createdOrders) {
  for (const orderItem of createdOrder.orderItems) {
    await trackUserBehavior({
      userId,
      productId: orderItem.productId,
      actionType: 'purchase',
      metadata: {
        orderId: createdOrder.order.id,
        orderNumber: createdOrder.order.number,
        quantity: orderItem.quantity,
        price: orderItem.price,
        subtotal: orderItem.subtotal,
        paymentMethod,
      },
    });
  }
}
    for (const item of createdOrders) {
      emailService
        .sendOrderConfirmationEmail(req.user.email, {
          orderNumber: item.order.number,
          orderDate: item.order.createdAt,
          total: item.order.total,
          items: item.orderItems.map((orderItem) => ({
            name: orderItem.name,
            quantity: orderItem.quantity,
            price: orderItem.price,
            subtotal: orderItem.subtotal,
          })),
          shippingAddress: {
            name: `${item.order.shippingFirstName} ${item.order.shippingLastName}`,
            address1: item.order.shippingAddress1,
            address2: item.order.shippingAddress2,
            city: item.order.shippingCity,
            state: item.order.shippingState,
            zip: item.order.shippingZip,
            country: item.order.shippingCountry,
          },
        })
        .catch((err) =>
          console.error('Error sending order confirmation email:', err)
        );
    }

    const totalPayable = createdOrders.reduce(
      (sum, item) => sum + Number(item.order.total || 0),
      0
    );

    res.status(201).json({
      status: 'success',
      message: isCOD
        ? 'Đặt hàng thành công'
        : 'Đơn hàng đã được tạo, vui lòng tiếp tục thanh toán',
      data: {
        order: createdOrders[0]
          ? {
              id: createdOrders[0].order.id,
              number: createdOrders[0].order.number,
              status: createdOrders[0].order.status,
              paymentStatus: createdOrders[0].order.paymentStatus,
              total: createdOrders[0].order.total,
              discount: createdOrders[0].order.discount,
              voucherCode: createdOrders[0].order.voucherCode,
              createdAt: createdOrders[0].order.createdAt,
            }
          : null,

        orders: createdOrders.map((item) => ({
          id: item.order.id,
          number: item.order.number,
          status: item.order.status,
          paymentStatus: item.order.paymentStatus,
          paymentMethod: item.order.paymentMethod,
          total: item.order.total,
          subtotal: item.order.subtotal,
          discount: item.order.discount,
          voucherCode: item.order.voucherCode,
          commissionAmount: item.order.commissionAmount,
          sellerNetAmount: item.order.sellerNetAmount,
          createdAt: item.order.createdAt,
          sellerId: item.sellerId,
        })),

        orderIds: createdOrders.map((item) => item.order.id),
        totalOrders: createdOrders.length,
        paymentMethod,
        needPayment: !isCOD,
        voucher: appliedVoucher
          ? {
              id: appliedVoucher.id,
              code: appliedVoucher.code,
              discountAmount: totalVoucherDiscount,
            }
          : null,
        totalDiscount: totalVoucherDiscount,
        totalPayable,
      },
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

// Get user orders
const getUserOrders = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;

    const { count, rows: orders } = await Order.findAndCountAll({
      where: { userId },
      include: [
        {
          association: 'items',
          include: [
            {
              model: Product,
              attributes: ['id', 'name', 'images', 'price'],
            },
          ],
        },
      ],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      order: [['createdAt', 'DESC']],
    });

    res.status(200).json({
      status: 'success',
      data: {
        total: count,
        pages: Math.ceil(count / limit),
        currentPage: parseInt(page),
        orders,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get order by ID
const getOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const order = await Order.findOne({
  where: { id, userId },
  include: [
    {
      association: 'items',
    },
    {
      association: 'refundRequests',
      required: false,
      order: [['created_at', 'DESC']],
    },
  ],
});

    if (!order) {
      throw new AppError('Không tìm thấy đơn hàng', 404);
    }

    res.status(200).json({
      status: 'success',
      data: order,
    });
  } catch (error) {
    next(error);
  }
};
// Create refund request for an order
// Create refund request for an order
const createRefundRequest = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const userId = req.user.id;

    const {
      reason,
      description,
      amount,
      bankName,
      bankAccountNumber,
      bankAccountHolder,
      evidenceImages = [],
    } = req.body;

    if (
      !reason ||
      !amount ||
      !bankName ||
      !bankAccountNumber ||
      !bankAccountHolder
    ) {
      throw new AppError(
        'Vui lòng nhập đầy đủ lý do, số tiền và thông tin ngân hàng',
        400
      );
    }

    const refundAmount = Number(amount);

    if (Number.isNaN(refundAmount) || refundAmount <= 0) {
      throw new AppError('Số tiền yêu cầu hoàn không hợp lệ', 400);
    }

    let normalizedEvidenceImages = [];

    if (Array.isArray(evidenceImages)) {
      normalizedEvidenceImages = evidenceImages
        .map((item) => String(item || '').trim())
        .filter(Boolean);
    } else if (typeof evidenceImages === 'string') {
      normalizedEvidenceImages = evidenceImages
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean);
    }

    const order = await Order.findOne({
      where: {
        id,
        userId,
      },
      transaction,
    });

    if (!order) {
      throw new AppError('Không tìm thấy đơn hàng', 404);
    }

    if (order.status === 'cancelled') {
      throw new AppError('Không thể khiếu nại đơn hàng đã hủy', 400);
    }

    if (order.status === 'pending') {
      throw new AppError(
        'Đơn hàng đang chờ xử lý, chưa thể gửi yêu cầu hoàn tiền',
        400
      );
    }

    const orderTotal = Number(order.total || 0);

    if (refundAmount > orderTotal) {
      throw new AppError(
        'Số tiền hoàn không được lớn hơn tổng tiền đơn hàng',
        400
      );
    }

    const existingPendingRequest = await RefundRequest.findOne({
      where: {
        orderId: order.id,
        userId,
        status: 'pending',
      },
      transaction,
    });

    if (existingPendingRequest) {
      throw new AppError(
        'Đơn hàng này đang có yêu cầu khiếu nại chờ xử lý',
        400
      );
    }

    const refundRequest = await RefundRequest.create(
      {
        orderId: order.id,
        userId,
        reason,
        description: description || null,
        evidenceImages: normalizedEvidenceImages,
        amount: refundAmount,
        bankName,
        bankAccountNumber,
        bankAccountHolder,
        status: 'pending',
      },
      { transaction }
    );

    await order.update(
      {
        refundStatus: 'pending',
      },
      { transaction }
    );

    await transaction.commit();

    res.status(201).json({
      status: 'success',
      message: 'Gửi yêu cầu khiếu nại / hoàn tiền thành công',
      data: {
        refundRequest,
      },
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};
// Get current user's refund requests
const getMyRefundRequests = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const refundRequests = await RefundRequest.findAll({
      where: {
        userId,
      },
      include: [
        {
          association: 'order',
          attributes: [
            'id',
            'number',
            'total',
            'status',
            'refundAmount',
            'refundStatus',
            'sellerNetAmount',
            'createdAt',
          ],
        },
      ],
      order: [['created_at', 'DESC']],
    });

    res.status(200).json({
      status: 'success',
      data: {
        refundRequests,
      },
    });
  } catch (error) {
    next(error);
  }
};
// Get order by number
const getOrderByNumber = async (req, res, next) => {
  try {
    const { number } = req.params;
    const userId = req.user.id;

    const order = await Order.findOne({
      where: { number, userId },
      include: [
        {
          association: 'items',
        },
      ],
    });

    if (!order) {
      throw new AppError('Không tìm thấy đơn hàng', 404);
    }

    res.status(200).json({
      status: 'success',
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

// Cancel order
const cancelOrder = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const userId = req.user.id;

    const order = await Order.findOne({
      where: { id, userId },
      include: [
        {
          association: 'items',
          include: [
            {
              model: Product,
            },
            {
              model: ProductVariant,
            },
          ],
        },
      ],
    });

    if (!order) {
      throw new AppError('Không tìm thấy đơn hàng', 404);
    }

    if (order.status !== 'pending' && order.status !== 'processing') {
      throw new AppError('Không thể hủy đơn hàng này', 400);
    }

    await order.update(
      {
        status: 'cancelled',
      },
      { transaction }
    );

    for (const item of order.items) {
      if (item.variantId) {
        const variant = item.ProductVariant;

        await variant.update(
          {
            stockQuantity: variant.stockQuantity + item.quantity,
          },
          { transaction }
        );
      } else {
        const product = item.Product;

        await product.update(
          {
            stockQuantity: product.stockQuantity + item.quantity,
            inStock: true,
          },
          { transaction }
        );
      }
    }

    await transaction.commit();

    await emailService.sendOrderCancellationEmail(req.user.email, {
      orderNumber: order.number,
      orderDate: order.createdAt,
    });

    res.status(200).json({
      status: 'success',
      message: 'Đơn hàng đã được hủy',
      data: {
        id: order.id,
        number: order.number,
        status: 'cancelled',
      },
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

// Admin: Get all orders
const getAllOrders = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    const whereConditions = {};

    if (status) {
      whereConditions.status = status;
    }

    const { count, rows: orders } = await Order.findAndCountAll({
      where: whereConditions,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      order: [['createdAt', 'DESC']],
      include: [
        {
          association: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
      ],
    });

    res.status(200).json({
      status: 'success',
      data: {
        total: count,
        pages: Math.ceil(count / limit),
        currentPage: parseInt(page),
        orders,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Admin: Update order status
const updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const order = await Order.findByPk(id, {
      include: [
        {
          association: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
      ],
    });

    if (!order) {
      throw new AppError('Không tìm thấy đơn hàng', 404);
    }

    await order.update({ status });

    await emailService.sendOrderStatusUpdateEmail(order.user.email, {
      orderNumber: order.number,
      orderDate: order.createdAt,
      status,
    });

    res.status(200).json({
      status: 'success',
      message: 'Cập nhật trạng thái đơn hàng thành công',
      data: {
        id: order.id,
        number: order.number,
        status: order.status,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Thanh toán lại đơn hàng
 */
const repayOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const order = await Order.findOne({
      where: { id, userId },
    });

    if (!order) {
      throw new AppError('Không tìm thấy đơn hàng', 404);
    }

    if (
      order.status !== 'pending' &&
      order.status !== 'cancelled' &&
      order.paymentStatus !== 'failed'
    ) {
      throw new AppError('Đơn hàng này không thể thanh toán lại', 400);
    }

    await order.update({
      status: 'pending',
      paymentStatus: 'pending',
    });

    const origin = req.get('origin') || 'http://localhost:5175';

    const paymentUrl = `${origin}/checkout?repayOrder=${order.id}&amount=${order.total}`;

    res.status(200).json({
      status: 'success',
      message: 'Đơn hàng đã được cập nhật để thanh toán lại',
      data: {
        id: order.id,
        number: order.number,
        status: order.status,
        paymentStatus: order.paymentStatus,
        total: order.total,
        paymentUrl,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOrder,
  applyVoucher,
  createRefundRequest,
  getMyRefundRequests,
  getUserOrders,
  getOrderById,
  getOrderByNumber,
  cancelOrder,
  getAllOrders,
  updateOrderStatus,
  repayOrder,
};