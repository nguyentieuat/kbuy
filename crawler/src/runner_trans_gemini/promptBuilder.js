function buildPrompt(item) {
  return `
Dịch JSON sau sang tiếng Việt.
                RULE:
                - Output phải parse được bằng JSON.parse()
                - GIỮ NGUYÊN productId, productId output PHẢI GIỐNG CHÍNH XÁC input
                - Tuyệt đối không sử dụng dữ liệu từ sản phẩm khác
				        - Dịch luôn specs và name, kết quả field tương ứng trả về là specs_vn, name_vn
                ĐỐI VỚI SPECS:
                  - Không dịch máy từng dòng một cách máy móc.
                  - Nếu phát hiện các trường chung chung như:
                    - "Vui lòng tham khảo chi tiết sản phẩm"
                    - "상품 상세페이지 참조"
                    - "상세정보 참조"
                    - "상세설명 참조"

                    => KHÔNG giữ nguyên nội dung này trong specs_vi.

                  - Hãy phân tích:
                    - Tên sản phẩm
                    - Mô tả sản phẩm
                    - Thông tin chức năng
                    - Thành phần
                    - Hướng dẫn sử dụng
                    để cập nhật vào specs_vi

                    - specs_vi phải giải thích ngắn gọn:
                      - Các trường PHẢI viết bằng tiếng Việt có dấu đầy đủ.
                      - Đây là sản phẩm gì
                      - Công dụng chính
                      - Đối tượng sử dụng
                      - Cách dùng cơ bản
                      - Nếu là thực phẩm chức năng:
                        ưu tiên giải thích lợi ích thực tế cho người dùng Việt Nam.
                    
                - Trong variants dịch name_kr trả về name_vi
                - Giữ nguyên kích thước (S, M, L, XL, 2XL...) chính xác như ban đầu
                - KHÔNG xóa các mã kích thước hoặc màu sắc ở cuối chuỗi
                - Coi kích thước là thuộc tính sản phẩm, không phải văn bản cần dịch
                - Không đưa variantId vào kết quả dịch
                - Không thêm giải thích
                - Trả về JSON ARRAY đúng format
                - Hãy giữ nguyên tên các hợp chất hóa học bằng tiếng Anh (ví dụ: Glycerin, Niacinamide) và chỉ dịch tên các chiết xuất tự nhiên sang tiếng Việt."
                - Đối với các trường có nội dung dài như 'Lưu ý khi sử dụng' và 'Hướng dẫn sử dụng':
                    Phân tích cấu trúc: Hãy tự động nhận diện các thành phần có tính liệt kê (bất kể chúng bắt đầu bằng 1, 2, 3; hoặc a, b, c; hoặc các dấu gạch đầu dòng -, •).
                    Định dạng Markdown: Trình bày lại dưới dạng danh sách Markdown có phân cấp rõ ràng:
                    Các mục lớn nhất luôn bắt đầu bằng 1., 2., 3.
                    Các mục con bổ trợ cho mục lớn phải được thụt lề và bắt đầu bằng dấu gạch ngang -.
                    Tính nhất quán: Ngay cả khi văn bản gốc dùng 'a, b, c' làm mục lớn, hãy chuyển đổi chúng về hệ thống 1, 2, 3 để toàn bộ sản phẩm có định dạng đồng nhất.
                    Ví dụ mục tiêu:
                        1. Lưu ý chung
                            - Tránh ánh nắng
                            - Để xa tầm tay
                        2. Hạn chế sử dụng trên vết thương.
Phát hiện:
- Trọng lượng 
- Thể tích 
- Kích thước
- Sản phẩm mỹ phẩm
- Sản phẩm thực phẩm
Trích xuất trọng lượng/kích thước nếu:
A. Trọng lượng rõ ràng tồn tại → sử dụng
B. Thể tích rõ ràng tồn tại VÀ Sản phẩm mỹ phẩm = true → chuyển đổi ml → g
C. Kích thước rõ ràng tồn tại → chuyển đổi
Nếu không tồn tại: → ước lượng khối lượng kích thước
Áp dụng thông tin cho cả variants
QUAN TRỌNG:
- Các giá trị thiếu thì dự đoán và đánh giá trọng số độ chính xác vào weight_confidence 

trả về json format:
{
  "productId": "string",
  "name_vi": "string",
  "specs_vi": {},
  "product_shipping": {
    "weight_grams": null,
    "length_mm": null,
    "width_mm": null,
    "height_mm": null,
    "chargeable_weight_grams": null,
    "weight_source": "specs|text|estimated",
    "weight_confidence": 0.0,
    "is_weight_estimated": true
  },
  "variants": [
    {
      "variantId": "string",
      "name_vi": "string",
      "shipping": {
        "weight_grams": null,
        "length_mm": null,
        "width_mm": null,
        "height_mm": null,
        "chargeable_weight_grams": null,
        "weight_source": "variant|specs|estimated",
        "weight_confidence": 0.0,
        "is_weight_estimated": true
      }
    }
  ]
}

data:
${JSON.stringify(item)}
`;
}

module.exports = { buildPrompt };