const { GoogleGenerativeAI } = require('@google/generative-ai');
const { Product, Category, sequelize } = require('../models');
const { Op } = require('sequelize');

class GeminiChatbotService {
  constructor() {
    this.genAI = null;
    this.model = null;
    this.initializeGemini();
  }

  initializeGemini() {
    try {
      if (
        process.env.GEMINI_API_KEY &&
        process.env.GEMINI_API_KEY !== 'demo-key'
      ) {
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        this.model = this.genAI.getGenerativeModel({
          model: 'gemini-2.5-flash',
        });
        console.info(
          '✅ Gemini AI initialized successfully with model: gemini-2.5-flash'
        );
      } else {
        console.warn('⚠️  Gemini API key not found, using fallback responses');
      }
    } catch (error) {
      console.error(
        '❌ Failed to initialize Gemini AI:',
        error.message || error
      );
    }
  }

  /**
   * Main chatbot handler with AI intelligence
   */
  async handleMessage(message, context = {}) {
    try {
      // Step 1: Get all available products from database
      const allProducts = await this.getAllProducts();
      if (process.env.NODE_ENV !== 'production') {
        console.log(`📦 Found ${allProducts.length} products in database`);
      }

      // Step 2: Use Gemini AI to understand user intent and find matching products
      const aiResponse = await this.getAIResponse(
        message,
        allProducts,
        context
      );

      return aiResponse;
    } catch (error) {
      console.error('Gemini chatbot error:', error);
      return this.getFallbackResponse(message);
    }
  }

  /**
   * Get AI response using Gemini
   */
  async getAIResponse(userMessage, products, context) {
    if (!this.model) {
      return this.getFallbackResponse(userMessage);
    }

    try {
      // Create a comprehensive prompt for Gemini
      const prompt = this.createPrompt(userMessage, products, context);
      if (process.env.NODE_ENV !== 'production') {
        console.log('🤖 Sending request to Gemini API...');
      }

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const aiText = response.text();

      if (process.env.NODE_ENV !== 'production') {
        console.log('✅ Received response from Gemini API');
        console.log('📝 AI Response length:', aiText.length);
      }

      // Parse AI response to extract product recommendations
      const parsedResponse = this.parseAIResponse(aiText, products);

      return parsedResponse;
    } catch (error) {
      console.error('❌ Gemini API error details:', {
        message: error.message,
        status: error.status,
        statusText: error.statusText,
      });

      // Check if it's a 404 error specifically
      if (error.message && error.message.includes('404')) {
        console.error(
          '🚨 404 Error - Model not found or API endpoint incorrect'
        );
      }

      // Fallback to local keyword matching even if AI fails (e.g. quota limit)
      return this.simpleKeywordMatch(userMessage, products);
    }
  }

