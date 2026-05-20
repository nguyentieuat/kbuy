// services/email/templates/index.js

function buildItemsHtml(items = []) {
  if (!items.length) return "";

  return `
    <table style="width:100%; border-collapse:collapse; margin:16px 0;">
      ${items.map((i) => `
        <tr>
          <td style="padding:10px 0; border-bottom:1px solid #f0f0f0; width:60px;">
            ${i.image
              ? `<img
                  src="${i.image}"
                  alt="${i.product_name}"
                  style="width:56px; height:56px; object-fit:cover; border-radius:8px; border:1px solid #eee;"
                />`
              : `<div style="width:56px; height:56px; background:#f0f0f0; border-radius:8px;"></div>`
            }
          </td>
          <td style="padding:10px 12px; border-bottom:1px solid #f0f0f0;">
            <div style="font-size:13px; font-weight:600; color:#333; margin-bottom:2px;">
              ${i.product_name}
            </div>
            ${i.variant_name
              ? `<div style="font-size:12px; color:#888;">${i.variant_name}</div>`
              : ""}
            <div style="font-size:12px; color:#aaa;">x${i.quantity}</div>
          </td>
          <td style="padding:10px 0; border-bottom:1px solid #f0f0f0; text-align:right; white-space:nowrap;">
            <span style="font-size:13px; font-weight:600; color:#e53935;">
              ${Number(i.price * i.quantity).toLocaleString("vi-VN")}₫
            </span>
          </td>
        </tr>
      `).join("")}
    </table>
  `;
}

function buildHeader(color, emoji, title) {
  return `
    <div style="background:${color}; padding:24px; text-align:center;">
      <h2 style="color:#fff; margin:0; font-size:18px;">${emoji} ${title}</h2>
      <p style="color:rgba(255,255,255,0.8); margin:4px 0 0; font-size:13px;">KoreaBuy</p>
    </div>
  `;
}

function buildFooter() {
  return `
    <div style="background:#f8f9fa; padding:16px 28px; border-top:1px solid #eee; text-align:center;">
      <p style="color:#bbb; font-size:11px; margin:0;">
        © ${new Date().getFullYear()} KoreaBuy — Mua hàng Hàn Quốc uy tín
      </p>
    </div>
  `;
}

// ── Templates ─────────────────────────────────────────────────────────────

function buildOrderConfirmedTemplate({ orderCode, receiverName, items, totalFinal, shippingFee }) {
  return `<!DOCTYPE html>
  <html>
  <body style="margin:0; padding:0; background:#f8f9fa; font-family:Arial,sans-serif;">
    <div style="max-width:520px; margin:40px auto; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 4px 16px rgba(0,0,0,0.08);">
      ${buildHeader("#007bff", "🎉", "Đơn hàng đã được xác nhận")}
      <div style="padding:28px;">
        <p style="color:#555; font-size:14px; margin:0 0 16px;">
          Xin chào <strong>${receiverName}</strong>,<br/>
          Đơn hàng <strong>#${orderCode}</strong> của bạn đã được xác nhận và đang được xử lý.
        </p>

        ${buildItemsHtml(items)}

        <div style="background:#f8f9fa; border-radius:8px; padding:14px; font-size:13px;">
          <div style="display:flex; justify-content:space-between; margin-bottom:6px; color:#888;">
            <span>Phí vận chuyển</span>
            <span>${Number(shippingFee).toLocaleString("vi-VN")}₫</span>
          </div>
          <div style="display:flex; justify-content:space-between; font-weight:700; font-size:15px; padding-top:8px; border-top:1px dashed #ddd;">
            <span>Tổng thanh toán</span>
            <span style="color:#e53935;">${Number(totalFinal).toLocaleString("vi-VN")}₫</span>
          </div>
        </div>

        <p style="color:#aaa; font-size:12px; margin-top:16px; line-height:1.6;">
          Chúng tôi sẽ thông báo ngay khi hàng được gửi đi từ Hàn Quốc.
        </p>
      </div>
      ${buildFooter()}
    </div>
  </body>
  </html>`;
}

