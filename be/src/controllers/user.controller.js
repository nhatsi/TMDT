const { User, Address, Product, OrderItem, Order, Payout } = require('../models');
const { AppError } = require('../middlewares/errorHandler');

// Update user profile
const updateProfile = async (req, res, next) => {
  try {
    const { firstName, lastName, phone, avatar } = req.body;
    const userId = req.user.id;

    // Find user
    const user = await User.findByPk(userId);
    if (!user) {
      throw new AppError('Không tìm thấy người dùng', 404);
    }

    // Update user
    user.firstName = firstName || user.firstName;
    user.lastName = lastName || user.lastName;
    user.phone = phone !== undefined ? phone : user.phone;
    user.avatar = avatar || user.avatar;

    await user.save();

    res.status(200).json({
      status: 'success',
      data: user.toJSON(),
    });
  } catch (error) {
    next(error);
  }
};
// 🔥 ADMIN - GET ALL SELLERS
const getMyShopProfile = async (req, res, next) => {
  try {
    const sellerId = req.user.id;

    const seller = await User.findByPk(sellerId, {
      attributes: [
        'id',
        'firstName',
        'lastName',
        'email',
        'phone',
        'avatar',
        'shop_name',
        'shop_description',
        'shop_avatar',
        'shop_banner',
        'shop_phone',
        'shop_address',
      ],
    });

    if (!seller) {
      throw new AppError('Không tìm thấy shop', 404);
    }

    res.status(200).json({
      status: 'success',
      data: seller,
    });
  } catch (error) {
    next(error);
  }
};
const updateMyShopProfile = async (req, res, next) => {
  try {
    const sellerId = req.user.id;

    const {
      shop_name,
      shop_description,
      shop_avatar,
      shop_banner,
      shop_phone,
      shop_address,
    } = req.body;

    const seller = await User.findByPk(sellerId);

    if (!seller) {
      throw new AppError('Không tìm thấy shop', 404);
    }

    seller.shop_name = shop_name ?? seller.shop_name;
    seller.shop_description = shop_description ?? seller.shop_description;
    seller.shop_avatar = shop_avatar ?? seller.shop_avatar;
    seller.shop_banner = shop_banner ?? seller.shop_banner;
    seller.shop_phone = shop_phone ?? seller.shop_phone;
    seller.shop_address = shop_address ?? seller.shop_address;

    await seller.save();

    res.status(200).json({
      status: 'success',
      message: 'Cập nhật hồ sơ shop thành công',
      data: seller,
    });
  } catch (error) {
    next(error);
  }
};
const getAllSellers = async (req, res, next) => {
  try {
    const sellers = await User.findAll({
      where: { role: 'seller' },
      attributes: ['id', 'firstName', 'lastName', 'email', 'role', 'createdAt'],
    });

    res.status(200).json({
      status: 'success',
      data: sellers,
    });
  } catch (error) {
    next(error);
  }
};

// 🔥 ADMIN - GET PRODUCTS BY SELLER
const getProductsBySeller = async (req, res, next) => {
  try {
    const { sellerId } = req.params;

    const products = await Product.findAll({
      where: { seller_id: sellerId },
      order: [['createdAt', 'DESC']],
    });

    res.status(200).json({
      status: 'success',
      data: products,
    });
  } catch (error) {
    next(error);
  }
};
// Change password
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // Find user
    const user = await User.findByPk(userId);
    if (!user) {
      throw new AppError('Không tìm thấy người dùng', 404);
    }

    // Check current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      throw new AppError('Mật khẩu hiện tại không đúng', 401);
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'Đổi mật khẩu thành công',
    });
  } catch (error) {
    next(error);
  }
};

// Get user addresses
const getAddresses = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Find addresses
    const addresses = await Address.findAll({
      where: { userId },
      order: [
        ['isDefault', 'DESC'],
        ['createdAt', 'DESC'],
      ],
    });

    res.status(200).json({
      status: 'success',
      data: addresses,
    });
  } catch (error) {
    next(error);
  }
};