  /**
   * Create comprehensive prompt for Gemini AI
   */
  createPrompt(userMessage, products, context) {
    const productList = products
      .map(
        (p) =>
          `- ${p.name} (${p.Category ? p.Category.name : 'Sản phẩm'}): ${p.shortDescription || 'Mô tả đang cập nhật'} - Giá: ${p.price?.toLocaleString('vi-VN')}đ${p.inStock ? '' : ' (Hết hàng)'}`
      )
      .join('\n');

    return `
Bạn là một nhân viên bán hàng chuyên nghiệp, thân thiện và am hiểu của cửa hàng chúng tôi.
Nhiệm vụ của bạn là hỗ trợ khách hàng tìm kiếm sản phẩm, giải đáp thắc mắc và tư vấn bán hàng dựa trên dữ liệu thực tế.

KHẢ NĂNG CỦA BẠN:
1. Tra cứu và gợi ý sản phẩm chính xác từ danh sách được cung cấp.
2. Tư vấn sản phẩm phù hợp với nhu cầu của khách hàng.
3. Giải đáp thắc mắc về giá cả, tình trạng hàng hóa.
4. Trò chuyện tự nhiên, lịch sự như một nhân viên thực thụ.
5. Xử lý các câu hỏi ngoài lề một cách khéo léo, vui vẻ đưa câu chuyện về sản phẩm của cửa hàng.

DANH SÁCH SẢN PHẨM HIỆN CÓ (Dữ liệu thực tế):
${productList}

THÔNG TIN CỬA HÀNG:
- Chính sách: Đổi trả và bảo hành theo quy định của từng sản phẩm.
- Giao hàng: Hỗ trợ giao hàng toàn quốc.
- Hỗ trợ: Luôn sẵn sàng hỗ trợ khách hàng.

TIN NHẮN KHÁCH HÀNG: "${userMessage}"
CONTEXT: ${JSON.stringify(context)}

HƯỚNG DẪN TRẢ LỜI:
- Dựa VIỆC ĐẦU TIÊN là timg kiếm trong "DANH SÁCH SẢN PHẨM HIỆN CÓ" để trả lời.
- Nếu khách hỏi sản phẩm có trong danh sách: Giới thiệu chi tiết, giá bán và ưu điểm.
- Nếu khách hỏi sản phẩm KHÔNG có: Xin lỗi lịch sự và gợi ý các sản phẩm tương tự đang có sẵn.
- Luôn xưng hô là "mình" hoặc "em" và gọi khách là "bạn" hoặc "anh/chị" tùy ngữ cảnh.
- Trả lời ngắn gọn, súc tích, đi thẳng vào vấn đề nhưng vẫn giữ thái độ niềm nở.

Hãy trả lời theo format JSON sau:
{
  "response": "Câu trả lời chi tiết, thân thiện của nhân viên bán hàng (dùng emoji phù hợp)",
  "matchedProducts": ["tên sản phẩm 1", "tên sản phẩm 2" (chỉ liệt kê nếu có trong danh sách)],
  "suggestions": ["Câu trả lời mẫu 1", "Câu trả lời mẫu 2" (Các câu ngắn gọn người dùng có thể chọn để trả lời bạn. VD: "Gaming", "Văn phòng", "Dưới 20 triệu". LƯU Ý: Đây là gợi ý cho Người dùng nói, KHÔNG phải câu hỏi của AI)],
  "intent": "product_search|pricing|policy|support|complaint|general|off_topic"
}
`;
  }

  /**
   * Parse AI response and match with actual products
   */
  parseAIResponse(aiText, products) {
    try {
      // Try to parse JSON response from AI
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        // Find actual product objects based on AI recommendations
        const matchedProducts = [];
        if (parsed.matchedProducts && Array.isArray(parsed.matchedProducts)) {
          parsed.matchedProducts.forEach((productName) => {
            const product = products.find(
              (p) =>
                p.name.toLowerCase().includes(productName.toLowerCase()) ||
                productName.toLowerCase().includes(p.name.toLowerCase())
            );
            if (product) {
              matchedProducts.push({
                id: product.id,
                name: product.name,
                price: product.price,
                compareAtPrice: product.compareAtPrice,
                thumbnail: product.thumbnail,
                inStock: product.inStock,
                rating: 4.5,
              });
            }
          });
        }

        return {
          response:
            parsed.response || 'Tôi có thể giúp bạn tìm sản phẩm phù hợp!',
          products: matchedProducts,
          suggestions: parsed.suggestions || [
            'Xem tất cả sản phẩm',
            'Sản phẩm khuyến mãi',
            'Hỗ trợ mua hàng',
            'Liên hệ tư vấn',
          ],
          intent: parsed.intent || 'general',
        };
      }
    } catch (error) {
      console.error('Failed to parse AI response:', error.message || error);
    }

