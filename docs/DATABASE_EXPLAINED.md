# StayJoy — Báo Cáo Chi Tiết Database

> Cập nhật: 25/06/2026 | Supabase PostgreSQL | 18 bảng tổng cộng (16 active + 2 tạm ẩn)

---

## 1. Tổng Quan Nhanh

| Nhóm | Bảng | Mục đích |
|------|------|---------|
| Nền tảng | `properties`, `users_properties`, `subscriptions` | Tenant, phân quyền, lịch sử gói |
| Vận hành | `rooms`, `room_images`, `bookings`, `service_requests` | Phòng, ảnh, đặt phòng, dịch vụ |
| Chatbot AI | `knowledge_base_sections`, `channel_mappings`, `chatwoot_inbox_mapping`, `llm_settings` | Nội dung bot, kênh chat, cấu hình LLM |
| Usage tracking | `monthly_usages`, `llm_usage_logs` | Quota tin nhắn, log token |
| Thanh toán | `wallets`, `wallet_transactions`, `plan_settings` | Ví điểm, giao dịch PayOS, cấu hình gói |
| Tạm ẩn | `ical_feeds`, `ical_bookings` | Sync lịch OTA (chưa bật UI) |

---

## 2. Chi Tiết Từng Bảng

---

### `properties` — Homestay (Bảng Trung Tâm)

**Mục đích**: 1 dòng = 1 homestay. Mọi bảng khác đều quan hệ qua `property_id`.

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `id` | UUID PK | ID homestay |
| `name` | TEXT | Tên homestay |
| `address` | TEXT | Địa chỉ |
| `hotline` | TEXT | Số điện thoại hotline |
| `description` | TEXT | Mô tả ngắn |
| `plan` | TEXT | Gói hiện tại: `trial` / `lite` / `pro` / `premium` |
| `expires_at` | TIMESTAMPTZ | Ngày hết hạn gói (NULL = chưa set) |
| `created_at` | TIMESTAMPTZ | Ngày tạo |

**Ai dùng**: Middleware (check expired), webhook chatbot (check quota), admin panel.

**Lưu ý**: `plan` và `expires_at` được đọc trực tiếp ở đây (không JOIN `subscriptions`) để tối ưu tốc độ.

---

### `users_properties` — Phân Quyền User

**Mục đích**: Liên kết tài khoản đăng nhập với homestay + role.

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `id` | UUID PK | ID bản ghi |
| `user_id` | UUID FK → auth.users | Tài khoản đăng nhập |
| `property_id` | UUID FK → properties | Homestay được quản lý |
| `role` | TEXT | `owner` / `staff` / `admin` |
| `permissions` | JSONB | Quyền chi tiết (chỉ dùng cho `staff`) |
| `created_at` | TIMESTAMPTZ | Ngày tạo |

**Role có thể nhận**:

| Role | Quyền truy cập |
|------|---------------|
| `owner` | Toàn bộ `/dashboard` |
| `staff` | `/dashboard` trừ các trang nhạy cảm (billing, usage, knowledge-base, settings, staff) |
| `admin` | Chỉ `/admin`, không vào được `/dashboard` |

**Cấu trúc `permissions` cho staff**:

| Key | Mặc định | Ý nghĩa |
|-----|---------|---------|
| `can_view_bookings` | true | Xem yêu cầu đặt phòng |
| `can_view_conversations` | true | Xem hội thoại chatbot |
| `can_view_calendar` | true | Xem lịch phòng |
| `can_edit_rooms` | false | Quản lý phòng |
| `can_edit_knowledge` | false | Chỉnh knowledge base |
| `can_view_revenue` | false | Xem doanh thu |
| `can_view_usage` | false | Xem quota sử dụng |
| `can_edit_settings` | false | Chỉnh cài đặt |
| `can_manage_billing` | false | Quản lý ví & thanh toán |

**Ai dùng**: Middleware (routing), mọi API cần xác thực.