// Add new address
const addAddress = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const addressData = req.body;

    // Check if this is the first address
    const addressCount = await Address.count({ where: { userId } });
    if (addressCount === 0) {
      addressData.isDefault = true;
    }

    // If setting as default, update other addresses
    if (addressData.isDefault) {
      await Address.update(
        { isDefault: false },
        { where: { userId, isDefault: true } }
      );
    }

    // Create address
    const address = await Address.create({
      ...addressData,
      userId,
    });

    res.status(201).json({
      status: 'success',
      data: address,
    });
  } catch (error) {
    next(error);
  }
};

// Update address
const updateAddress = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const addressData = req.body;

    // Find address
    const address = await Address.findOne({
      where: { id, userId },
    });

    if (!address) {
      throw new AppError('Không tìm thấy địa chỉ', 404);
    }

    // If setting as default, update other addresses
    if (addressData.isDefault && !address.isDefault) {
      await Address.update(
        { isDefault: false },
        { where: { userId, isDefault: true } }
      );
    }

    // Update address
    await address.update(addressData);

    res.status(200).json({
      status: 'success',
      data: address,
    });
  } catch (error) {
    next(error);
  }
};

// Delete address
const deleteAddress = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Find address
    const address = await Address.findOne({
      where: { id, userId },
    });

    if (!address) {
      throw new AppError('Không tìm thấy địa chỉ', 404);
    }

    // Delete address
    await address.destroy();

    // If deleted address was default, set another address as default
    if (address.isDefault) {
      const anotherAddress = await Address.findOne({
        where: { userId },
        order: [['createdAt', 'DESC']],
      });

      if (anotherAddress) {
        anotherAddress.isDefault = true;
        await anotherAddress.save();
      }
    }

    res.status(200).json({
      status: 'success',
      message: 'Xóa địa chỉ thành công',
    });
  } catch (error) {
    next(error);
  }
};

// Set default address
const setDefaultAddress = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Find address
    const address = await Address.findOne({
      where: { id, userId },
    });

    if (!address) {
      throw new AppError('Không tìm thấy địa chỉ', 404);
    }

    // Update other addresses
    await Address.update(
      { isDefault: false },
      { where: { userId, isDefault: true } }
    );

    // Set as default
    address.isDefault = true;
    await address.save();

    res.status(200).json({
      status: 'success',
      data: address,
    });
  } catch (error) {
    next(error);
  }
};
const getSellerProfile = async (req, res, next) => {
  try {
    const user = req.user;

    res.status(200).json({
      status: 'success',
      data: {
        id: user.id,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
        avatar: user.avatar || '',
        role: user.role || '',
      },
    });
  } catch (error) {
    next(error);
  }
};
const updateSellerProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { firstName, lastName, phone, avatar } = req.body;

    const { User } = require('../models');

    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'Không tìm thấy người dùng',
      });
    }

    user.firstName = firstName ?? user.firstName;
    user.lastName = lastName ?? user.lastName;
    user.phone = phone ?? user.phone;
    user.avatar = avatar ?? user.avatar;

    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'Cập nhật thông tin seller thành công',
      data: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};
