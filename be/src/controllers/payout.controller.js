const { Payout, OrderItem, Product, Order, RefundRequest } = require('../models');
const { AppError } = require('../middlewares/errorHandler');

const COMMISSION_RATE = 0.05;

const money = (value) => Math.round(Number(value || 0));

const APPROVED_REFUND_STATUSES = ['approved', 'refunded', 'completed'];

const calculateSellerPayoutStats = async (sellerId) => {
  // 1. Lấy doanh thu từ các sản phẩm của seller trong đơn đã giao
  const orderItems = await OrderItem.findAll({
    include: [
      {
        model: Product,
        attributes: ['id', 'name', 'seller_id'],
        where: { seller_id: sellerId },
      },
      {
        model: Order,
        attributes: [
          'id',
          'number',
          'status',
          'paymentStatus',
          'subtotal',
          'commissionAmount',
          'sellerNetAmount',
          'refundAmount',
          'refundStatus',
          'createdAt',
        ],
        where: {
          status: 'delivered',
        },
      },
    ],
  });

  let grossRevenue = 0;

  const revenueItems = orderItems.map((item) => {
    const quantity = Number(item.quantity) || 0;
    const price = Number(item.price) || 0;
    const itemTotal = money(item.subtotal || price * quantity);

    grossRevenue += itemTotal;

    return {
      orderItemId: item.id,
      orderId: item.orderId,
      orderNumber: item.Order?.number,
      productId: item.productId,
      productName: item.Product?.name || item.name || 'Sản phẩm',
      quantity,
      price,
      total: itemTotal,
      status: item.Order?.status,
      paymentStatus: item.Order?.paymentStatus,
      refundStatus: item.Order?.refundStatus,
      createdAt: item.Order?.createdAt,
    };
  });

  grossRevenue = money(grossRevenue);

  // 2. Tính tổng tiền refund đã duyệt ảnh hưởng tới seller
  const refundRequests = await RefundRequest.findAll({
    where: {
      status: APPROVED_REFUND_STATUSES,
    },
    include: [
      {
        model: Order,
        as: 'order',
        required: true,
        attributes: ['id', 'number', 'subtotal', 'refundAmount', 'refundStatus'],
        include: [
          {
            model: OrderItem,
            as: 'items',
            required: true,
            attributes: ['id', 'orderId', 'productId', 'price', 'quantity', 'subtotal'],
            include: [
              {
                model: Product,
                required: true,
                attributes: ['id', 'name', 'seller_id'],
                where: {
                  seller_id: sellerId,
                },
              },
            ],
          },
        ],
      },
    ],
  });

  let refundAmount = 0;

  const refundItems = refundRequests.map((refund) => {
    const order = refund.order;
    const sellerItems = order?.items || [];

    const requestAmount = Number(refund.amount || 0);
    const orderSubtotal = Number(order?.subtotal || 0);

    const sellerSubtotal = sellerItems.reduce((sum, item) => {
      const itemSubtotal = Number(item.subtotal || 0);
      const fallbackSubtotal =
        (Number(item.price) || 0) * (Number(item.quantity) || 0);

      return sum + (itemSubtotal || fallbackSubtotal);
    }, 0);

    let sellerRefundAmount = 0;

    if (orderSubtotal > 0) {
      sellerRefundAmount = (requestAmount / orderSubtotal) * sellerSubtotal;
    } else {
      sellerRefundAmount = Math.min(requestAmount, sellerSubtotal);
    }

    sellerRefundAmount = Math.min(sellerRefundAmount, sellerSubtotal);
    sellerRefundAmount = money(sellerRefundAmount);

    refundAmount += sellerRefundAmount;

    return {
      refundRequestId: refund.id,
      orderId: refund.orderId,
      orderNumber: order?.number,
      status: refund.status,
      requestAmount: money(requestAmount),
      sellerSubtotal: money(sellerSubtotal),
      sellerAffectedAmount: sellerRefundAmount,
      reason: refund.reason,
      processedAt: refund.processedAt,
      createdAt: refund.createdAt,
    };
  });

  refundAmount = money(refundAmount);

  // 3. Cách 2: vẫn giữ grossRevenue, nhưng trừ refund trước khi tính phí sàn
  const adjustedGrossRevenue = Math.max(0, grossRevenue - refundAmount);

  const totalCommission = money(adjustedGrossRevenue * COMMISSION_RATE);

  const netRevenue = Math.max(0, adjustedGrossRevenue - totalCommission);

  // 4. Tính payout đã trả / đang chờ
  const payouts = await Payout.findAll({
    where: { sellerId },
    order: [['createdAt', 'DESC']],
  });

  const totalPaid = payouts
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const pendingPayout = payouts
    .filter((p) => p.status === 'pending')
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const rejectedPayout = payouts
    .filter((p) => p.status === 'rejected')
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const availableToRequest = Math.max(
    0,
    netRevenue - totalPaid - pendingPayout
  );

  return {
    grossRevenue,
    refundAmount,
    adjustedGrossRevenue,
    totalCommission,
    netRevenue,
    sellerRevenue: netRevenue,
    totalPaid: money(totalPaid),
    pendingPayout: money(pendingPayout),
    rejectedPayout: money(rejectedPayout),
    availableToRequest: money(availableToRequest),
    commissionRate: COMMISSION_RATE,
    revenueItems,
    refundItems,
    payouts,
  };
};