---

### `subscriptions` — Lịch Sử Gói SaaS

**Mục đích**: Lưu lịch sử các lần mua/gia hạn gói. Admin dùng để theo dõi.

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `id` | UUID PK | ID bản ghi |
| `property_id` | UUID FK → properties | Homestay |
| `plan` | TEXT | Tên gói |
| `status` | TEXT | `trial` / `active` / `expired` / `cancelled` |
| `started_at` | TIMESTAMPTZ | Ngày bắt đầu |
| `expires_at` | TIMESTAMPTZ | Ngày hết hạn |
| `trial_ends_at` | TIMESTAMPTZ | Ngày kết thúc trial |

**Ai dùng**: Admin panel (xem thống kê, quản lý subscription).

---

### `rooms` — Danh Sách Phòng

**Mục đích**: Thông tin từng phòng của homestay.

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `room_id` | TEXT (PK) | Mã phòng (vd: "P101") |
| `property_id` | UUID PK + FK | Homestay sở hữu |
| `loai_phong` | TEXT | Loại phòng (vd: "Phòng Giường Đôi") |
| `suc_chua` | INTEGER | Sức chứa (số người) |
| `gia_dem` | INTEGER | Giá mỗi đêm (VNĐ) |

**Primary key**: (`room_id`, `property_id`) — composite key.

**Ai dùng**: Owner dashboard (CRUD phòng), chatbot (trả lời hỏi giá/phòng), knowledge base builder.

---

### `room_images` — Ảnh Phòng

**Mục đích**: Lưu URL ảnh của từng phòng. Chatbot gửi ảnh cho khách khi được hỏi.

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `id` | UUID PK | ID ảnh |
| `property_id` | UUID FK → properties | Homestay |
| `room_id` | TEXT | Mã phòng (liên kết logic với `rooms.room_id`) |
| `image_url` | TEXT | URL ảnh (Supabase Storage) |
| `sort_order` | INTEGER | Thứ tự hiển thị |
| `created_at` | TIMESTAMPTZ | Ngày upload |

**Ai dùng**: Owner (upload ảnh), chatbot (gửi ảnh khi có tag `[SHOW_IMAGES:room_id]`).

---

### `bookings` — Yêu Cầu Đặt Phòng

**Mục đích**: Log yêu cầu đặt phòng từ chatbot. **Không phải booking thật** — chủ nhà đặt chính thức trên Airbnb/Booking.com.

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `id` | SERIAL PK | ID yêu cầu |
| `property_id` | UUID FK → properties | Homestay |
| `so_phong` | TEXT | Mã phòng muốn đặt |
| `loai_phong` | TEXT | Loại phòng |
| `ho_ten` | TEXT | Tên khách |
| `sdt` | TEXT | Số điện thoại |
| `email` | TEXT | Email khách |
| `check_in` | DATE | Ngày nhận phòng |
| `check_out` | DATE | Ngày trả phòng |
| `num_day` | INTEGER | Số đêm |
| `tinh_trang` | TEXT | Trạng thái xử lý |
| `timestamp` | TIMESTAMPTZ | Thời gian tạo |
| `conversation_id` | TEXT | ID hội thoại Chatwoot |

**Giá trị `tinh_trang`**:

| Giá trị | Ý nghĩa |
|---------|---------|
| `mới` | Chatbot vừa ghi nhận, chưa ai xử lý |
| `đã liên hệ` | Chủ nhà đã gọi/nhắn khách |

**Ai dùng**: Chatbot (insert khi nhận tag `[BOOKING_REQUEST]`), owner dashboard (xem và cập nhật trạng thái).

---

### `service_requests` — Yêu Cầu Dịch Vụ

