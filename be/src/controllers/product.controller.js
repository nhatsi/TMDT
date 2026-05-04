const {
  Product,
  Category,
  ProductCategory,
  ProductAttribute,
  ProductVariant,
  ProductSpecification,
  Review,
  OrderItem,
  User,
  Order,
  RefundRequest,
  UserBehavior,
  Payout,
  sequelize,
} = require('../models');
const { AppError } = require('../middlewares/errorHandler');
const { Op } = require('sequelize');

const { trackUserBehavior } = require('../services/userBehavior.service');


// Get all products with pagination
const getAllProducts = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      sort = 'createdAt',
      order = 'DESC',
      category,
      search,
      minPrice,
      maxPrice,
      inStock,
      featured,
      status,
    } = req.query;

    // Build filter conditions
    const whereConditions = {};
          // 🔥 Filter theo seller
      if (req.user && req.user.role !== 'admin') {
        whereConditions.seller_id = req.user.id;
      }
      const includeConditions = [];

    // Search filter
    if (search) {
      whereConditions[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
        { shortDescription: { [Op.iLike]: `%${search}%` } },
        // { searchKeywords: { [Op.contains]: [search] } },
        { searchKeywords: { [Op.iLike]: `%${search}%` } },
      ];
    }

    // Price filter
    if (minPrice) {
      whereConditions.price = {
        ...whereConditions.price,
        [Op.gte]: parseFloat(minPrice),
      };
    }

    if (maxPrice) {
      whereConditions.price = {
        ...whereConditions.price,
        [Op.lte]: parseFloat(maxPrice),
      };
    }

    // Stock filter
    if (inStock !== undefined) {
      whereConditions.inStock = inStock === 'true';
    }

    // Featured filter
    if (featured !== undefined) {
      whereConditions.featured = featured === 'true';
    }

    // Status filter - mặc định chỉ lấy sản phẩm active
    if (status !== undefined) {
      whereConditions.status = status;
    } else {
      whereConditions.status = 'active';
    }

    // Category filter
    if (category) {
      // Kiểm tra xem category có phải là UUID hợp lệ không
      const isValidUUID =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          category
        );

      if (isValidUUID) {
        // Nếu là UUID, tìm theo ID
        includeConditions.push({
          association: 'categories',
          where: { id: category },
          through: { attributes: [] },
        });
      } else {
        // Nếu không phải UUID, tìm theo slug
        includeConditions.push({
          association: 'categories',
          where: { slug: category },
          through: { attributes: [] },
        });
      }
    } else {
      includeConditions.push({
        association: 'categories',
        through: { attributes: [] },
      });
    }

    // Include attributes for product details (not for filtering)
    includeConditions.push({
      association: 'attributes',
      required: false,
    });

    // Include variants for price range calculation
    includeConditions.push({
      association: 'variants',
      required: false,
    });

    // Include reviews for ratings
    includeConditions.push({
      association: 'reviews',
      attributes: ['rating'],
    });

    // Get products
    const { count, rows: productsRaw } = await Product.findAndCountAll({
      where: whereConditions,
      include: includeConditions,
      distinct: true,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      order: [[sort, order]],
    });

    // Process products to add ratings
    const products = productsRaw.map((product) => {
      const productJson = product.toJSON();

      // Calculate average rating
      const ratings = {
        average: 0,
        count: 0,
      };

      if (productJson.reviews && productJson.reviews.length > 0) {
        const totalRating = productJson.reviews.reduce(
          (sum, review) => sum + review.rating,
          0
        );
        ratings.average = parseFloat(
          (totalRating / productJson.reviews.length).toFixed(1)
        );
        ratings.count = productJson.reviews.length;
      }

      // Use variant price if available, otherwise use product price
      let displayPrice = parseFloat(productJson.price) || 0;
      let compareAtPrice = parseFloat(productJson.compareAtPrice) || null;

      if (productJson.variants && productJson.variants.length > 0) {
        // Sort variants by price (ascending) to get the lowest price first
        const sortedVariants = productJson.variants.sort(
          (a, b) => parseFloat(a.price) - parseFloat(b.price)
        );
        displayPrice = parseFloat(sortedVariants[0].price) || displayPrice;
      }

      // Add ratings and remove reviews from response
      delete productJson.reviews;

      return {
        ...productJson,
        price: displayPrice,
        compareAtPrice,
        ratings,
      };
    });

    res.status(200).json({
      status: 'success',
      data: {
        total: count,
        pages: Math.ceil(count / limit),
        currentPage: parseInt(page),
        products,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get product by ID
const getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const product = await Product.findByPk(id, {
      include: [
        {
  model: User,
  as: 'seller',
  attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'avatar'],
},
        {
          association: 'categories',
          through: { attributes: [] },
        },
        {
          association: 'attributes',
        },
        {
          association: 'variants',
        },
        {
          association: 'productSpecifications',
        },
        {
          association: 'reviews',
          include: [
            {
              association: 'user',
              attributes: ['id', 'firstName', 'lastName', 'avatar'],
            },
          ],
        },
        {
          association: 'warrantyPackages',
          through: {
            attributes: ['isDefault'],
            as: 'productWarranty',
          },
          where: { isActive: true },
          required: false,
        },
      ],
    });

    if (!product) {
      throw new AppError('Không tìm thấy sản phẩm', 404);
    }
    if (req.user) {
  await trackUserBehavior({
    userId: req.user.id,
    productId: product.id,
    actionType: 'view',
    metadata: {
      source: 'product_detail_id',
    },
  });
}

    // Process product to add ratings calculation
    const productJson = product.toJSON();

    // Calculate average rating
    const ratings = {
      average: 0,
      count: 0,
    };

    if (productJson.reviews && productJson.reviews.length > 0) {
      const totalRating = productJson.reviews.reduce(
        (sum, review) => sum + review.rating,
        0
      );
      ratings.average = parseFloat(
        (totalRating / productJson.reviews.length).toFixed(1)
      );
      ratings.count = productJson.reviews.length;
    }

    // Add ratings to product data
    const productWithRatings = {
      ...productJson,
      ratings,
    };

    res.status(200).json({
      status: 'success',
      data: productWithRatings,
    });
  } catch (error) {
    next(error);
  }
};