const getSellerStore = async (req, res, next) => {
  try {
    const { sellerId } = req.params;

    const seller = await User.findByPk(sellerId, {
      attributes: [
        'id',
        'firstName',
        'lastName',
        'email',
        'phone',
        'avatar',
        'role',
        'shop_name',
        'shop_description',
        'shop_avatar',
        'shop_banner',
        'shop_phone',
        'shop_address',
      ],
    });

    if (!seller || seller.role !== 'seller') {
      return res.status(404).json({
        status: 'fail',
        message: 'Không tìm thấy gian hàng người bán',
      });
    }

    const products = await Product.findAll({
      where: { seller_id: sellerId },
      order: [['createdAt', 'DESC']],
    });

    const topSellingRaw = await OrderItem.findAll({
      include: [
        {
          model: Product,
          where: { seller_id: sellerId },
          attributes: ['id', 'name', 'price', 'compareAtPrice', 'thumbnail', 'images', 'slug'],
        },
        {
          model: Order,
          where: { status: 'delivered' },
          attributes: ['id', 'status'],
        },
      ],
    });

    const topMap = {};

    topSellingRaw.forEach((item) => {
      const product = item.Product;
      if (!product) return;

      const productId = product.id;
      const quantity = Number(item.quantity) || 0;

      if (!topMap[productId]) {
        topMap[productId] = {
  id: product.id,
  name: product.name,
  price: product.price,
  compareAtPrice: product.compareAtPrice,
  thumbnail: product.thumbnail,
  images: product.images,
  slug: product.slug,
  soldCount: 0,
};
      }

      topMap[productId].soldCount += quantity;
    });

  let topProducts = Object.values(topMap)
  .sort((a, b) => b.soldCount - a.soldCount);

// Nếu chưa đủ 4 sản phẩm → lấy thêm từ products
if (topProducts.length < 4) {
  const existIds = topProducts.map(p => p.id);

  const extra = products
    .filter(p => !existIds.includes(p.id))
    .slice(0, 4 - topProducts.length)
    .map(p => ({
      id: p.id,
      name: p.name,
      price: p.price,
      thumbnail: p.thumbnail,
      images: p.images,
      slug: p.slug,
      soldCount: 0,
    }));

  topProducts = [...topProducts, ...extra];
}

    // fallback nếu chưa có dữ liệu bán
    if (topProducts.length === 0) {
      topProducts = products.slice(0, 4).map((product) => ({
  id: product.id,
  name: product.name,
  price: product.price,
  compareAtPrice: product.compareAtPrice,
  thumbnail: product.thumbnail,
  images: product.images,
  slug: product.slug,
  soldCount: 0,
}));
    }

    return res.status(200).json({
      status: 'success',
      data: {
        seller: {
          id: seller.id,
          firstName: seller.firstName || '',
          lastName: seller.lastName || '',
          name: `${seller.firstName || ''} ${seller.lastName || ''}`.trim(),
          email: seller.email || '',
          phone: seller.phone || '',
          avatar: seller.avatar || '',
          shop_name: seller.shop_name || '',
          shop_description: seller.shop_description || '',
          shop_avatar: seller.shop_avatar || '',
          shop_banner: seller.shop_banner || '',
          shop_phone: seller.shop_phone || '',
          shop_address: seller.shop_address || '',
        },
        products,
        topProducts,
      },
    });
  } catch (error) {
    next(error);
  }
};
const getAdminSellerDetail = async (req, res, next) => {
  try {
    const { sellerId } = req.params;

    const seller = await User.findOne({
      where: {
        id: sellerId,
        role: 'seller',
      },
      attributes: [
        'id',
        'firstName',
        'lastName',
        'email',
        'phone',
        'avatar',
        'role',
        'shop_name',
        'shop_description',
        'shop_avatar',
        'shop_banner',
        'shop_phone',
        'shop_address',
        'createdAt',
      ],
    });

    if (!seller) {
      throw new AppError('Không tìm thấy seller', 404);
    }

    const products = await Product.findAll({
      where: {
        seller_id: sellerId,
      },
      order: [['createdAt', 'DESC']],
    });

    const orderItems = await OrderItem.findAll({
      include: [
        {
          model: Product,
          attributes: ['id', 'name', 'thumbnail', 'seller_id'],
          where: {
            seller_id: sellerId,
          },
        },
        {
          model: Order,
          attributes: [
            'id',
            'number',
            'status',
            'paymentStatus',
            'paymentMethod',
            'subtotal',
            'commissionAmount',
            'sellerNetAmount',
            'total',
            'createdAt',
            'userId',
          ],
          include: [
            {
              model: User,
              attributes: ['id', 'firstName', 'lastName', 'email', 'phone'],
            },
          ],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    const payouts = await Payout.findAll({
      where: {
        sellerId,
      },
      order: [['createdAt', 'DESC']],
    });

    const orderMap = {};
    let grossRevenue = 0;
    let totalCommission = 0;
    let netRevenue = 0;

    orderItems.forEach((item) => {
      const order = item.Order;
      const product = item.Product;

      if (!order) return;

      const orderId = order.id;
      const quantity = Number(item.quantity) || 0;
      const price = Number(item.price) || 0;
      const itemTotal = price * quantity;

      if (!orderMap[orderId]) {
        orderMap[orderId] = {
          id: order.id,
          number: order.number,
          status: order.status,
          paymentStatus: order.paymentStatus,
          paymentMethod: order.paymentMethod,
          subtotal: Number(order.subtotal || 0),
          commissionAmount: Number(order.commissionAmount || 0),
          sellerNetAmount: Number(order.sellerNetAmount || 0),
          total: Number(order.total || 0),
          createdAt: order.createdAt,
          customer: order.User
            ? {
                id: order.User.id,
                name: `${order.User.firstName || ''} ${order.User.lastName || ''}`.trim(),
                email: order.User.email || '',
                phone: order.User.phone || '',
              }
            : null,
          items: [],
        };
      }

      orderMap[orderId].items.push({
        id: item.id,
        orderId: item.orderId,
        productId: item.productId,
        productName: product?.name || item.name || 'Sản phẩm',
        image: product?.thumbnail || item.image || '',
        quantity,
        price,
        total: itemTotal,
      });

      // Doanh thu chỉ tính đơn delivered để khớp seller revenue/payout
      if (order.status === 'delivered') {
        const orderSubtotal = Number(order.subtotal || 0);
        const orderCommission = Number(order.commissionAmount || 0);

        const itemCommission =
          orderSubtotal > 0 && orderCommission > 0
            ? (itemTotal / orderSubtotal) * orderCommission
            : itemTotal * 0.05;

        grossRevenue += itemTotal;
        totalCommission += itemCommission;
        netRevenue += itemTotal - itemCommission;
      }
    });

    const orders = Object.values(orderMap);

    const totalPaid = payouts
      .filter((payout) => payout.status === 'paid')
      .reduce((sum, payout) => sum + Number(payout.amount || 0), 0);

    const pendingPayout = payouts
      .filter((payout) => payout.status === 'pending')
      .reduce((sum, payout) => sum + Number(payout.amount || 0), 0);

    const availableToRequest = Math.max(
      0,
      netRevenue - totalPaid - pendingPayout
    );

    const summary = {
      totalProducts: products.length,
      totalOrders: orders.length,
      pendingOrders: orders.filter(
        (order) => order.status === 'pending' || order.status === 'processing'
      ).length,
      shippedOrders: orders.filter((order) => order.status === 'shipped').length,
      deliveredOrders: orders.filter((order) => order.status === 'delivered')
        .length,
      cancelledOrders: orders.filter((order) => order.status === 'cancelled')
        .length,
      grossRevenue,
      totalCommission,
      netRevenue,
      totalPaid,
      pendingPayout,
      availableToRequest,
      totalPayouts: payouts.length,
    };

    res.status(200).json({
      status: 'success',
      data: {
        seller,
        summary,
        products,
        orders,
        payouts,
      },
    });
  } catch (error) {
    console.error('GET ADMIN SELLER DETAIL ERROR:', error);
    next(error);
  }
};
module.exports = {
  updateProfile,
  changePassword,
  getAllSellers,
  getProductsBySeller,
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  getSellerProfile,
updateSellerProfile,
getSellerStore,
getMyShopProfile,
updateMyShopProfile,
getAdminSellerDetail,
};