**Mục đích**: Ghi nhận yêu cầu dịch vụ từ khách đang ở trong phòng (dọn phòng, thêm khăn, gọi đồ ăn...).

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `id` | SERIAL PK | ID yêu cầu |
| `property_id` | UUID FK → properties | Homestay |
| `timestamp` | TIMESTAMPTZ | Thời gian tạo |
| `conversation_id` | TEXT | ID hội thoại Chatwoot |
| `so_phong` | TEXT | Phòng gửi yêu cầu |
| `tag` | TEXT | Tag phân loại |
| `loai_dich_vu` | TEXT | Loại dịch vụ (vd: "Dọn phòng") |
| `chi_tiet` | TEXT | Mô tả chi tiết |
| `trang_thai` | TEXT | Trạng thái xử lý |

**Giá trị `trang_thai`**:

| Giá trị | Ý nghĩa |
|---------|---------|
| `Mới` | Vừa nhận, chưa xử lý |
| `Đang xử lý` | Nhân viên đang xử lý |
| `Hoàn thành` | Đã xong |

**Ai dùng**: Chatbot (insert), owner/staff dashboard (xem và cập nhật trạng thái).

---

### `knowledge_base_sections` — Nội Dung Chatbot

**Mục đích**: Lưu nội dung chatbot theo từng section, bật/tắt độc lập. Đây là "não" của chatbot.

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `id` | UUID PK | ID section |
| `property_id` | UUID FK → properties | Homestay |
| `section_key` | TEXT | Loại section (xem bên dưới) |
| `title` | TEXT | Tiêu đề hiển thị |
| `content` | TEXT | Nội dung (Markdown) |
| `is_active` | BOOLEAN | Bật/tắt section này |
| `sort_order` | INTEGER | Thứ tự trong system prompt |
| `updated_at` | TIMESTAMPTZ | Lần cập nhật cuối |

**Giá trị `section_key`**:

| Key | Nội dung |
|-----|---------|
| `general_info` | Tên, địa chỉ, hotline, mô tả homestay |
| `rooms_pricing` | Bảng giá (tích hợp dữ liệu từ bảng `rooms`) |
| `policies` | Check-in/out, hủy phòng, nội quy |
| `amenities` | Wifi, bể bơi, BBQ, tiện ích |
| `upsell` | Romance setup, thuê xe, dịch vụ thêm |
| `faq` | Câu hỏi thường gặp |
| `sister_properties` | Giới thiệu homestay liên kết |

**Ai dùng**: Owner (chỉnh nội dung), chatbot webhook (load khi build system prompt).

---

### `channel_mappings` — Kênh Chat Kết Nối

**Mục đích**: Quản lý các kênh chat đã kết nối với từng homestay. Webhook handler check bảng này **trước tiên**.

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `id` | UUID PK | ID kênh |
| `property_id` | UUID FK → properties | Homestay |
| `channel` | TEXT | Tên kênh |
| `inbox_id` | TEXT | Chatwoot inbox_id tương ứng |
| `config` | JSONB | Cấu hình riêng của kênh |
| `is_active` | BOOLEAN | Bật/tắt kênh này |
| `created_at` | TIMESTAMPTZ | Ngày tạo |
| `updated_at` | TIMESTAMPTZ | Ngày cập nhật |

**Giá trị `channel`**: `telegram`, `zalo`, `messenger`, `instagram`, `whatsapp`, `website`

**Ai dùng**: Admin (thêm/bật/tắt kênh), chatbot webhook (lookup property_id từ inbox_id).

---

### `chatwoot_inbox_mapping` — Map Inbox (Legacy)

**Mục đích**: Map `inbox_id` Chatwoot → `property_id`. Dùng làm **fallback** khi không tìm thấy trong `channel_mappings`.

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `id` | SERIAL PK | ID bản ghi |
| `inbox_id` | TEXT UNIQUE | Chatwoot inbox_id |
| `property_id` | UUID FK → properties | Homestay tương ứng |
| `created_at` | TIMESTAMPTZ | Ngày tạo |

**Ai dùng**: Chatbot webhook (fallback lookup).

---

### `llm_settings` — Cấu Hình AI Model

