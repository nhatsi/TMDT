require('dotenv').config({ path: 'be/.env' });
const { News, User } = require('../src/models');

const SAMPLE_POSTS = [
  {
    title: 'Dell XPS 9315 2-in-1: Sự kết hợp hoàn hảo giữa hiệu suất và thiết kế đột phá',
    slug: 'dell-xps-9315-2-in-1-review',
    content: '<p>Dell XPS 9315 2-in-1 là một trong những sản phẩm ấn tượng nhất của Dell trong năm nay. Với thiết kế mỏng nhẹ tinh tế và hiệu năng mạnh mẽ từ chip Intel thế hệ mới, đây là sự lựa chọn không thể bỏ qua cho doanh nhân.</p><p>Màn hình 2 trong 1 linh hoạt giúp bạn làm việc ở nhiều chế độ khác nhau...</p>',
    thumbnail: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&q=80&w=800',
    description: 'Đánh giá chi tiết Dell XPS 9315 2-in-1 với thiết kế mới lạ và hiệu suất ổn định.',
    category: 'Đánh giá',
    tags: 'dell, xps, laptop review, 2in1',
    isPublished: true,
  },
  {
    title: 'Cách chụp màn hình cuộn, màn hình dài trên máy tính Windows',
    slug: 'cach-chup-man-hinh-cuon-windows',
    content: '<p>Chụp màn hình cuộn giúp bạn lưu trữ toàn bộ nội dung trang web hoặc tài liệu dài chỉ trong một tấm hình duy nhất. Trên Windows 10 và 11, bạn có thể sử dụng các tổ hợp phím hoặc phần mềm hỗ trợ...</p>',
    thumbnail: 'https://images.unsplash.com/photo-1547082299-de196ea013d6?auto=format&fit=crop&q=80&w=800',
    description: 'Hướng dẫn chi tiết cách chụp màn hình cuộn trên Windows 10/11 không cần phần mềm.',
    category: 'Thủ thuật',
    tags: 'windows, tips, screenshot',
    isPublished: true,
  },
  {
    title: 'Có nên nâng cấp CPU laptop? Hướng dẫn và lưu ý quan trọng',
    slug: 'co-nen-nang-cap-cpu-laptop',
    content: '<p>Việc nâng cấp CPU có thể giúp laptop chạy nhanh hơn, nhưng không phải lúc nào cũng khả thi. Đa số laptop hiện nay đều hàn chết CPU trên mainboard, vì vậy việc nâng cấp là vô cùng khó khăn...</p>',
    thumbnail: 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?auto=format&fit=crop&q=80&w=800',
    description: 'Mọi điều bạn cần biết trước khi quyết định nâng cấp CPU cho chiếc laptop của mình.',
    category: 'Tư vấn',
    tags: 'cpu, laptop, upgrade, hardware',
    isPublished: true,
  },
  {
    title: 'Khai trương cơ sở mới của ShopMini tại TP.HCM',
    slug: 'khai-truong-co-so-moi-tphcm',
    content: '<p>ShopMini vui mừng thông báo khai trương cơ sở mới tại quận 1, TP.HCM với nhiều ưu đãi hấp dẫn như giảm giá 20% cho 100 khách hàng đầu tiên, quà tặng phụ kiện...</p>',
    thumbnail: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=800',
    description: 'Chào mừng bạn đến với không gian trải nghiệm công nghệ mới của chúng tôi.',
    category: 'Tin tức',
    tags: 'shopmini, khai truong, event',
    isPublished: true,
  },
  {
    title: 'Laptop bị liệt phím Enter: Nguyên nhân và cách khắc phục tại nhà',
    slug: 'laptop-bi-liet-phim-enter-fix',
    content: '<p>Phím Enter bị liệt gây nhiều phiền toái. Hãy thử những cách sau trước khi mang đi sửa: Vệ sinh phím bấm, kiểm tra driver bàn phím, hoặc sử dụng bàn phím ảo tạm thời...</p>',
    thumbnail: 'https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?auto=format&fit=crop&q=80&w=800',
    description: 'Các bước kiểm tra và sửa lỗi phím Enter bị kẹt hoặc liệt đơn giản nhất.',
    category: 'Thủ thuật',
    tags: 'hardware, fix, laptop tips',
    isPublished: true,
  },
  {
    title: 'Top 5 laptop văn phòng tốt nhất dưới 15 triệu đồng năm 2025',
    slug: 'top-5-laptop-van-phong-2025',
    content: '<p>Nếu bạn đang tìm kiếm một chiếc laptop văn phòng mỏng nhẹ, hiệu năng tốt trong tầm giá 15 triệu, danh sách này dành cho bạn: MSI Modern, Acer Aspire, HP Pavilion...</p>',
    thumbnail: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&q=80&w=800',
    description: 'Danh sách những mẫu laptop văn phòng đáng mua nhất hiện nay.',
    category: 'Tư vấn',
    tags: 'top laptop, van phong, duoi 15 trieu',
    isPublished: true,
  },
  {
    title: 'Đánh giá ASUS Zenbook 14 OLED: Sự lựa chọn hoàn hảo cho Content Creator',
    slug: 'danh-gia-asus-zenbook-14-oled',
    content: '<p>ASUS Zenbook 14 OLED không chỉ đẹp mà còn mạnh mẽ với màn hình OLED rực rỡ chuẩn màu 100% DCI-P3. Đây là người bạn đồng hành lý tưởng cho dân thiết kế và sáng tạo nội dung...</p>',
    thumbnail: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&q=80&w=800',
    description: 'Zenbook 14 OLED mang đến trải nghiệm làm việc và giải trí tuyệt vời.',
    category: 'Đánh giá',
    tags: 'asus, zenbook, oled, creator',
    isPublished: true,
  },
  {
    title: 'Cách tối ưu hóa Windows 11 để chơi game mượt mà hơn',
    slug: 'toi-uu-hoa-windows-11-choi-game',
    content: '<p>Windows 11 có nhiều tính năng hỗ trợ game thủ, nhưng bạn cần biết cách bật chúng đúng cách như Game Mode, Auto HDR để có FPS ổn định nhất...</p>',
    thumbnail: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=800',
    description: 'Tăng FPS và giảm lag khi chơi game trên Windows 11 với những mẹo đơn giản.',
    category: 'Thủ thuật',
    tags: 'gaming, windows 11, optimization',
    isPublished: true,
  },
  {
    title: 'Review MacBook Air M3: Liệu có đáng để nâng cấp từ bản M1?',
    slug: 'review-macbook-air-m3',
    content: '<p>Chip M3 mang lại hiệu năng vượt trội, đặc biệt là khả năng xử lý đồ họa và Ray Tracing. Tuy nhiên với người dùng văn phòng cơ bản, M1 vẫn còn rất tốt...</p>',
    thumbnail: 'https://images.unsplash.com/photo-1514820402329-de527fdd2e6d?auto=format&fit=crop&q=80&w=800',
    description: 'So sánh chi tiết hiệu năng và trải nghiệm giữa MacBook Air M3 và các thế hệ trước.',
    category: 'Đánh giá',
    tags: 'apple, macbook, m3, m1',
    isPublished: true,
  },
  {
    title: 'Dịch vụ vệ sinh laptop miễn phí tại ShopMini trong tháng 12',
    slug: 've-sinh-laptop-mien-phi',
    content: '<p>Trong tháng tri ân khách hàng, ShopMini triển khai chương trình vệ sinh máy miễn phí, tra keo tản nhiệt gấu cho tất cả dòng máy gaming và văn phòng...</p>',
    thumbnail: 'https://images.unsplash.com/photo-1588702547923-7093a6c3ba33?auto=format&fit=crop&q=80&w=800',
    description: 'Đến ngay cơ sở gần nhất để được bảo dưỡng máy tính hoàn toàn miễn phí.',
    category: 'Tin tức',
    tags: 'promotion, laptop, service',
    isPublished: true,
  },
  {
    title: 'Mẹo sử dụng phím tắt trên macOS cực hữu ích cho người mới',
    slug: 'phim-tat-macos-cho-nguoi-moi',
    content: '<p>Làm chủ macOS nhanh chóng hơn với hệ thống phím tắt cực kỳ tiện lợi như Command + Space, Command + Tab, và các mẹo sử dụng Trackpad thông minh...</p>',
    thumbnail: 'https://images.unsplash.com/photo-1611186871348-b1ec696e52c9?auto=format&fit=crop&q=80&w=800',
    description: 'Nâng cao năng suất làm việc trên Mac với các tổ hợp phím tắt quyền năng.',
    category: 'Thủ thuật',
    tags: 'macos, mac tip, shortcut',
    isPublished: true,
  },
  {
    title: 'Nên chọn màn hình 144Hz hay 240Hz để chơi game CS2?',
    slug: 'chon-man-hinh-144hz-hay-240hz',
    content: '<p>Tần số quét cao mang lại lợi thế lớn trong các tựa game Esport, giúp hình ảnh chuyển động mượt mà và giảm độ trễ đầu vào rõ rệt...</p>',
    thumbnail: 'https://images.unsplash.com/photo-1547082299-de196ea013d6?auto=format&fit=crop&q=80&w=800',
    description: 'Phân tích sự khác biệt giữa các tần số quét màn hình phổ biến hiện nay.',
    category: 'Tư vấn',
    tags: 'monitor, 144hz, 240hz, fps',
    isPublished: true,
  }
];

async function seed() {
  try {
    const user = await User.findOne({ where: { role: 'admin' } });
    if (!user) {
      console.log('No admin user found. Run create-admin-user.js first.');
      process.exit(1);
    }

    for (const post of SAMPLE_POSTS) {
      await News.findOrCreate({
        where: { slug: post.slug },
        defaults: { ...post, userId: user.id }
      });
    }

    console.log('Sample news posts seeded successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding news:', error);
    process.exit(1);
  }
}

seed();
