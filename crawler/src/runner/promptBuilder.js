function buildPrompt(item) {
  return `
Dịch JSON sau sang tiếng Việt.
                RULE:
                - Output phải parse được bằng JSON.parse()
                - Giữ nguyên id
				        - Dịch luôn specs và name, kết quả field tương ứng trả về là specs_vn, name_vn
                - Trong variants dịch name_kr trả về name_vi kết hợp cùng variantId
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