**Mục đích**: Lưu cấu hình provider và API key để gọi LLM. Hỗ trợ per-property hoặc global.

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `id` | UUID PK | ID cấu hình |
| `provider` | TEXT | Provider chính: `gemini` / `openai` / `groq` / `anthropic` |
| `model` | TEXT | Tên model (vd: `gemini-2.0-flash-lite`) |
| `api_key` | TEXT | API key |
| `fallback_provider` | TEXT | Provider dự phòng |
| `fallback_model` | TEXT | Model dự phòng |
| `fallback_api_key` | TEXT | API key dự phòng |
| `is_active` | BOOLEAN | Đang dùng hay không |
| `property_id` | UUID FK (nullable) | NULL = global config |
| `updated_at` | TIMESTAMPTZ | Ngày cập nhật |
| `updated_by` | UUID FK → auth.users | Ai cập nhật |

**Priority**: property-specific → global (`property_id IS NULL`) → env vars

**Ai dùng**: Admin (cấu hình), chatbot webhook (load để gọi LLM).

---

### `monthly_usages` — Quota Tin Nhắn Theo Tháng

**Mục đích**: Đếm số tin nhắn chatbot đã xử lý trong tháng. Dùng để enforce giới hạn theo plan.

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `id` | UUID PK | ID bản ghi |
| `property_id` | UUID FK → properties | Homestay |
| `year_month` | TEXT | Tháng, format `YYYY-MM` |
| `message_count` | INTEGER | Số tin nhắn đã xử lý |

**Unique constraint**: (`property_id`, `year_month`)

**Giới hạn theo plan**:

| Plan | Giới hạn/tháng |
|------|---------------|
| trial | 50 |
| lite | 1,000 |
| pro | 2,500 |
| premium | 4,000 |

**Ai dùng**: Chatbot webhook (check quota + increment sau mỗi tin nhắn), owner usage page.

---

### `llm_usage_logs` — Log Token Chi Tiết

**Mục đích**: Ghi log chi tiết từng lần gọi LLM: model, token in/out, tháng. Dùng cho trang Usage của owner.

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `id` | UUID PK | ID log |
| `property_id` | UUID FK → properties | Homestay |
| `provider` | TEXT | Provider đã dùng |
| `model` | TEXT | Model đã dùng |
| `input_tokens` | INTEGER | Token đầu vào |
| `output_tokens` | INTEGER | Token đầu ra |
| `total_tokens` | INTEGER | Tổng token |
| `year_month` | TEXT | Tháng, format `YYYY-MM` |
| `created_at` | TIMESTAMPTZ | Thời điểm gọi |

**Ai dùng**: Chatbot webhook (insert sau mỗi LLM call), owner usage page (xem biểu đồ + chi phí ước tính).

---

### `wallets` — Ví Điểm Thưởng

**Mục đích**: Lưu số dư điểm của homestay. Dùng để mua gói subscription.

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `id` | UUID PK | ID ví |
| `property_id` | UUID FK UNIQUE | Homestay (1:1) |
| `points_balance` | INTEGER | Số điểm hiện tại |
| `updated_at` | TIMESTAMPTZ | Lần cập nhật cuối |

**Quy đổi**: 1,000 VNĐ = 1 điểm

**Tạo tự động**: Ví được tạo tự động (lazy creation) lần đầu owner vào trang Billing.

**Cộng điểm**: Qua RPC function `increment_wallet_balance(p_property_id, p_points)`.

**Ai dùng**: Owner billing page (xem số dư), subscribe API (trừ điểm khi mua gói).

---

### `wallet_transactions` — Lịch Sử Giao Dịch

