const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { News, User } = require('../src/models');

const SAMPLE_NEWS = [
  {
    title: 'Top 5 Laptop Gaming Đáng Mua Nhất Đầu Năm 2025',
    slug: 'top-5-laptop-gaming-2025',
    description: 'Khám phá những mẫu laptop gaming mạnh mẽ nhất, từ hiệu năng đỉnh cao đến thiết kế ấn tượng trong tầm giá cực tốt tại ShopMini.',
    content: `
      <p>Năm 2025 hứa hẹn là một năm bùng nổ của thị trường laptop gaming với sự ra mắt của nhiều dòng chip và card đồ họa thế hệ mới. Tại ShopMini, chúng tôi đã tổng hợp danh sách 5 mẫu laptop gaming đáng sở hữu nhất hiện nay dựa trên tiêu chí hiệu năng, tản nhiệt và mức giá.</p>
      
      <h2>1. MSI Raider GE78 HX (2025)</h2>
      <p>Với cấu hình Intel Core i9 Gen 14th và RTX 4090, đây là con quái vật hiệu năng dành cho những game thủ không chấp nhận sự thỏa hiệp. Màn hình 17.3 inch QHD+ 240Hz mang lại trải nghiệm hình ảnh tuyệt mỹ.</p>
      
      <h2>2. Lenovo Legion Pro 7i</h2>
      <p>Sự cân bằng hoàn hảo giữa thiết kế tinh tế và sức mạnh xử lý. Hệ thống tản nhiệt Legion Coldfront 5.0 giúp máy luôn mát mẻ ngay cả khi chạy các tác vụ nặng nhất.</p>
      
      <h2>3. ASUS ROG Zephyrus G14</h2>
      <p>Lựa chọn hàng đầu cho những ai cần sự di động. Một chiếc laptop gaming 14 inch mạnh mẽ, màn hình OLED rực rỡ và thời lượng pin ấn tượng.</p>
      
      <h2>4. Acer Predator Helios Neo 16</h2>
      <p>Vua của phân khúc laptop gaming tầm trung. Hiệu năng vượt trội trong tầm giá với màn hình 16 inch sắc nét và bàn phím RGB 4 vùng cá tính.</p>
      
      <h2>5. Dell Alienware m16 R2</h2>
      <p>Thương hiệu gaming huyền thoại với thiết kế mới gọn gàng hơn nhưng vẫn giữ được "chất" Alienware. Hiệu năng ổn định và dịch vụ bảo hành tận tâm.</p>
      
      <p>Hãy đến ngay các cửa hàng ShopMini tại Hà Nội và TP.HCM để trải nghiệm trực tiếp và nhận những phần quà hấp dẫn khi mua laptop gaming trong tháng này!</p>
    `,
    thumbnail: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?q=80&w=2068&auto=format&fit=crop',
    category: 'Đánh giá',
    tags: 'gaming, laptop, 2025, shopmini',
    isPublished: true,
  },
  {
    title: 'Hướng Dẫn Tối Ưu Hóa Windows 11 Để Làm Việc Hiệu Quả',
    slug: 'toi-uu-hoa-windows-11-lam-viec',
    description: 'Mẹo và thủ thuật giúp chiếc laptop của bạn chạy nhanh hơn, mượt mà hơn và giúp bạn tập trung cao độ vào công việc trên Windows 11.',
    content: `
      <p>Windows 11 mang đến giao diện hiện đại, nhưng nếu không biết cách tùy chỉnh, nó có thể làm giảm hiệu suất làm việc của bạn. Dưới đây là những mẹo nhỏ nhưng cực kỳ hữu ích mà ShopMini tổng hợp dành cho bạn.</p>
      
      <h3>1. Tận dụng Snap Layouts</h3>
      <p>Sử dụng tổ hợp phím <code>Win + Z</code> để nhanh chóng sắp xếp các cửa sổ ứng dụng. Điều này giúp bạn làm việc đa nhiệm dễ dàng hơn rất nhiều trên các màn hình kích thước lớn.</p>
      
      <h3>2. Tắt các ứng dụng chạy ngầm không cần thiết</h3>
      <p>Vào <b>Settings > Apps > Startup</b> và tắt những ứng dụng bạn không cần dùng ngay khi mở máy. Điều này giúp rút ngắn thời gian khởi động và tiết kiệm RAM.</p>
      
      <h3>3. Sử dụng Virtual Desktops</h3>
      <p>Hãy phân chia không gian làm việc. Ví dụ: một màn hình ảo dành cho các tab nghiên cứu, một màn hình dành cho việc viết lách và một màn hình cho các ứng dụng giải trí.</p>
      
      <p>Nếu bạn gặp bất kỳ vấn đề gì về phần mềm hoặc muốn nâng cấp RAM cho máy tính, đừng ngần ngại mang máy qua ShopMini để được hỗ trợ kỹ thuật miễn phí nhé!</p>
    `,
    thumbnail: 'https://images.unsplash.com/photo-1587614382346-4ec70a388b28?q=80&w=2070&auto=format&fit=crop',
    category: 'Thủ thuật',
    tags: 'windows 11, office, tips, productivity',
    isPublished: true,
  },
  {
    title: 'ShopMini Khai Trương Showroom Mới Tại Quận 1, TP.HCM',
    slug: 'shopmini-khai-truong-showroom-quan-1',
    description: 'Sự kiện khai trương showroom thứ 3 của ShopMini tại TP.HCM với hàng ngàn ưu đãi giảm giá lên đến 50% và quà tặng giá trị.',
    content: `
      <p>Chào đón thành viên mới trong gia đình ShopMini! Chúng tôi vô cùng hào hứng thông báo về việc khai trương Showroom tiếp theo tại địa chỉ sầm uất nhất TP.HCM.</p>
      
      <p><b>Thời gian:</b> 08:00 AM - Chủ Nhật, Ngày 15/01/2025</p>
      <p><b>Địa chỉ:</b> Đường Nguyễn Huy Tưởng, Phường 6, Quận Bình Thạnh, TP.HCM</p>
      
      <h3>Chương trình ưu đãi nhân dịp khai trương:</h3>
      <ul>
        <li>Giảm giá trực tiếp 2.000.000đ cho 10 khách hàng mua laptop đầu tiên.</li>
        <li>Tặng bộ Gear trị giá 1.500.000đ cho tất cả đơn hàng trên 20.000.000đ.</li>
        <li>Bốc thăm trúng thưởng 1 chiếc iPhone 16 Pro Max tại sự kiện.</li>
        <li>Vệ sinh máy và cài đặt phần mềm miễn phí cho tất cả khách hàng ghé thăm.</li>
      </ul>
      
      <p>Đây là cơ hội tuyệt vời để bạn sở hữu những món đồ công nghệ yêu thích với mức giá không tưởng. Hẹn gặp lại các bạn tại buổi lễ khai trương hoành tráng tới đây!</p>
    `,
    thumbnail: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=2070&auto=format&fit=crop',
    category: 'Tin tức',
    tags: 'shopmini, event, khai truong, hcm',
    isPublished: true,
  },
  {
    title: 'AI Đang Thay Đổi Cách Chúng Ta Làm Việc Như Thế Nào?',
    slug: 'ai-thay-doi-cach-lam-viec',
    description: 'Tìm hiểu tầm ảnh hưởng của Trí tuệ nhân tạo (AI) đối với các ngành nghề sáng tạo, lập trình và văn phòng trong năm 2025.',
    content: `
      <p>Trí tuệ nhân tạo không còn là khái niệm của tương lai, nó đang hiện diện trong mọi ngõ ngách của công việc hiện đại. Từ ChatGPT đến Midjourney, AI đang trở thành trợ thủ đắc lực giúp nâng cao năng suất.</p>
      
      <p>Tại ShopMini, chúng tôi luôn cập nhật những dòng máy tích hợp NPU (Neural Processing Unit) mạnh mẽ để hỗ trợ tối đa cho các tác vụ AI. Laptop giờ đây không chỉ là công cụ tính toán, mà còn là người cộng sự thông minh.</p>
      
      <p>Liệu AI sẽ thay thế con người hay bổ trợ cho chúng ta? Câu trả lời nằm ở cách chúng ta làm chủ công cụ này. Hãy cùng ShopMini thảo luận về xu hướng này trong buổi Workshop sắp tới nhé.</p>
    `,
    thumbnail: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=2070&auto=format&fit=crop',
    category: 'Xu hướng',
    tags: 'ai, technology, future, 2025',
    isPublished: true,
  },
  {
    title: 'Review MacBook Pro M4: Sức Mạnh Đỉnh Cao Từ Apple Silicon',
    slug: 'review-macbook-pro-m4',
    description: 'Đánh giá chi tiết MacBook Pro M4 mới nhất với hiệu năng vượt trội, màn hình Liquid Retina XDR và thời lượng pin huyền thoại.',
    content: `
      <p>Apple một lần nữa lại khẳng định vị thế dẫn đầu với dòng chip M4 mới nhất. MacBook Pro M4 mang đến những cải tiến mạnh mẽ không chỉ ở nhân xử lý mà còn ở khả năng xử lý đồ họa chuyên nghiệp.</p>
      
      <p>Màn hình với độ sáng lên tới 1000 nits khi hiển thị nội dung SDR giúp bạn làm việc ngoài trời dễ dàng hơn bao giờ hết. Camera 12MP Center Stage mang lại chất lượng cuộc gọi video sắc nét vượt bậc.</p>
      
      <p>Sản phẩm hiện đã có hàng tại ShopMini với đầy đủ các phiên bản cấu hình và màu sắc. Đừng bỏ lỡ chương trình trả góp 0% lãi suất cùng nhiều ưu đãi hấp dẫn dành riêng cho học sinh, sinh viên.</p>
    `,
    thumbnail: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=2026&auto=format&fit=crop',
    category: 'Đánh giá',
    tags: 'apple, macbook pro, m4, shopmini',
    isPublished: true,
  }
];

async function seedNews() {
  console.log('--- Starting News Seeding ---');
  try {
    // Check if there is an admin user to assign the news to
    const adminUser = await User.findOne({ where: { role: 'admin' } });
    if (!adminUser) {
      console.error('Error: No admin user found. Please create an admin user first.');
      process.exit(1);
    }

    console.log(`Found admin user: ${adminUser.email}`);

    let createdCount = 0;
    let skippedCount = 0;

    for (const data of SAMPLE_NEWS) {
      const [news, created] = await News.findOrCreate({
        where: { slug: data.slug },
        defaults: {
          ...data,
          userId: adminUser.id
        }
      });

      if (created) {
        createdCount++;
        console.log(`- Created: ${data.title}`);
      } else {
        skippedCount++;
        console.log(`- Skipped (Already exists): ${data.title}`);
      }
    }

    console.log('------------------------------');
    console.log(`Summary: Created ${createdCount}, Skipped ${skippedCount}`);
    console.log('News seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding news data:', error);
    process.exit(1);
  }
}

seedNews();
