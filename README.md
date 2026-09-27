# Đấu giá

**Mua đồ luxury giá bình dân.** Bản chơi thử (prototype) của mini app "đấu giá ngược" trong app ngân hàng: bên ngoài là đấu giá, bên trong là chương trình **dự đoán số nhỏ nhất duy nhất**. Người chơi thắng khi đưa ra mức giá thấp nhất mà không trùng với ai tại thời điểm gõ búa.

> Đây là bản demo chạy hoàn toàn trên trình duyệt. Các thợ săn khác trong phòng là **thợ săn ảo** do máy mô phỏng, giao dịch ngân hàng cũng là **mô phỏng**. Không có tiền thật, không có máy chủ.

## Chơi thử ngay trên máy

Cần Node.js 18 trở lên.

```bash
npm install
npm run dev
```

Mở địa chỉ mà terminal in ra (thường là http://localhost:5173). Nên dùng chế độ giả lập điện thoại của trình duyệt (F12 → biểu tượng điện thoại).

## Đưa lên GitHub và chơi qua GitHub Pages

1. Tạo repo mới trên GitHub, ví dụ `mua-do-luxury`.
2. Đẩy code lên nhánh `main`. Nếu tải lên bằng cách kéo thả trên web GitHub, **thư mục `.github` sẽ bị bỏ qua**: hãy tạo file `.github/workflows/deploy.yml` bằng Add file → Create new file và dán nội dung file đó vào. Nếu dùng git:
   ```bash
   git init
   git add .
   git commit -m "Prototype Mua đồ luxury giá bình dân"
   git branch -M main
   git remote add origin https://github.com/<tên-bạn>/mua-do-luxury.git
   git push -u origin main
   ```
3. Trên GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. Vào tab **Actions**, chờ workflow "Deploy lên GitHub Pages" chạy xong (khoảng 1–2 phút). Nếu workflow đã chạy trước khi bạn bật Pages, bấm **Re-run jobs**.
5. Mở `https://<tên-bạn>.github.io/mua-do-luxury/` trên điện thoại để chơi.

Workflow nằm ở `.github/workflows/deploy.yml`, tự build và deploy mỗi lần bạn push lên `main`.

## Những gì có trong bản demo

| Tính năng | Ghi chú |
| --- | --- |
| 6 loại tổ săn | Chớp Nhoáng, Giờ Vàng, Đặc Biệt (2 quà), Bí Mật (lịch ẩn), VIP (cần hạng Vàng), Đối Tác (3 quà) |
| Ra giá, trạng thái realtime | Giá nhập lẻ từng đồng, không giới hạn số lần ra giá (mỗi lần tốn 1 giọt mật). Đang dẫn đầu / Duy nhất / Bị trùng, cập nhật mỗi 0,5 giây |
| Bị cướp ngôi | Bảng "Phản công ngay", thẻ "Kỳ phùng địch thủ", thông báo khi đang ở màn khác |
| Đóng băng cuối phiên | Trạng thái bị khóa, ra giá mới hiện "Chờ gõ búa", công cụ bị khóa |
| Gõ búa | Hiệu ứng gõ búa, tính giá nhỏ nhất duy nhất, nhiều quà thì nhiều người thắng |
| Hũ mật Jackpot | Dồn quà hoặc bỏ phiên theo cấu hình từng phòng |
| Kết quả minh bạch | Biểu đồ phân bố giá, mã SHA-256, tải danh sách giá ẩn danh (.csv) |
| Soi vùng giá, Nhiệt kế | Soi quanh con số định ra xem còn bao nhiêu ô trống; Nhiệt kế cho biết giá dẫn đầu ở vùng nào |
| Điều hướng | Menu dưới luôn hiện, vuốt từ trái sang phải để quay lại (hiệu ứng mờ), cài được lên màn hình chính với icon con ong |
| Ví giọt mật | Kiếm từ giao dịch (mô phỏng), đổi điểm Loyalty, giờ vàng x2, hạn dùng, trần mỗi ngày |
| Chống cày | Không tính chuyển khoản cho chính mình, giao dịch dưới 50.000đ, vượt giới hạn |
| Hạng theo mùa | Đồng, Bạc, Vàng, Kim Cương; điểm săn; hạ một bậc khi sang mùa mới |
| Chuỗi 7 ngày, nhắc tổ mở, nhắc nghỉ | |
| Nhận quà | Chọn cách nhận, hạn xác nhận 7 ngày |

Dữ liệu người chơi lưu trong `localStorage` của trình duyệt. Muốn chơi lại từ đầu: bấm biểu tượng bánh răng ở sảnh → **Đặt lại dữ liệu demo**.

## Công cụ demo

Bánh răng ở góc trên sảnh mở bảng công cụ dành cho người thử nghiệm:

- **Tua nhanh** bất kỳ tổ nào đến sát giai đoạn đóng băng.
- Cộng giọt mật, cộng điểm Loyalty.
- Bật Giờ vàng đổi điểm bất kể giờ thật.
- Xem màn nhắc nghỉ.

Thêm `?debug` vào URL để truy cập engine qua `window.__store` trong console.

## Chỉnh tham số game

Mọi tham số nằm trong **`src/config.ts`**: thời lượng phòng, thời gian đóng băng, khoảng giá, số lượt, quà, quy tắc jackpot, hành vi thợ săn ảo, tỷ lệ đổi điểm, ngưỡng hạng, điểm săn...

Thời lượng trong bản demo được rút ngắn để trải nghiệm nhanh (ví dụ Chớp Nhoáng 3 phút thay vì 15 phút, đóng băng 20 giây thay vì 60 giây). Hành vi thợ săn ảo chỉnh qua `typicalVnd` (giá trung bình họ hay chọn) và `roundPref` (thích số đẹp). Giá trị theo GDD được ghi trong chú thích cạnh từng tham số.

## Cấu trúc mã nguồn

```
src/
  config.ts          Cấu hình game (tương ứng trang quản trị trong GDD)
  engine/
    game.ts          Engine: phiên, thợ săn ảo, trạng thái, đóng băng, gõ búa, ví, hạng
    types.ts         Kiểu dữ liệu
    util.ts          Định dạng, thời gian, SHA-256
  screens/           Sảnh, Tổ săn, Kết quả, Nhận quà, Ví, Hạng, Lịch sử
  components/        Mascot ong, icon, thông báo, các bảng trượt
  App.tsx            Điều hướng, thông báo, hiệu ứng gõ búa
```

## Khi làm sản phẩm thật

Engine trong `src/engine/game.ts` minh họa logic nghiệp vụ. Trong sản phẩm thật, toàn bộ phần này phải chạy ở **máy chủ**:

- Máy chủ là nguồn sự thật duy nhất cho giá, thời điểm, trạng thái và kết quả.
- Trong giai đoạn đóng băng, API chỉ trả về bản chụp trạng thái, không trả trạng thái thật.
- Giọt mật được cộng từ sự kiện giao dịch thật của core banking, có đối soát và thu hồi khi giao dịch bị hoàn.
- Định danh người chơi theo eKYC, chống bot và nhóm tài khoản phối hợp.
- Push notification tuân theo trần mỗi ngày và giờ yên lặng (tham số trong `SAFETY`).

## Build

```bash
npm run build          # ra thư mục dist/ (dùng cho GitHub Pages)
npm run build:single   # ra dist-single/index.html: một file HTML duy nhất, mở trực tiếp được
```