**Mục đích**: Log toàn bộ giao dịch ví: nạp tiền qua PayOS, mua/gia hạn gói.

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `id` | UUID PK | ID giao dịch |
| `property_id` | UUID FK → properties | Homestay |
| `amount_vnd` | INTEGER | Số tiền VNĐ (0 nếu là giao dịch điểm) |
| `points` | INTEGER | Số điểm cộng/trừ |
| `type` | TEXT | Loại giao dịch |
| `status` | TEXT | Trạng thái |
| `description` | TEXT | Mô tả giao dịch |
| `payos_order_code` | BIGINT | Mã đơn hàng PayOS (chỉ có khi nạp tiền) |
| `created_at` | TIMESTAMPTZ | Thời gian tạo |

**Giá trị `type`**:

| Giá trị | Ý nghĩa |
|---------|---------|
| `deposit` | Nạp tiền qua PayOS → cộng điểm |
| `upgrade` | Nâng cấp lên gói cao hơn → trừ điểm |
| `renew` | Gia hạn gói hiện tại → trừ điểm |

**Giá trị `status`**: `pending`, `success`, `failed`

**Ai dùng**: PayOS webhook (cập nhật status), owner billing page (xem lịch sử).

---

### `plan_settings` — Cấu Hình Gói Dịch Vụ

**Mục đích**: Lưu giá điểm và giới hạn tin nhắn của từng gói. Admin chỉnh được mà không cần deploy lại.

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `id` | UUID PK | ID bản ghi |
| `plan` | TEXT UNIQUE | Tên gói: `lite` / `pro` / `premium` |
| `price_points` | INTEGER | Số điểm cần để mua 1 tháng |
| `message_limit` | INTEGER | Giới hạn tin nhắn/tháng |
| `updated_at` | TIMESTAMPTZ | Ngày cập nhật |

**Giá trị gợi ý**:

| Plan | price_points | message_limit |
|------|-------------|---------------|
| lite | 200 | 1,000 |
| pro | 450 | 2,500 |
| premium | 700 | 4,000 |

> Trial không có trong bảng này — giới hạn 50 tin nhắn được hard-code trong webhook handler.

**Ai dùng**: Owner billing page (xem giá gói), subscribe API (lookup giá khi mua), admin (chỉnh giá).

---

## 3. Bảng Tạm Ẩn

Hai bảng này tồn tại trong DB và có cron job sync, nhưng UI đang bị ẩn.

### `ical_feeds` — URL iCal Từ OTA

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `id` | UUID PK | ID feed |
| `property_id` | UUID FK | Homestay |
| `room_id` | TEXT | Phòng áp dụng |
| `url` | TEXT | URL iCal (Airbnb/Booking.com) |
| `last_synced` | TIMESTAMPTZ | Lần sync cuối |
| `sync_error` | TEXT | Lỗi sync gần nhất (nếu có) |

### `ical_bookings` — Booking Import Từ OTA

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `id` | UUID PK | ID booking |
| `feed_id` | UUID FK → ical_feeds | Feed nguồn |
| `uid` | TEXT | UID từ iCal (unique per feed) |
| `summary` | TEXT | Tên sự kiện |
| `dtstart` | DATE | Ngày nhận phòng |
| `dtend` | DATE | Ngày trả phòng |
| `created_at` | TIMESTAMPTZ | Ngày import |

**Unique constraint**: (`feed_id`, `uid`)

---

## 4. Quan Hệ Tổng Thể

### 4.1 Sơ đồ tổng quan — tất cả bảng và mối liên kết

```
auth.users
    │ 1:N
    ▼
users_properties
    │ N:1
    ▼
properties  (TRUNG TÂM)
    │
    ├── 1:N ──→  rooms
    │                └── 1:N ──→  room_images
    │                └── 1:N ──→  ical_feeds  (UI tạm ẩn)
    │                                 └── 1:N ──→  ical_bookings
    │
    ├── 1:N ──→  bookings
    ├── 1:N ──→  knowledge_base_sections
    ├── 1:N ──→  channel_mappings
    ├── 1:N ──→  chatwoot_inbox_mapping  (legacy fallback)
    ├── 0:1 ──→  llm_settings            (NULL = dùng global)
    ├── 1:N ──→  monthly_usages
    ├── 1:N ──→  llm_usage_logs
    ├── 1:1 ──→  wallets
    └── 1:N ──→  wallet_transactions

plan_settings  (không FK — admin config toàn cục)
```