// Get product by slug
const getProductBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { skuId } = req.query;

    const product = await Product.findOne({
      where: { slug },
      include: [
        {
  model: User,
  as: 'seller',
  attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'avatar'],
},
        {
          association: 'categories',
          through: { attributes: [] },
        },
        {
          association: 'attributes',
        },
        {
          association: 'variants',
          where: { isAvailable: true },
          required: false,
        },
        {
          association: 'reviews',
          include: [
            {
              association: 'user',
              attributes: ['id', 'firstName', 'lastName', 'avatar'],
            },
          ],
        },
        {
          association: 'warrantyPackages',
          through: {
            attributes: ['isDefault'],
            as: 'productWarranty',
          },
          where: { isActive: true },
          required: false,
        },
      ],
    });

    if (!product) {
      throw new AppError('Không tìm thấy sản phẩm', 404);
    }
    if (req.user) {
  await trackUserBehavior({
    userId: req.user.id,
    productId: product.id,
    actionType: 'view',
    metadata: {
      source: 'product_detail_slug',
      slug,
    },
  });
}

    // Process product to add ratings calculation
    const productJson = product.toJSON();

    // Calculate average rating
    const ratings = {
      average: 0,
      count: 0,
    };

    if (productJson.reviews && productJson.reviews.length > 0) {
      const totalRating = productJson.reviews.reduce(
        (sum, review) => sum + review.rating,
        0
      );
      ratings.average = parseFloat(
        (totalRating / productJson.reviews.length).toFixed(1)
      );
      ratings.count = productJson.reviews.length;
    }

    // Handle variant-based product
    let responseData = {
      ...productJson,
      ratings,
    };

    if (
      productJson.isVariantProduct &&
      productJson.variants &&
      productJson.variants.length > 0
    ) {
      // Find selected variant
      let selectedVariant = null;

      if (skuId) {
        selectedVariant = productJson.variants.find((v) => v.id === skuId);
      }

      // If no variant found by skuId, use default or first variant
      if (!selectedVariant) {
        selectedVariant =
          productJson.variants.find((v) => v.isDefault) ||
          productJson.variants[0];
      }

      if (selectedVariant) {
        // Override product data with variant data
        responseData = {
          ...responseData,
          // Current variant info
          currentVariant: {
            id: selectedVariant.id,
            name: selectedVariant.variantName,
            fullName: `${productJson.baseName || productJson.name} - ${selectedVariant.variantName}`,
            price: selectedVariant.price,
            compareAtPrice: selectedVariant.compareAtPrice,
            sku: selectedVariant.sku,
            stockQuantity: selectedVariant.stockQuantity,
            specifications: {
              ...productJson.specifications,
              ...selectedVariant.specifications,
            },
            images:
              selectedVariant.images && selectedVariant.images.length > 0
                ? selectedVariant.images
                : productJson.images,
          },
          // All available variants
          availableVariants: productJson.variants.map((v) => ({
            id: v.id,
            name: v.variantName,
            price: v.price,
            compareAtPrice: v.compareAtPrice,
            stockQuantity: v.stockQuantity,
            isDefault: v.isDefault,
            sku: v.sku,
          })),
          // Override main product fields with selected variant
          name: `${productJson.baseName || productJson.name} - ${selectedVariant.variantName}`,
          price: selectedVariant.price,
          compareAtPrice: selectedVariant.compareAtPrice,
          stockQuantity: selectedVariant.stockQuantity,
          sku: selectedVariant.sku,
          specifications: {
            ...productJson.specifications,
            ...selectedVariant.specifications,
          },
          images:
            selectedVariant.images && selectedVariant.images.length > 0
              ? selectedVariant.images
              : productJson.images,
        };
      }
    }

    res.status(200).json({
      status: 'success',
      data: responseData,
    });
  } catch (error) {
    next(error);
  }
};