function buildTrackingTemplate({ orderCode, receiverName, trackingCode, carrier, items }) {
  return `<!DOCTYPE html>
  <html>
  <body style="margin:0; padding:0; background:#f8f9fa; font-family:Arial,sans-serif;">
    <div style="max-width:520px; margin:40px auto; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 4px 16px rgba(0,0,0,0.08);">
      ${buildHeader("#1d4ed8", "✈️", "Hàng đang trên đường về!")}
      <div style="padding:28px;">
        <p style="color:#555; font-size:14px; margin:0 0 16px;">
          Xin chào <strong>${receiverName}</strong>,<br/>
          Đơn hàng <strong>#${orderCode}</strong> đã được gửi từ Hàn Quốc.
        </p>

        <div style="background:#f0f6ff; border:2px dashed #1d4ed8; border-radius:10px; padding:16px; text-align:center; margin-bottom:20px;">
          <p style="margin:0 0 4px; font-size:11px; color:#888; text-transform:uppercase; letter-spacing:1px;">Mã vận đơn</p>
          <p style="margin:0; font-size:22px; font-weight:700; color:#1d4ed8; font-family:monospace; letter-spacing:2px;">${trackingCode}</p>
          ${carrier ? `<p style="margin:6px 0 0; font-size:12px; color:#888;">Đơn vị: ${carrier}</p>` : ""}
        </div>

        ${buildItemsHtml(items)}

        <p style="color:#aaa; font-size:12px; line-height:1.6;">
          ⏱ Thời gian vận chuyển dự kiến <strong>5-10 ngày làm việc</strong>.<br/>
          Chúng tôi sẽ thông báo khi hàng về đến Việt Nam.
        </p>
      </div>
      ${buildFooter()}
    </div>
  </body>
  </html>`;
}

function buildArrivedVnTemplate({ orderCode, receiverName, items }) {
  return `<!DOCTYPE html>
  <html>
  <body style="margin:0; padding:0; background:#f8f9fa; font-family:Arial,sans-serif;">
    <div style="max-width:520px; margin:40px auto; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 4px 16px rgba(0,0,0,0.08);">
      ${buildHeader("#16a34a", "🇻🇳", "Hàng đã về Việt Nam!")}
      <div style="padding:28px;">
        <p style="color:#555; font-size:14px; margin:0 0 16px;">
          Xin chào <strong>${receiverName}</strong>,<br/>
          Đơn hàng <strong>#${orderCode}</strong> đã thông quan và đang được xử lý tại kho Việt Nam.
        </p>

        ${buildItemsHtml(items)}

        <p style="color:#aaa; font-size:12px; line-height:1.6;">
          Chúng tôi sẽ giao hàng đến bạn trong thời gian sớm nhất. 🚚
        </p>
      </div>
      ${buildFooter()}
    </div>
  </body>
  </html>`;
}

function buildDeliveredTemplate({ orderCode, receiverName, items }) {
  return `<!DOCTYPE html>
  <html>
  <body style="margin:0; padding:0; background:#f8f9fa; font-family:Arial,sans-serif;">
    <div style="max-width:520px; margin:40px auto; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 4px 16px rgba(0,0,0,0.08);">
      ${buildHeader("#f59e0b", "📦", "Giao hàng thành công!")}
      <div style="padding:28px;">
        <p style="color:#555; font-size:14px; margin:0 0 16px;">
          Xin chào <strong>${receiverName}</strong>,<br/>
          Đơn hàng <strong>#${orderCode}</strong> đã được giao thành công.
        </p>

        ${buildItemsHtml(items)}

        <p style="color:#aaa; font-size:12px; line-height:1.6;">
          Cảm ơn bạn đã tin tưởng KoreaBuy! 🙏<br/>
          Nếu có bất kỳ vấn đề gì, hãy liên hệ chúng tôi để được hỗ trợ.
        </p>
      </div>
      ${buildFooter()}
    </div>
  </body>
  </html>`;
}

module.exports = {
  buildOrderConfirmedTemplate,
  buildTrackingTemplate,
  buildArrivedVnTemplate,
  buildDeliveredTemplate,
};