const getSellerPayoutSummary = async (req, res, next) => {
  try {
    const sellerId = req.user.id;

    const summary = await calculateSellerPayoutStats(sellerId);

    res.status(200).json({
      status: 'success',
      data: summary,
    });
  } catch (error) {
    console.error('GET SELLER PAYOUT SUMMARY ERROR:', error);
    next(error);
  }
};

const createPayoutRequest = async (req, res, next) => {
  try {
    const sellerId = req.user.id;
    const { amount, paymentMethod = 'bank', bankAccount, note } = req.body;

    const payoutAmount = Number(amount);

    if (!payoutAmount || payoutAmount <= 0) {
      throw new AppError('Số tiền rút không hợp lệ', 400);
    }

    if (paymentMethod === 'bank') {
      if (
        !bankAccount ||
        !bankAccount.bankName ||
        !bankAccount.accountNumber ||
        !bankAccount.accountHolder
      ) {
        throw new AppError('Vui lòng nhập đầy đủ thông tin ngân hàng', 400);
      }
    }

    const summary = await calculateSellerPayoutStats(sellerId);

    if (payoutAmount > summary.availableToRequest) {
      throw new AppError('Số tiền yêu cầu vượt quá số dư có thể rút', 400);
    }

    const payout = await Payout.create({
      sellerId,
      amount: payoutAmount,
      paymentMethod,
      bankName: paymentMethod === 'bank' ? bankAccount.bankName : null,
      accountNumber:
        paymentMethod === 'bank' ? bankAccount.accountNumber : null,
      accountHolder:
        paymentMethod === 'bank' ? bankAccount.accountHolder : null,
      note: note || null,
      status: 'pending',
    });

    res.status(201).json({
      status: 'success',
      message: 'Tạo yêu cầu payout thành công',
      data: payout,
    });
  } catch (error) {
    console.error('CREATE PAYOUT REQUEST ERROR:', error);
    next(error);
  }
};

const getAdminPayouts = async (req, res, next) => {
  try {
    const payouts = await Payout.findAll({
      include: [
        {
          association: 'seller',
          attributes: ['id', 'firstName', 'lastName', 'email', 'role'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.status(200).json({
      status: 'success',
      data: payouts,
    });
  } catch (error) {
    console.error('GET ADMIN PAYOUTS ERROR:', error);
    next(error);
  }
};

const markPayoutAsPaid = async (req, res, next) => {
  try {
    const { payoutId } = req.params;
    const { adminNote } = req.body;

    const payout = await Payout.findByPk(payoutId);

    if (!payout) {
      throw new AppError('Không tìm thấy payout', 404);
    }

    if (payout.status === 'paid') {
      throw new AppError('Payout này đã được thanh toán', 400);
    }

    if (payout.status === 'rejected') {
      throw new AppError('Không thể thanh toán payout đã bị từ chối', 400);
    }

    await payout.update({
      status: 'paid',
      paidAt: new Date(),
      adminNote: adminNote || payout.adminNote,
    });

    res.status(200).json({
      status: 'success',
      message: 'Đã đánh dấu payout là đã thanh toán',
      data: payout,
    });
  } catch (error) {
    console.error('MARK PAYOUT AS PAID ERROR:', error);
    next(error);
  }
};

const rejectPayout = async (req, res, next) => {
  try {
    const { payoutId } = req.params;
    const { adminNote } = req.body;

    const payout = await Payout.findByPk(payoutId);

    if (!payout) {
      throw new AppError('Không tìm thấy payout', 404);
    }

    if (payout.status === 'paid') {
      throw new AppError('Không thể từ chối payout đã thanh toán', 400);
    }

    await payout.update({
      status: 'rejected',
      adminNote: adminNote || 'Admin đã từ chối yêu cầu payout',
    });

    res.status(200).json({
      status: 'success',
      message: 'Đã từ chối payout',
      data: payout,
    });
  } catch (error) {
    console.error('REJECT PAYOUT ERROR:', error);
    next(error);
  }
};

module.exports = {
  getSellerPayoutSummary,
  createPayoutRequest,
  getAdminPayouts,
  markPayoutAsPaid,
  rejectPayout,
};