// Create product
const createProduct = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try { 
    const {
      name,
      baseName,
      description,
      shortDescription,
      price,
      compareAtPrice,
      images,
      thumbnail,
      categoryIds,
      inStock,
      stockQuantity,
      featured,
      searchKeywords,
      seoTitle,
      seoDescription,
      seoKeywords,
      specifications,
      parentAttributes,
      attributes,
      variants,
      warrantyPackageIds,
    } = req.body;

    // Determine if this is a variant product
    // Chuẩn hóa specifications
const specificationsArray = Array.isArray(specifications)
  ? specifications.filter((spec) => spec.name && spec.value)
  : specifications && typeof specifications === 'object'
    ? Object.entries(specifications).map(([name, value]) => ({
        name,
        value,
        category: 'General',
      }))
    : [];

const specificationsObject = specificationsArray.reduce((obj, spec) => {
  if (spec.name && spec.value) {
    obj[spec.name] = spec.value;
  }
  return obj;
}, {});

// Determine if this is a variant product
const isVariantProduct = variants && variants.length > 0;

    // Create product
    const product = await Product.create(
      {
        name,
        baseName: baseName || name,
         seller_id: req.user.id,   // 🔥 THÊM DÒNG NÀY
        description,
        shortDescription,
        price: isVariantProduct ? 0 : price, // Set to 0 if using variants
        compareAtPrice: isVariantProduct ? null : compareAtPrice,
        images: images || [],
        thumbnail,
        inStock: isVariantProduct ? true : inStock, // Always true for variant products
        stockQuantity: isVariantProduct ? 0 : stockQuantity, // Set to 0 if using variants
        featured,
        searchKeywords: searchKeywords || [],
        seoTitle,
        seoDescription,
        seoKeywords: seoKeywords || [],
        isVariantProduct,
        specifications: specificationsObject,
      },
      { transaction }
    );

    // Add categories
    if (categoryIds && categoryIds.length > 0) {
      const categories = await Category.findAll({
        where: { id: { [Op.in]: categoryIds } },
      });

      if (categories.length !== categoryIds.length) {
        throw new AppError('Một hoặc nhiều danh mục không tồn tại', 400);
      }

      await product.setCategories(categories, { transaction });
    }

   // Add specifications
if (specificationsArray.length > 0) {
  const productSpecifications = specificationsArray.map((spec, index) => ({
    productId: product.id,
    name: spec.name,
    value: spec.value,
    category: spec.category || 'General',
    sortOrder: index,
  }));

  await ProductSpecification.bulkCreate(productSpecifications, {
    transaction,
  });
}

    // Add parent attributes
    if (parentAttributes && parentAttributes.length > 0) {
      const productParentAttributes = parentAttributes.map((attr, index) => ({
        productId: product.id,
        name: attr.name,
        type: attr.type,
        values: attr.values,
        required: attr.required,
        sortOrder: index,
      }));

      await ProductAttribute.bulkCreate(productParentAttributes, {
        transaction,
      });
    }

    // Add legacy attributes (for backward compatibility)
    if (attributes && attributes.length > 0) {
      const productAttributes = attributes.map((attr) => ({
        ...attr,
        productId: product.id,
      }));

      await ProductAttribute.bulkCreate(productAttributes, { transaction });
    }

    // Add variants
    if (variants && variants.length > 0) {
    const productVariants = variants.map((variant, index) => {
  const variantName =
    variant.name ||
    variant.variantName ||
    variant.displayName ||
    `Biến thể ${index + 1}`;

  return {
    productId: product.id,

    // Cột name trong bảng product_variants đang NOT NULL
    name: variantName,

    sku: variant.sku || `${product.id}-VAR-${index + 1}`,

    variantName,
    displayName: variant.displayName || variantName,

    price: parseFloat(variant.price) || 0,
    compareAtPrice: variant.compareAtPrice
      ? parseFloat(variant.compareAtPrice)
      : null,

    stockQuantity: parseInt(variant.stockQuantity || variant.stock) || 0,

    isDefault: variant.isDefault || index === 0,
    isAvailable: variant.isAvailable !== false,

    attributes: variant.attributes || {},
    attributeValues: variant.attributeValues || {},

    specifications:
      variant.specifications && typeof variant.specifications === 'object'
        ? variant.specifications
        : {},

    images: variant.images || [],
    sortOrder: variant.sortOrder || index,
  };
});
      await ProductVariant.bulkCreate(productVariants, { transaction });
    }

    // Add warranty packages
    if (warrantyPackageIds && warrantyPackageIds.length > 0) {
      const { WarrantyPackage } = require('../models');
      const warranties = await WarrantyPackage.findAll({
        where: { id: { [Op.in]: warrantyPackageIds } },
      });

      if (warranties.length !== warrantyPackageIds.length) {
        throw new AppError('Một hoặc nhiều gói bảo hành không tồn tại', 400);
      }

      await product.setWarrantyPackages(warranties, { transaction });
    }

    await transaction.commit();

    // Get complete product with associations
    const createdProduct = await Product.findByPk(product.id, {
      include: [
        {
          association: 'categories',
          through: { attributes: [] },
        },
        {
          association: 'attributes',
        },
        {
          association: 'variants',
        },
        {
          association: 'productSpecifications',
        },
        {
          association: 'warrantyPackages',
          through: {
            attributes: ['isDefault'],
            as: 'productWarranty',
          },
          where: { isActive: true },
          required: false,
        },
      ],
    });

    res.status(201).json({
      status: 'success',
      data: createdProduct,
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

// Update product
const updateProduct = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const {
      name,
      description,
      shortDescription,
      price,
      compareAtPrice,
      images,
      thumbnail,
      categoryIds,
      inStock,
      stockQuantity,
      featured,
      searchKeywords,
      seoTitle,
      seoDescription,
      seoKeywords,
      attributes,
      variants,
      warrantyPackageIds,
    } = req.body;

    // Debug request body
    console.log('UpdateProduct request body:', {
      compareAtPrice,
      hasCompareAtPrice: req.body.hasOwnProperty('compareAtPrice'),
      // Note: comparePrice is not a valid field in the Product model
    });

    // Find product
   let product;

if (req.user.role === 'admin') {
  product = await Product.findByPk(id);
} else {
  product = await Product.findOne({
    where: {
      id,
      seller_id: req.user.id,
    },
  });
}
    
    if (!product) {
      throw new AppError('Không tìm thấy sản phẩm', 404);
    }

    // Update product - chỉ cập nhật các trường có trong request
    const updateData = {};

    // Chỉ cập nhật các trường có trong request body
    if (req.body.hasOwnProperty('name')) updateData.name = name;
    if (req.body.hasOwnProperty('description'))
      updateData.description = description;
    if (req.body.hasOwnProperty('shortDescription'))
      updateData.shortDescription = shortDescription;
    if (req.body.hasOwnProperty('price')) updateData.price = price;
    if (req.body.hasOwnProperty('compareAtPrice'))
      updateData.compareAtPrice = compareAtPrice;
    // Removed comparePrice update as it's not in the Product model
    if (req.body.hasOwnProperty('images')) updateData.images = images;
    if (req.body.hasOwnProperty('thumbnail')) updateData.thumbnail = thumbnail;
    if (req.body.hasOwnProperty('inStock')) updateData.inStock = inStock;
    if (req.body.hasOwnProperty('stockQuantity'))
      updateData.stockQuantity = stockQuantity;
    if (req.body.hasOwnProperty('featured')) updateData.featured = featured;
    if (req.body.hasOwnProperty('searchKeywords'))
      updateData.searchKeywords = searchKeywords;
    if (req.body.hasOwnProperty('seoTitle')) updateData.seoTitle = seoTitle;
    if (req.body.hasOwnProperty('seoDescription'))
      updateData.seoDescription = seoDescription;
    if (req.body.hasOwnProperty('seoKeywords'))
      updateData.seoKeywords = seoKeywords;

    // Cập nhật sản phẩm với dữ liệu mới
    await product.update(updateData, { transaction });

    // Update categories - chỉ khi categoryIds được gửi trong request
    if (req.body.hasOwnProperty('categoryIds') && categoryIds) {
      const categories = await Category.findAll({
        where: { id: { [Op.in]: categoryIds } },
      });

      if (categories.length !== categoryIds.length) {
        throw new AppError('Một hoặc nhiều danh mục không tồn tại', 400);
      }

      await product.setCategories(categories, { transaction });
    }

    // Update attributes - chỉ khi attributes được gửi trong request
    if (req.body.hasOwnProperty('attributes')) {
      // Delete existing attributes
      await ProductAttribute.destroy({
        where: { productId: id },
        transaction,
      });

      // Create new attributes
      if (attributes && attributes.length > 0) {
        const productAttributes = attributes.map((attr) => ({
          ...attr,
          productId: id,
        }));

        await ProductAttribute.bulkCreate(productAttributes, { transaction });
      }
    }

    // Update variants - chỉ khi variants được gửi trong request
    if (req.body.hasOwnProperty('variants')) {
      // Delete existing variants
      await ProductVariant.destroy({
        where: { productId: id },
        transaction,
      });

      // Create new variants
      if (variants && variants.length > 0) {
        const productVariants = variants.map((variant) => ({
          ...variant,
          productId: id,
        }));

        await ProductVariant.bulkCreate(productVariants, { transaction });
      }
    }

    // Update warranty packages - chỉ khi warrantyPackageIds được gửi trong request
    if (req.body.hasOwnProperty('warrantyPackageIds')) {
      console.log('🛡️ Processing warranty packages:', warrantyPackageIds);

      if (warrantyPackageIds && warrantyPackageIds.length > 0) {
        // Verify warranty packages exist
        const { WarrantyPackage } = require('../models');
        const warranties = await WarrantyPackage.findAll({
          where: { id: { [Op.in]: warrantyPackageIds } },
        });

        console.log(
          '✅ Found warranties:',
          warranties.map((w) => ({ id: w.id, name: w.name }))
        );
        console.log(
          '📊 Expected:',
          warrantyPackageIds.length,
          'Found:',
          warranties.length
        );

        if (warranties.length !== warrantyPackageIds.length) {
          console.log('❌ Warranty package count mismatch!');
          throw new AppError('Một hoặc nhiều gói bảo hành không tồn tại', 400);
        }

        await product.setWarrantyPackages(warranties, { transaction });
        console.log('💾 Warranty packages updated successfully');
      } else {
        // Remove all warranty packages if empty array is sent
        console.log('🗑️ Removing all warranty packages');
        await product.setWarrantyPackages([], { transaction });
      }
    } else {
      console.log(
        '⏭️ No warrantyPackageIds in request, skipping warranty update'
      );
    }

    await transaction.commit();

    // Get updated product with associations
    const updatedProduct = await Product.findByPk(id, {
      include: [
        {
          association: 'categories',
          through: { attributes: [] },
        },
        {
          association: 'attributes',
        },
        {
          association: 'variants',
        },
        {
          association: 'warrantyPackages',
          through: {
            attributes: ['isDefault'],
            as: 'productWarranty',
          },
          where: { isActive: true },
          required: false,
        },
      ],
    });

    res.status(200).json({
      status: 'success',
      data: updatedProduct,
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

// Delete product
const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Find product
    let product;

if (req.user.role === 'admin') {
  product = await Product.findByPk(id);
} else {
  product = await Product.findOne({
    where: {
      id,
      seller_id: req.user.id,
    },
  });
}
    if (!product) {
      throw new AppError('Không tìm thấy sản phẩm', 404);
    }

    // Delete product
    await product.destroy();

    res.status(200).json({
      status: 'success',
      message: 'Xóa sản phẩm thành công',
    });
  } catch (error) {
    next(error);
  }
};

// Get featured products
const getFeaturedProducts = async (req, res, next) => {
  try {
    const { limit = 8 } = req.query;

    const productsRaw = await Product.findAll({
      where: { featured: true },
      include: [
        {
          association: 'categories',
          through: { attributes: [] },
        },
        {
          association: 'reviews',
          attributes: ['rating'],
        },
        {
          association: 'variants',
          attributes: ['id', 'name', 'price', 'stockQuantity', 'sku'],
        },
      ],
      limit: parseInt(limit),
      order: [['createdAt', 'DESC']],
    });

    // Process products to add ratings
    const products = productsRaw.map((product) => {
      const productJson = product.toJSON();

      // Calculate average rating
      const ratings = {
        average: 0,
        count: 0,
      };

      if (productJson.reviews && productJson.reviews.length > 0) {
        const totalRating = productJson.reviews.reduce(
          (sum, review) => sum + review.rating,
          0
        );
        ratings.average = parseFloat(
          (totalRating / productJson.reviews.length).toFixed(1)
        );
        ratings.count = productJson.reviews.length;
      }

      // Use variant price if available, otherwise use product price
      let displayPrice = parseFloat(productJson.price) || 0;
      let compareAtPrice = parseFloat(productJson.compareAtPrice) || null;

      if (productJson.variants && productJson.variants.length > 0) {
        // Sort variants by price (ascending) to get the lowest price first
        const sortedVariants = productJson.variants.sort(
          (a, b) => parseFloat(a.price) - parseFloat(b.price)
        );
        displayPrice = parseFloat(sortedVariants[0].price) || displayPrice;
      }

      // Add ratings and remove reviews from response
      delete productJson.reviews;

      return {
        ...productJson,
        price: displayPrice,
        compareAtPrice,
        ratings,
      };
    });

    res.status(200).json({
      status: 'success',
      data: products,
    });
  } catch (error) {
    next(error);
  }
};

// Get related products
const getRelatedProducts = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { limit = 4 } = req.query;

    // Find product
    const product = await Product.findByPk(id, {
      include: [
        {
          association: 'categories',
          through: { attributes: [] },
        },
      ],
    });

    if (!product) {
      throw new AppError('Không tìm thấy sản phẩm', 404);
    }

    // Get category IDs
    const categoryIds = product.categories.map((category) => category.id);

    let relatedProductsRaw = [];

    // Nếu sản phẩm có danh mục, tìm sản phẩm liên quan theo danh mục
    if (categoryIds.length > 0) {
      relatedProductsRaw = await Product.findAll({
        include: [
          {
            association: 'categories',
            where: { id: { [Op.in]: categoryIds } },
            through: { attributes: [] },
          },
          {
            association: 'reviews',
            attributes: ['rating'],
          },
        ],
        where: {
          id: { [Op.ne]: id }, // Exclude current product
        },
        limit: parseInt(limit),
        order: [['createdAt', 'DESC']],
      });
    }

    // Nếu không tìm thấy sản phẩm liên quan theo danh mục hoặc sản phẩm không có danh mục
    // Trả về các sản phẩm mới nhất hoặc sản phẩm nổi bật
    if (relatedProductsRaw.length === 0) {
      console.log(
        `No related products found for product ${id}. Returning recent products instead.`
      );

      relatedProductsRaw = await Product.findAll({
        include: [
          {
            association: 'reviews',
            attributes: ['rating'],
          },
        ],
        where: {
          id: { [Op.ne]: id }, // Exclude current product
          status: 'active', // Chỉ lấy sản phẩm đang hoạt động
        },
        limit: parseInt(limit),
        order: [
          ['featured', 'DESC'], // Ưu tiên sản phẩm nổi bật
          ['createdAt', 'DESC'], // Sau đó là sản phẩm mới nhất
        ],
      });
    }

    // Process products to add ratings
    const relatedProducts = relatedProductsRaw.map((product) => {
      const productJson = product.toJSON();

      // Calculate average rating
      const ratings = {
        average: 0,
        count: 0,
      };

      if (productJson.reviews && productJson.reviews.length > 0) {
        const totalRating = productJson.reviews.reduce(
          (sum, review) => sum + review.rating,
          0
        );
        ratings.average = parseFloat(
          (totalRating / productJson.reviews.length).toFixed(1)
        );
        ratings.count = productJson.reviews.length;
      }

      // Add ratings and remove reviews from response
      delete productJson.reviews;

      return {
        ...productJson,
        ratings,
      };
    });

    res.status(200).json({
      status: 'success',
      data: relatedProducts,
    });
  } catch (error) {
    next(error);
  }
};

// Search products
const searchProducts = async (req, res, next) => {
  try {
    const { q, page = 1, limit = 10 } = req.query;

    if (!q) {
      throw new AppError('Từ khóa tìm kiếm là bắt buộc', 400);
    }
    if (req.user) {
  await trackUserBehavior({
    userId: req.user.id,
    productId: null,
    actionType: 'search',
    metadata: {
      keyword: q,
    },
  });
}

    const { count, rows: products } = await Product.findAndCountAll({
      where: {
        [Op.or]: [
          { name: { [Op.iLike]: `%${q}%` } },
          { description: { [Op.iLike]: `%${q}%` } },
          { shortDescription: { [Op.iLike]: `%${q}%` } },
          // { searchKeywords: { [Op.contains]: [q] } },
          { searchKeywords: { [Op.iLike]: `%${q}%` } },
        ],
      },
      include: [
        {
          association: 'categories',
          through: { attributes: [] },
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
        products,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get new arrivals
const getNewArrivals = async (req, res, next) => {
  try {
    const { limit = 8 } = req.query;

    const productsRaw = await Product.findAll({
      include: [
        {
          association: 'categories',
          through: { attributes: [] },
        },
        {
          association: 'reviews',
          attributes: ['rating'],
        },
      ],
      limit: parseInt(limit),
      order: [['createdAt', 'DESC']],
    });

    // Process products to add ratings
    const products = productsRaw.map((product) => {
      const productJson = product.toJSON();

      // Calculate average rating
      const ratings = {
        average: 0,
        count: 0,
      };

      if (productJson.reviews && productJson.reviews.length > 0) {
        const totalRating = productJson.reviews.reduce(
          (sum, review) => sum + review.rating,
          0
        );
        ratings.average = parseFloat(
          (totalRating / productJson.reviews.length).toFixed(1)
        );
        ratings.count = productJson.reviews.length;
      }

      // Add ratings and remove reviews from response
      delete productJson.reviews;

      return {
        ...productJson,
        ratings,
      };
    });

    res.status(200).json({
      status: 'success',
      data: products,
    });
  } catch (error) {
    next(error);
  }
};

// Get best sellers
const getBestSellers = async (req, res, next) => {
  try {
    const { limit = 10, period = 'month' } = req.query;

    // Calculate date range based on period
    const now = new Date();
    let startDate;

    switch (period) {
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case 'year':
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      default:
        startDate = new Date(now.setMonth(now.getMonth() - 1));
    }

    // Get best selling products based on order items
    const bestSellers = await sequelize.query(
      `
      SELECT 
        p.id, 
        p.name, 
        p.slug, 
        p.price, 
        p.compare_at_price, 
        p.thumbnail, 
        p.in_stock,
        p.stock_quantity,
        p.featured,
        COUNT(oi.product_id) as sales_count,
        SUM(oi.quantity) as units_sold
      FROM products p
      JOIN order_items oi ON p.id = oi.product_id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.status != 'cancelled'
      AND o.created_at >= :startDate
      GROUP BY p.id
      ORDER BY units_sold DESC
      LIMIT :limit
      `,
      {
        replacements: { startDate, limit: parseInt(limit) },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    // If no best sellers found, return newest products
    if (bestSellers.length === 0) {
      return await getNewArrivals(req, res, next);
    }

    // Get product IDs
    const productIds = bestSellers.map((product) => product.id);

    // Get full product details
    const products = await Product.findAll({
      where: { id: { [Op.in]: productIds } },
      include: [
        {
          association: 'categories',
          through: { attributes: [] },
        },
      ],
      order: [
        [
          sequelize.literal(
            `CASE ${productIds
              .map((id, index) => `WHEN id = ${id} THEN ${index}`)
              .join(' ')} END`
          ),
        ],
      ],
    });

    res.status(200).json({
      status: 'success',
      data: products,
    });
  } catch (error) {
    next(error);
  }
};

// Get deals (products with discounts)
const getDeals = async (req, res, next) => {
  try {
    const { minDiscount = 5, limit = 12, sort = 'discount_desc' } = req.query;

    // Get all products with a compareAtPrice
    const allProducts = await Product.findAll({
      where: {
        compareAtPrice: { [Op.ne]: null },
      },
      include: [
        {
          association: 'categories',
          through: { attributes: [] },
        },
        {
          association: 'reviews',
          attributes: ['rating'],
        },
      ],
    });

    // Calculate discount percentage and filter products
    const discountedProducts = allProducts
      .map((product) => {
        const price = parseFloat(product.price);
        const compareAtPrice = parseFloat(product.compareAtPrice);
        const discountPercentage =
          ((compareAtPrice - price) / compareAtPrice) * 100;

        // Calculate average rating
        const ratings = {
          average: 0,
          count: 0,
        };

        if (product.reviews && product.reviews.length > 0) {
          const totalRating = product.reviews.reduce(
            (sum, review) => sum + review.rating,
            0
          );
          ratings.average = parseFloat(
            (totalRating / product.reviews.length).toFixed(1)
          );
          ratings.count = product.reviews.length;
        }

        return {
          ...product.toJSON(),
          discountPercentage,
          ratings,
        };
      })
      .filter(
        (product) => product.discountPercentage >= parseFloat(minDiscount)
      );

    // Sort products
    let sortedProducts;
    switch (sort) {
      case 'price_asc':
        sortedProducts = discountedProducts.sort((a, b) => a.price - b.price);
        break;
      case 'price_desc':
        sortedProducts = discountedProducts.sort((a, b) => b.price - a.price);
        break;
      case 'discount_desc':
      default:
        sortedProducts = discountedProducts.sort(
          (a, b) => b.discountPercentage - a.discountPercentage
        );
    }

    // Apply limit
    const limitedProducts = sortedProducts.slice(0, parseInt(limit));

    res.status(200).json({
      status: 'success',
      data: limitedProducts,
    });
  } catch (error) {
    next(error);
  }
};

// Get product variants
const getProductVariants = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Find product
    const product = await Product.findByPk(id);
    if (!product) {
      throw new AppError('Không tìm thấy sản phẩm', 404);
    }

    // Get variants
    const variants = await ProductVariant.findAll({
      where: { productId: id },
    });

    res.status(200).json({
      status: 'success',
      data: {
        variants,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get product reviews summary
const getProductReviewsSummary = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Find product
    const product = await Product.findByPk(id);
    if (!product) {
      throw new AppError('Không tìm thấy sản phẩm', 404);
    }

    // Get reviews
    const reviews = await Review.findAll({
      where: { productId: id },
      attributes: ['rating'],
    });

    // Calculate summary
    const count = reviews.length;
    const average =
      count > 0
        ? reviews.reduce((sum, review) => sum + review.rating, 0) / count
        : 0;

    // Calculate distribution
    const distribution = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };

    reviews.forEach((review) => {
      distribution[review.rating]++;
    });

    res.status(200).json({
      status: 'success',
      data: {
        average,
        count,
        distribution,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get product filters
const getProductFilters = async (req, res, next) => {
  try {
    const { categoryId } = req.query;

    console.log('Getting product filters with categoryId:', categoryId);

    // Build where condition
    const whereCondition = {};
    const includeCondition = [];

    if (categoryId) {
      // Kiểm tra xem categoryId có phải là UUID hợp lệ không
      const isValidUUID =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          categoryId
        );

      if (isValidUUID) {
        includeCondition.push({
          association: 'categories',
          where: { id: categoryId },
          through: { attributes: [] },
          required: false, // Đặt required: false để tránh lỗi khi không tìm thấy danh mục
        });
      } else {
        // Nếu không phải UUID, có thể là slug
        const category = await Category.findOne({
          where: { slug: categoryId },
        });
        if (category) {
          includeCondition.push({
            association: 'categories',
            where: { id: category.id },
            through: { attributes: [] },
            required: false,
          });
        }
      }
    }

    // Get price range
    const priceRange = await Product.findAll({
      attributes: [
        [sequelize.fn('MIN', sequelize.col('price')), 'min'],
        [sequelize.fn('MAX', sequelize.col('price')), 'max'],
      ],
      where: whereCondition,
      include: includeCondition,
      raw: true,
    });

    // Lấy category ID thực tế nếu có
    let actualCategoryId = null;
    if (categoryId) {
      const isValidUUID =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          categoryId
        );
      if (isValidUUID) {
        actualCategoryId = categoryId;
      } else {
        const category = await Category.findOne({
          where: { slug: categoryId },
        });
        if (category) {
          actualCategoryId = category.id;
        }
      }
    }

    // Xây dựng điều kiện lọc sản phẩm theo danh mục
    let productFilter = {};
    if (actualCategoryId) {
      productFilter = {
        productId: {
          [Op.in]: sequelize.literal(
            `(SELECT product_id FROM product_categories WHERE category_id = '${actualCategoryId}')`
          ),
        },
      };
    }

    // Get brands
    const brands = await ProductAttribute.findAll({
      attributes: ['values'],
      where: {
        name: 'brand',
        ...(actualCategoryId ? productFilter : {}),
      },
      raw: true,
    });

    // Get colors
    const colors = await ProductAttribute.findAll({
      attributes: ['values'],
      where: {
        name: 'color',
        ...(actualCategoryId ? productFilter : {}),
      },
      raw: true,
    });

    // Get sizes
    const sizes = await ProductAttribute.findAll({
      attributes: ['values'],
      where: {
        name: 'size',
        ...(actualCategoryId ? productFilter : {}),
      },
      raw: true,
    });

    // Get other attributes
    const otherAttributes = await ProductAttribute.findAll({
      attributes: ['name', 'values'],
      where: {
        name: { [Op.notIn]: ['brand', 'color', 'size'] },
        ...(actualCategoryId ? productFilter : {}),
      },
      group: ['name', 'values'],
      raw: true,
    });

    // Xử lý dữ liệu trả về
    const uniqueBrands = new Set();
    brands.forEach((brand) => {
      if (brand.values && Array.isArray(brand.values)) {
        brand.values.forEach((value) => uniqueBrands.add(value));
      }
    });

    const uniqueColors = new Set();
    colors.forEach((color) => {
      if (color.values && Array.isArray(color.values)) {
        color.values.forEach((value) => uniqueColors.add(value));
      }
    });

    const uniqueSizes = new Set();
    sizes.forEach((size) => {
      if (size.values && Array.isArray(size.values)) {
        size.values.forEach((value) => uniqueSizes.add(value));
      }
    });

    res.status(200).json({
      status: 'success',
      data: {
        priceRange: {
          min: parseFloat(priceRange[0]?.min || 0),
          max: parseFloat(priceRange[0]?.max || 0),
        },
        brands: Array.from(uniqueBrands),
        colors: Array.from(uniqueColors),
        sizes: Array.from(uniqueSizes),
        attributes: otherAttributes.map((attr) => ({
          name: attr.name,
          values: attr.values || [],
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};
const getMyProducts = async (req, res, next) => {
  try {
    const products = await Product.findAll({
      where: {
        seller_id: req.user.id,
      },
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

const getSellerDashboard = async (req, res, next) => {
  try {
    const sellerId = req.user.id;

    const totalProducts = await Product.count({
      where: { seller_id: sellerId },
    });

    const orderItems = await OrderItem.findAll({
      include: [
        {
          model: Product,
          attributes: ['id', 'seller_id'],
          where: { seller_id: sellerId },
        },
        {
          model: Order,
          attributes: ['id', 'status', 'createdAt'],
        },
      ],
    });

    let totalOrders = 0;
    let pendingOrders = 0;
    let shippingOrders = 0;
    let deliveredOrders = 0;
    let totalRevenue = 0;

    const revenueMap = {};

    orderItems.forEach((item) => {
      const order = item.Order || item.order || null;

      const status = order?.status || '';
      const createdAt = order?.createdAt || null;

      totalOrders++;

    if (status === 'pending' || status === 'processing') {
  pendingOrders++;
}

if (status === 'shipped') {
  shippingOrders++;
}

      if (status === 'delivered') {
        deliveredOrders++;

        const itemRevenue =
          (Number(item.price) || 0) * (Number(item.quantity) || 0);

        totalRevenue += itemRevenue;

        if (createdAt) {
          const dateKey = new Date(createdAt).toISOString().slice(0, 10);

          if (!revenueMap[dateKey]) {
            revenueMap[dateKey] = 0;
          }

          revenueMap[dateKey] += itemRevenue;
        }
      }
    });

    const revenueByDate = Object.keys(revenueMap)
      .sort()
      .map((date) => ({
        date,
        revenue: revenueMap[date],
      }));

    res.status(200).json({
      status: 'success',
      data: {
        totalProducts,
        totalOrders,
        pendingOrders,
        shippingOrders,
        deliveredOrders,
        totalRevenue,
        revenueByDate,
      },
    });
  } catch (error) {
    console.error('GET SELLER DASHBOARD ERROR:', error);
    next(error);
  }
};
const getSellerOrders = async (req, res, next) => {
  try {
    const sellerId = req.user.id;

    const sellerProducts = await Product.findAll({
      where: { seller_id: sellerId },
      attributes: ['id', 'name'],
      raw: true,
    });

    const productIds = sellerProducts.map((p) => p.id);
    const productMap = {};
    sellerProducts.forEach((p) => {
      productMap[p.id] = p.name;
    });

    if (productIds.length === 0) {
      return res.status(200).json({
        status: 'success',
        data: [],
      });
    }

    const orderItems = await OrderItem.findAll({
      
      where: {
        productId: productIds,
      },
      include: [
        {
          model: Order,
          attributes: ['id', 'status', 'createdAt', 'userId'],
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
    

    const result = orderItems.map((item) => ({
      id: item.id,
      orderId: item.orderId,
      productId: item.productId,
      productName: productMap[item.productId] || 'Không rõ',
      quantity: item.quantity,
      price: item.price,
      total: Number(item.price) * Number(item.quantity),
      status: item.Order?.status || 'unknown',
      createdAt: item.Order?.createdAt || item.createdAt,
      customer: item.Order?.User
        ? {
            id: item.Order.User.id,
            name: `${item.Order.User.firstName || ''} ${item.Order.User.lastName || ''}`.trim(),
            email: item.Order.User.email || '',
            phone: item.Order.User.phone || '',
          }
        : null,
    }));

    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
const updateSellerOrderStatus = async (req, res, next) => {
  try {
    const sellerId = req.user.id;
    const { orderItemId } = req.params;
    const { status } = req.body;

    const allowedStatuses = ['processing', 'shipped', 'delivered', 'cancelled'];

    if (!allowedStatuses.includes(status)) {
      throw new AppError('Trạng thái không hợp lệ', 400);
    }

    const orderItem = await OrderItem.findByPk(orderItemId, {
      include: [
        {
          model: Product,
          attributes: ['id', 'seller_id', 'name'],
        },
        {
          model: Order,
          attributes: ['id', 'status'],
        },
      ],
    });

    if (!orderItem) {
      throw new AppError('Không tìm thấy đơn hàng', 404);
    }

    if (!orderItem.Product || orderItem.Product.seller_id !== sellerId) {
      throw new AppError('Bạn không có quyền cập nhật đơn này', 403);
    }

    const currentStatus = orderItem.Order?.status;

    const validTransitions = {
      pending: ['processing', 'cancelled'],
      processing: ['shipped', 'cancelled'],
      shipped: ['delivered', 'cancelled'],
      delivered: [],
      cancelled: [],
    };

    if (!validTransitions[currentStatus]?.includes(status)) {
      throw new AppError(
        `Không thể chuyển từ ${currentStatus} sang ${status}`,
        400
      );
    }

    orderItem.Order.status = status;
    await orderItem.Order.save();

    res.status(200).json({
      status: 'success',
      message: 'Cập nhật trạng thái đơn hàng thành công',
      data: {
        orderId: orderItem.Order.id,
        orderItemId: orderItem.id,
        productName: orderItem.Product.name,
        status: orderItem.Order.status,
      },
    });
  } catch (error) {
    next(error);
  }
};
const getSellerRevenue = async (req, res, next) => {
  try {
    const sellerId = req.user.id;
    const COMMISSION_RATE = 0.05;
    const APPROVED_REFUND_STATUSES = ['approved', 'refunded', 'completed'];

    const money = (value) => Math.round(Number(value || 0));

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
            'createdAt',
            'subtotal',
            'commissionAmount',
            'sellerNetAmount',
            'refundAmount',
            'refundStatus',
          ],
          where: {
            status: 'delivered',
          },
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    let grossRevenue = 0;
    const revenueDateMap = {};
    const revenueMonthMap = {};
    const productMap = {};

    const revenueByProducts = orderItems.map((item) => {
      const quantity = Number(item.quantity) || 0;
      const price = Number(item.price) || 0;
      const itemTotal = money(item.subtotal || price * quantity);

      grossRevenue += itemTotal;

      const createdAt = item.Order?.createdAt;
      if (createdAt) {
        const dateKey = new Date(createdAt).toISOString().slice(0, 10);
        const monthKey = new Date(createdAt).toISOString().slice(0, 7);

        if (!revenueDateMap[dateKey]) {
          revenueDateMap[dateKey] = {
            date: dateKey,
            grossRevenue: 0,
            refundAmount: 0,
            netRevenue: 0,
            orderCount: 0,
          };
        }

        revenueDateMap[dateKey].grossRevenue += itemTotal;
        revenueDateMap[dateKey].orderCount += 1;

        if (!revenueMonthMap[monthKey]) {
          revenueMonthMap[monthKey] = {
            month: monthKey,
            grossRevenue: 0,
            refundAmount: 0,
            netRevenue: 0,
            orderCount: 0,
          };
        }

        revenueMonthMap[monthKey].grossRevenue += itemTotal;
        revenueMonthMap[monthKey].orderCount += 1;
      }

      if (!productMap[item.productId]) {
        productMap[item.productId] = {
          productId: item.productId,
          productName: item.Product?.name || 'Sản phẩm',
          quantitySold: 0,
          grossRevenue: 0,
          orderCount: 0,
        };
      }

      productMap[item.productId].quantitySold += quantity;
      productMap[item.productId].grossRevenue += itemTotal;
      productMap[item.productId].orderCount += 1;

      return {
        orderItemId: item.id,
        productId: item.productId,
        productName: item.Product?.name || 'Sản phẩm',
        quantity,
        price,
        total: itemTotal,
        orderId: item.orderId,
        orderNumber: item.Order?.number,
        status: item.Order?.status,
        paymentStatus: item.Order?.paymentStatus,
        createdAt: item.Order?.createdAt,
      };
    });

    grossRevenue = money(grossRevenue);

    const refundRequests = await RefundRequest.findAll({
      where: {
        status: APPROVED_REFUND_STATUSES,
      },
      include: [
        {
          model: Order,
          as: 'order',
          required: true,
          attributes: [
            'id',
            'number',
            'subtotal',
            'refundAmount',
            'refundStatus',
            'createdAt',
          ],
          include: [
            {
              model: OrderItem,
              as: 'items',
              required: true,
              attributes: [
                'id',
                'orderId',
                'productId',
                'price',
                'quantity',
                'subtotal',
              ],
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
      order: [['created_at', 'DESC']],
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

      const refundDate = refund.processedAt || refund.createdAt;
      if (refundDate) {
        const dateKey = new Date(refundDate).toISOString().slice(0, 10);
        const monthKey = new Date(refundDate).toISOString().slice(0, 7);

        if (!revenueDateMap[dateKey]) {
          revenueDateMap[dateKey] = {
            date: dateKey,
            grossRevenue: 0,
            refundAmount: 0,
            netRevenue: 0,
            orderCount: 0,
          };
        }

        revenueDateMap[dateKey].refundAmount += sellerRefundAmount;

        if (!revenueMonthMap[monthKey]) {
          revenueMonthMap[monthKey] = {
            month: monthKey,
            grossRevenue: 0,
            refundAmount: 0,
            netRevenue: 0,
            orderCount: 0,
          };
        }

        revenueMonthMap[monthKey].refundAmount += sellerRefundAmount;
      }

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

    const adjustedGrossRevenue = Math.max(grossRevenue - refundAmount, 0);
    const totalCommission = money(adjustedGrossRevenue * COMMISSION_RATE);
    const netRevenue = Math.max(adjustedGrossRevenue - totalCommission, 0);

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
      netRevenue - totalPaid - pendingPayout,
      0
    );

    const revenueByDate = Object.values(revenueDateMap)
      .map((item) => {
        const adjusted = Math.max(item.grossRevenue - item.refundAmount, 0);
        const commission = money(adjusted * COMMISSION_RATE);

        return {
          ...item,
          adjustedGrossRevenue: adjusted,
          commission,
          netRevenue: Math.max(adjusted - commission, 0),
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    const revenueByMonth = Object.values(revenueMonthMap)
      .map((item) => {
        const adjusted = Math.max(item.grossRevenue - item.refundAmount, 0);
        const commission = money(adjusted * COMMISSION_RATE);

        return {
          ...item,
          adjustedGrossRevenue: adjusted,
          commission,
          netRevenue: Math.max(adjusted - commission, 0),
        };
      })
      .sort((a, b) => a.month.localeCompare(b.month));

    const topProducts = Object.values(productMap)
      .map((item) => ({
        ...item,
        grossRevenue: money(item.grossRevenue),
      }))
      .sort((a, b) => b.grossRevenue - a.grossRevenue);

    const totalOrders = orderItems.length;
    const completedOrders = orderItems.length;
    const averageOrderValue = totalOrders > 0 ? grossRevenue / totalOrders : 0;
    const refundRate =
      grossRevenue > 0 ? Number(((refundAmount / grossRevenue) * 100).toFixed(2)) : 0;

    res.status(200).json({
      status: 'success',
      data: {
        totalRevenue: grossRevenue,
        totalOrders,
        completedOrders,
        averageOrderValue,

        grossRevenue,
        refundAmount,
        adjustedGrossRevenue,
        totalCommission,
        platformFee: totalCommission,
        netRevenue,
        sellerRevenue: netRevenue,

        totalPaid: money(totalPaid),
        pendingPayout: money(pendingPayout),
        rejectedPayout: money(rejectedPayout),
        availableToRequest: money(availableToRequest),

        refundRate,
        commissionRate: COMMISSION_RATE,

        revenueByProducts,
        topProducts,
        refundItems,
        revenueByDate,
        revenueByMonth,
        payouts,
      },
    });
  } catch (error) {
    console.error('GET SELLER REVENUE ERROR:', error);
    next(error);
  }
};
const getSellerRefundRequests = async (req, res, next) => {
  try {
    const sellerId = req.user.id;

    const sellerProducts = await Product.findAll({
      where: {
        seller_id: sellerId,
      },
      attributes: ['id', 'name'],
      raw: true,
    });

    const productIds = sellerProducts.map((product) => product.id);

    if (productIds.length === 0) {
      return res.status(200).json({
        status: 'success',
        data: [],
      });
    }

    const sellerOrderItems = await OrderItem.findAll({
      where: {
        productId: productIds,
      },
      attributes: ['orderId', 'productId', 'quantity', 'price'],
      include: [
        {
          model: Product,
          attributes: ['id', 'name', 'seller_id'],
        },
      ],
    });

    const orderIds = [
      ...new Set(sellerOrderItems.map((item) => item.orderId)),
    ];

    if (orderIds.length === 0) {
      return res.status(200).json({
        status: 'success',
        data: [],
      });
    }

    const refundRequests = await RefundRequest.findAll({
      where: {
        orderId: orderIds,
      },
      include: [
        {
          model: Order,
          as: 'order',
          attributes: [
            'id',
            'number',
            'status',
            'paymentStatus',
            'total',
            'subtotal',
            'discount',
            'commissionAmount',
            'sellerNetAmount',
            'refundAmount',
            'refundStatus',
            'createdAt',
          ],
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone'],
        },
      ],
      order: [['created_at', 'DESC']],
    });

    const orderItemMap = {};

    sellerOrderItems.forEach((item) => {
      const orderId = item.orderId;

      if (!orderItemMap[orderId]) {
        orderItemMap[orderId] = [];
      }

      orderItemMap[orderId].push({
        orderItemId: item.id,
        productId: item.productId,
        productName: item.Product?.name || 'Sản phẩm',
        quantity: item.quantity,
        price: item.price,
        total: Number(item.price || 0) * Number(item.quantity || 0),
      });
    });

    const result = refundRequests.map((refund) => {
      const plain = refund.toJSON();
      const sellerItems = orderItemMap[plain.orderId] || [];

      const sellerSubtotal = sellerItems.reduce(
        (sum, item) => sum + Number(item.total || 0),
        0
      );

      const orderSubtotal = Number(plain.order?.subtotal || 0);
      const refundAmount = Number(plain.amount || 0);

      const sellerAffectedAmount =
        orderSubtotal > 0
          ? Math.round((sellerSubtotal / orderSubtotal) * refundAmount)
          : refundAmount;

      return {
        ...plain,
        sellerItems,
        sellerSubtotal,
        sellerAffectedAmount,
      };
    });

    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    console.error('GET SELLER REFUND REQUESTS ERROR:', error);
    next(error);
  }
};
const getRecommendedProducts = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const finalLimit = parseInt(req.query.limit || 8);

    const behaviors = await UserBehavior.findAll({
      where: { userId },
      raw: true,
    });

    if (!behaviors || behaviors.length === 0) {
      return res.status(200).json({
        status: 'success',
        data: {
          products: [],
          basedOn: {
            totalBehaviors: 0,
            message: 'User chưa có hành vi để gợi ý',
          },
        },
      });
    }

    // Gom điểm theo product_id
    const productScoreMap = {};

    behaviors.forEach((behavior) => {
      if (!behavior.productId) return;

      if (!productScoreMap[behavior.productId]) {
        productScoreMap[behavior.productId] = {
          productId: behavior.productId,
          totalScore: 0,
          actions: {},
          lastActionAt: behavior.created_at || behavior.createdAt,
        };
      }

      productScoreMap[behavior.productId].totalScore += Number(
        behavior.score || 0
      );

      productScoreMap[behavior.productId].actions[behavior.actionType] =
        (productScoreMap[behavior.productId].actions[behavior.actionType] ||
          0) + 1;
    });

    const scoredProducts = Object.values(productScoreMap)
      .filter((item) => item.totalScore > 0)
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, finalLimit);

    const productIds = scoredProducts.map((item) => item.productId);

    if (productIds.length === 0) {
      return res.status(200).json({
        status: 'success',
        data: {
          products: [],
          basedOn: {
            totalBehaviors: behaviors.length,
            message: 'Chưa có sản phẩm nào có điểm',
          },
        },
      });
    }

    const productsRaw = await Product.findAll({
      where: {
        id: {
          [Op.in]: productIds,
        },
        status: 'active',
      },
      include: [
        {
          association: 'categories',
          through: { attributes: [] },
          required: false,
        },
        {
          association: 'reviews',
          attributes: ['rating'],
          required: false,
        },
        {
          association: 'variants',
          required: false,
        },
      ],
    });

    const scoreMap = {};
    scoredProducts.forEach((item, index) => {
      scoreMap[item.productId] = {
        totalScore: item.totalScore,
        actions: item.actions,
        rank: index + 1,
      };
    });

    const products = productsRaw
      .map((product) => {
        const productJson = product.toJSON();

        const ratings = {
          average: 0,
          count: 0,
        };

        if (productJson.reviews && productJson.reviews.length > 0) {
          const totalRating = productJson.reviews.reduce(
            (sum, review) => sum + review.rating,
            0
          );

          ratings.average = parseFloat(
            (totalRating / productJson.reviews.length).toFixed(1)
          );
          ratings.count = productJson.reviews.length;
        }

        let displayPrice = parseFloat(productJson.price) || 0;
        let compareAtPrice = parseFloat(productJson.compareAtPrice) || null;

        if (productJson.variants && productJson.variants.length > 0) {
          const sortedVariants = productJson.variants.sort(
            (a, b) => parseFloat(a.price) - parseFloat(b.price)
          );

          displayPrice = parseFloat(sortedVariants[0].price) || displayPrice;
        }

        delete productJson.reviews;

        return {
          ...productJson,
          price: displayPrice,
          compareAtPrice,
          ratings,
          behaviorScore: scoreMap[productJson.id]?.totalScore || 0,
          behaviorActions: scoreMap[productJson.id]?.actions || {},
          behaviorRank: scoreMap[productJson.id]?.rank || 999,
        };
      })
      .sort((a, b) => b.behaviorScore - a.behaviorScore);

    return res.status(200).json({
      status: 'success',
      data: {
        products,
        basedOn: {
          totalBehaviors: behaviors.length,
          scoredProducts,
        },
      },
    });
  } catch (error) {
    console.error('GET RECOMMENDED PRODUCTS ERROR:', error);
    next(error);
  }
};
module.exports = {
  getAllProducts,
  getProductById,
  getProductBySlug,
  createProduct,
  updateProduct,
  deleteProduct,
  getFeaturedProducts,
  getRelatedProducts,
  searchProducts,
  getNewArrivals,
  getBestSellers,
  getDeals,
  getProductVariants,
  getProductReviewsSummary,
  getProductFilters,
  getMyProducts,
   getSellerOrders,
   getSellerDashboard,
   getSellerRevenue,
   updateSellerOrderStatus,
   getSellerRefundRequests,
   getRecommendedProducts,
};
