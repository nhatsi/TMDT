const {
  Product,
  Category,
  ProductAttribute,
  ProductVariant,
  ProductSpecification,
  OrderItem,
  CartItem,
  sequelize,
} = require('../src/models');
const { v4: uuidv4 } = require('uuid');

// Define Default FAQs
const DEFAULT_FAQS = [
  {
    question: 'Chính sách bảo hành khi mua sản phẩm này tại cửa hàng như thế nào?',
    answer: 'Sản phẩm được bảo hành chính hãng 12 tháng. Trong 15 ngày đầu, nếu có lỗi từ nhà sản xuất, quý khách sẽ được đổi sản phẩm mới hoặc hoàn tiền 100%.',
  },
  {
    question: 'Tôi có thể thanh toán qua những hình thức nào?',
    answer: 'Chúng tôi hỗ trợ đa dạng các hình thức thanh toán bao gồm: Tiền mặt khi nhận hàng (COD), Chuyển khoản ngân hàng, và Thanh toán qua thẻ tín dụng/thẻ ghi nợ.',
  },
  {
    question: 'Cửa hàng có chính sách trả góp khi mua sản phẩm này không?',
    answer: 'Có, chúng tôi hỗ trợ trả góp 0% lãi suất qua thẻ tín dụng của hơn 20 ngân hàng liên kết. Thủ tục nhanh gọn, xét duyệt trong 15 phút.',
  },
  {
    question: 'So với phiên bản cũ, sản phẩm này có gì khác biệt?',
    answer: 'Sản phẩm thế hệ mới được nâng cấp đáng kể về hiệu năng, thời lượng pin và thiết kế mỏng nhẹ hơn. Đặc biệt là hệ thống tản nhiệt được cải tiến giúp máy hoạt động mát mẻ hơn.',
  },
  {
    question: 'Ai nên mua sản phẩm này?',
    answer: 'Sản phẩm phù hợp với doanh nhân, nhân viên văn phòng, lập trình viên và những người làm công việc sáng tạo nội dung cần một chiếc máy mạnh mẽ, bền bỉ và di động.',
  },
  {
    question: 'Sản phẩm này có bền không?',
    answer: 'Sản phẩm đạt tiêu chuẩn độ bền quân đội MIL-STD-810H, chịu được va đập, rung lắc, nhiệt độ khắc nghiệt và độ ẩm cao. Vỏ máy được làm từ sợi carbon và hợp kim magie siêu bền.',
  },
];

// Reference the sample products from import-hybrid-products.js
// Since we can't easily import from another script without module.exports, I will copy the structure
// or just use a simplified version of importing by reading the file content or just requiring it if possible
// The previous file viewing showed it defined sampleProducts but didn't export it properly for reuse.
// So I will just blindly require it, but since it probably runs immediately, that's not good.
// Instead, I will assume the previous script is a standalone runner.

// To properly do this, I'll copy the logic but populate FAQs.
// Since copying 1000 lines is inefficient, I will attempt to read the file, extract the sampleProducts array,
// and then use it. OR better yet, I will modify `import-hybrid-products.js` to clear DB and add FAQs.
// Actually, I'll just write a new script that imports the logic if possible?
// No, simpler to just "Write to file" a new script based on the logic I saw, but with the specific "Reset" requirement.

// Wait, I can't see the whole `import-hybrid-products.js` file to copy the products.
// I will create a script that:
// 1. Cleans the DB.
// 2. Uses a small set of sample products (I will check the file again to grab them or just use the ones I saw).
// Actually, the user likely wants ALL the products from the sample data, not just a few.
// Providing a robust "reset and seed" usually means taking the existing seed logic and enhancing it.

// Let's modify `import-hybrid-products.js` to:
// 1. Have a `clean` function.
// 2. Add `faqs: DEFAULT_FAQS` to every product item.
// 3. Export a run function.

// But `import-hybrid-products.js` is 1276 lines.
// I will instead create `scripts/reset_db_with_faqs.js` and copy the important parts from a few VIEW_FILE calls or just use the `import-hybrid-products.js` if I can modify it in place.
// Modifying in place is risky if I break it.
// I'll try to just APPEND the FAQ logic to `import-hybrid-products.js` and add a "truncate" step at the beginning.

// Let's check if `import-hybrid-products.js` has a "clean" step.
// I'll read the beginning of the file again.

// It requires models.
// It defines `sampleProducts`.
// It probably loops through them.

// I will read the END of `import-hybrid-products.js` to see how it executes.