---

### 4.2 Nhóm PHÒNG

```
properties
    │ 1:N
    ├──→ rooms (room_id, loai_phong, suc_chua, gia_dem)
    │        │ 1:N
    │        └──→ room_images (image_url, sort_order)
    │                  ↑
    │            Chatbot đọc để gửi ảnh cho khách
    │
    │  [Tạm ẩn - chưa bật UI]
    └──→ ical_feeds (url iCal từ Airbnb/Booking.com)
             │ 1:N
             └──→ ical_bookings (ngày bận sync từ OTA)
```

---

### 4.3 Nhóm ĐẶT PHÒNG & DỊCH VỤ

```
properties
    │ 1:N
    ├──→ bookings
    │         Chatbot insert khi nhận tag [BOOKING_REQUEST]
    │         Owner xem + đổi trạng thái: mới → đã liên hệ
    │
    └──→ service_requests
              Chatbot insert khi khách yêu cầu dịch vụ
              Owner/Staff xem + đổi: Mới → Đang xử lý → Hoàn thành
```

---

### 4.4 Nhóm CHATBOT AI

```
properties
    │ 1:N
    ├──→ knowledge_base_sections   ← "não" của chatbot (7 sections)
    │
    │ 1:N
    ├──→ channel_mappings          ← Kênh chat (Telegram/Zalo/Messenger...)
    │         inbox_id → property_id  (webhook check đây TRƯỚC)
    │
    │ 1:N
    ├──→ chatwoot_inbox_mapping    ← Legacy fallback (vẫn cần)
    │         inbox_id → property_id  (webhook check đây NẾU KHÔNG có channel_mappings)
    │
    │ 0..1
    └──→ llm_settings              ← Config AI model per-property
              Nếu NULL → dùng llm_settings global (property_id IS NULL)
```

---

### 4.5 Nhóm USAGE TRACKING

```
properties
    │ 1:N
    ├──→ monthly_usages            ← Đếm tin nhắn/tháng → enforce quota
    │         YYYY-MM │ message_count
    │         Webhook tăng +1 sau mỗi tin nhắn
    │
    └──→ llm_usage_logs            ← Log token chi tiết từng lần gọi LLM
              provider │ model │ input_tokens │ output_tokens │ year_month
              Owner xem ở trang Usage
```

---

### 4.6 Nhóm THANH TOÁN

```
properties
    │ 1:1
    ├──→ wallets                   ← Số dư điểm (tạo tự động lần đầu)
    │         points_balance
    │
    └──→ wallet_transactions       ← Lịch sử giao dịch
              type: deposit / upgrade / renew
              status: pending → success / failed

                    ↑ deposit
              PayOS Webhook
              (xác nhận thanh toán → cộng điểm vào wallets)

plan_settings  ← Bảng độc lập, không foreign key với properties
    plan │ price_points │ message_limit
    Admin chỉnh giá → áp dụng ngay không cần deploy
```

---

### 4.7 Nhóm LỊCH SỬ & ADMIN

```
properties
    │ 1:N
    └──→ subscriptions             ← Lịch sử gói SaaS
              plan │ status │ started_at │ expires_at
              Admin xem để theo dõi, KHÔNG dùng để check hàng ngày
              (check hàng ngày dùng properties.plan + properties.expires_at)
```

---

### 4.8 Luồng Webhook Chatbot (tóm tắt quan hệ DB)