    // Fallback: simple keyword matching
    return this.simpleKeywordMatch(userMessage, products);
  }

  /**
   * Simple keyword matching fallback
   */
  simpleKeywordMatch(userMessage, products) {
    const lowerMessage = userMessage.toLowerCase().trim();
    let matchedProducts = [];

    // Extract search terms from user message
    const searchTerms = lowerMessage
      .split(' ')
      .filter((term) => term.length > 2); // Filter short words
    searchTerms.push(lowerMessage);

    // Search through products
    products.forEach((product) => {
      let matchScore = 0;
      const productName = product.name?.toLowerCase() || '';
      const productDesc = product.shortDescription?.toLowerCase() || '';

      // Direct match
      searchTerms.forEach((term) => {
        if (productName.includes(term)) {
          matchScore += 10;
        }
        if (productDesc.includes(term)) {
          matchScore += 5;
        }
      });

      if (matchScore > 0) {
        matchedProducts.push({ ...product, matchScore });
      }
    });

    // Sort by score
    matchedProducts.sort((a, b) => b.matchScore - a.matchScore);

    // Unique
    const uniqueProducts = matchedProducts.filter(
      (product, index, self) =>
        index === self.findIndex((p) => p.id === product.id)
    );

    if (uniqueProducts.length > 0) {
      const topProducts = uniqueProducts.slice(0, 5);
      const productList = topProducts
        .map((p) => `• ${p.name} - ${p.price?.toLocaleString('vi-VN')}đ`)
        .join('\n');

      return {
        response: `🔍 Mình tìm thấy một số sản phẩm phù hợp với yêu cầu của bạn nè:\n\n${productList}\n\nBạn muốn xem kỹ hơn sản phẩm nào không?`,
        products: topProducts.slice(0, 3).map((product) => ({
          id: product.id,
          name: product.name,
          price: product.price,
          compareAtPrice: product.compareAtPrice,
          thumbnail: product.thumbnail,
          inStock: product.inStock,
          rating: 4.5,
        })),
        suggestions: [
          'Xem chi tiết',
          'Sản phẩm khác',
          'Tư vấn thêm',
        ],
        intent: 'product_search',
      };
    }

    // Check for "new products" intent
    if (
      lowerMessage.includes('sản phẩm mới') ||
      lowerMessage.includes('hàng mới') ||
      lowerMessage.includes('mới nhất') ||
      lowerMessage.includes('new')
    ) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('✅ Identified "new products" intent');
      }
      
      const newProducts = products.slice(0, 5); // Assuming products are already sorted by createdAt DESC
      
      const productList = newProducts
        .map((p) => `• ${p.name} - ${p.price?.toLocaleString('vi-VN')}đ`)
        .join('\n');

      return {
        response: `🌟 Đây là những sản phẩm mới nhất vừa cập bến cửa hàng mình nè:\n\n${productList}\n\nBạn ưng ý mẫu nào không?`,
        products: newProducts.slice(0, 3).map((product) => ({
          id: product.id,
          name: product.name,
          price: product.price,
          compareAtPrice: product.compareAtPrice,
          thumbnail: product.thumbnail,
          inStock: product.inStock,
          rating: 4.5,
        })),
        suggestions: [
          'Xem chi tiết',
          'Sản phẩm khuyến mãi',
          'Tư vấn thêm',
        ],
        intent: 'product_search',
      };
    }

    return this.getFallbackResponse(userMessage);
  }

  /**
   * Get all products from database
   */
  async getAllProducts() {
    try {
      const products = await Product.findAll({
        where: {
          status: 'active',
          inStock: true,
        },
        include: [
          {
            model: Category,
            attributes: ['name'],
            as: 'categories', // Correct alias matching model definition
          },
        ],
        attributes: [
          'id',
          'name',
          'shortDescription',
          'description',
          'price',
          'compareAtPrice',
          'thumbnail',
          'inStock',
          'searchKeywords',
          'createdAt',
        ],
        limit: 100,
        order: [['createdAt', 'DESC']],
      });

      return products.map((p) => p.toJSON());
    } catch (error) {
      console.error('Error fetching products:', error);
      return [];
    }
  }

  /**
   * Enhanced fallback response for various scenarios
   */
  getFallbackResponse(userMessage) {
    return {
      response:
        'Chào bạn! Mình là nhân viên hỗ trợ của cửa hàng. Mình có thể giúp gì cho bạn hôm nay? Bạn đang tìm kiếm sản phẩm nào hay cần tư vấn gì không nè? 😊',
      suggestions: [
        'Xem sản phẩm mới',
        'Sản phẩm khuyến mãi',
        'Hỗ trợ mua hàng',
        'Tư vấn sản phẩm',
      ],
      intent: 'general',
    };
  }
}

module.exports = new GeminiChatbotService();