```
Tin nhắn từ khách
        │
        ▼
   inbox_id  ──→  channel_mappings  ──→  property_id
                       (fallback) chatwoot_inbox_mapping

        │
        ▼
   properties  ──→  kiểm tra expires_at (hết hạn?)
   monthly_usages  ──→  kiểm tra message_count (hết quota?)

        │
        ▼
   knowledge_base_sections  ┐
   rooms                    ├──→  Build system prompt
   room_images              ┘
   llm_settings  ──→  Gọi LLM

        │
        ▼
   Reply cho khách
   bookings  ──→  Insert nếu khách muốn đặt phòng
   service_requests  ──→  Insert nếu khách yêu cầu dịch vụ
   monthly_usages  ──→  +1 message_count
   llm_usage_logs  ──→  Ghi log token
```

---

## 5. Ai Dùng Bảng Nào

| Vai trò / Luồng | Bảng truy cập |
|----------------|--------------|
| **Middleware** (mỗi request) | `users_properties`, `properties` (plan, expires_at) |
| **Chatbot webhook** | `channel_mappings`, `chatwoot_inbox_mapping`, `properties`, `monthly_usages`, `knowledge_base_sections`, `rooms`, `room_images`, `llm_settings`, `bookings`, `service_requests`, `llm_usage_logs` |
| **Owner — Dashboard home** | `bookings`, `service_requests`, `rooms` |
| **Owner — Rooms** | `rooms`, `room_images` |
| **Owner — Bookings** | `bookings` |
| **Owner — Conversations** | Chatwoot API (không dùng Supabase) |
| **Owner — Knowledge Base** | `knowledge_base_sections`, `rooms` |
| **Owner — Usage** | `monthly_usages`, `llm_usage_logs`, `properties` |
| **Owner — Billing** | `wallets`, `wallet_transactions`, `plan_settings`, `properties` |
| **Owner — Staff** | `users_properties` (role=staff), auth.users |
| **Admin — Properties** | `properties`, `subscriptions`, `users_properties` |
| **Admin — Channels** | `channel_mappings` |
| **Admin — LLM Settings** | `llm_settings` |
| **Admin — Plan Settings** | `plan_settings` |
| **Admin — Analytics** | `properties`, `subscriptions`, `bookings`, `rooms` |
| **PayOS Webhook** | `wallet_transactions`, `wallets` (qua RPC) |
| **Cron — Auto Resolve** | Chatwoot API (không dùng Supabase) |

---

## 6. RLS Policies

| Bảng | anon | owner / staff | service_role |
|------|------|--------------|--------------|
| `properties` | — | SELECT/UPDATE own | ALL |
| `users_properties` | — | SELECT own | ALL |
| `subscriptions` | — | SELECT own | ALL |
| `rooms` | SELECT | SELECT/INSERT/UPDATE/DELETE own | ALL |
| `room_images` | SELECT | SELECT/INSERT/DELETE own | ALL |
| `bookings` | — | SELECT/INSERT/UPDATE own | ALL |
| `service_requests` | — | SELECT/INSERT/UPDATE own | ALL |
| `knowledge_base_sections` | — | SELECT/INSERT/UPDATE own | ALL |
| `channel_mappings` | — | SELECT own | ALL |
| `chatwoot_inbox_mapping` | — | SELECT own | ALL |
| `llm_settings` | — | SELECT own + global | ALL |
| `monthly_usages` | — | SELECT own | ALL |
| `llm_usage_logs` | — | SELECT own | ALL |
| `wallets` | — | SELECT/UPDATE own | ALL |
| `wallet_transactions` | — | SELECT/INSERT own | ALL |
| `plan_settings` | SELECT | SELECT | ALL |

"own" = `property_id` thuộc về property của user đang đăng nhập (qua `users_properties`).

---

## 7. RPC Functions Quan Trọng

| Function | Tham số | Mục đích |
|----------|---------|---------|
| `increment_monthly_usage` | `p_property_id`, `p_year_month` | Tăng `message_count` +1, tạo row mới nếu chưa có |
| `increment_wallet_balance` | `p_property_id`, `p_points` | Cộng điểm vào ví (atomic, tránh race condition) |
