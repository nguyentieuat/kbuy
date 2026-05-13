// components/checkout/ReceiverInfoSection.tsx

import SectionCard from "./SectionCard";

import type { FormData, FormErrors, SelectedAddress } from "./types";

type Props = {
  form: FormData;
  errors: FormErrors;
  selectedAddress: SelectedAddress | null;

  onChange: (field: keyof FormData, value: string) => void;

  onOpenAddress: () => void;
};

export default function ReceiverInfoSection({
  form,
  errors,
  selectedAddress,
  onChange,
  onOpenAddress,
}: Props) {
  return (
    <SectionCard title="Thông tin người nhận">
      {/* Giới tính */}
      <div className="d-flex gap-4 mb-3">
        {(["male", "female", "other"] as const).map((g) => (
          <label
            key={g}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            <input
              type="radio"
              name="gender"
              value={g}
              checked={form.gender === g}
              onChange={() => onChange("gender", g)}
            />
            {g === "male" ? "Nam" : g === "female" ? "Nữ" : "Khác"}
          </label>
        ))}
      </div>

      {/* Họ tên + SĐT */}
      <div className="row g-3 mb-3">
        <div className="col-sm-6">
          <input
            type="text"
            className="form-control"
            placeholder="Họ và tên *"
            value={form.full_name}
            data-error={!!errors.full_name}
            onChange={(e) => onChange("full_name", e.target.value)}
            style={{
              borderRadius: 8,
              fontSize: 14,
              borderColor: errors.full_name ? "#e53935" : undefined,
            }}
          />

          {errors.full_name && (
            <p
              style={{
                color: "#e53935",
                fontSize: 12,
                marginTop: 4,
                marginBottom: 0,
              }}
            >
              {errors.full_name}
            </p>
          )}
        </div>

        <div className="col-sm-6">
          <div
            data-error={!!errors.phone}
            style={{
              display: "flex",
              alignItems: "center",
              border: `1px solid ${errors.phone ? "#e53935" : "#dee2e6"}`,
              borderRadius: 8,
              overflow: "hidden",
            }}
          >
            <span
              style={{
                padding: "8px 12px",
                background: "#f8f8f8",
                borderRight: "1px solid #dee2e6",
                fontSize: 13,
                color: "#555",
                whiteSpace: "nowrap",
              }}
            >
              +84
            </span>

            <input
              type="tel"
              className="form-control border-0 shadow-none"
              placeholder="Số điện thoại *"
              value={form.phone}
              onChange={(e) => onChange("phone", e.target.value)}
              style={{
                borderRadius: 0,
                fontSize: 14,
              }}
            />
          </div>

          {errors.phone && (
            <p
              style={{
                color: "#e53935",
                fontSize: 12,
                marginTop: 4,
                marginBottom: 0,
              }}
            >
              {errors.phone}
            </p>
          )}
        </div>
      </div>

      {/* Email */}
      <div className="mb-3">
        <input
          type="email"
          className="form-control"
          placeholder="Email nhận xác nhận đơn hàng"
          value={form.email}
          onChange={(e) => onChange("email", e.target.value)}
          style={{
            borderRadius: 8,
            fontSize: 14,
          }}
        />
      </div>

      {/* Address */}
      <div data-error={!!errors.address}>
        <div
          onClick={onOpenAddress}
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            cursor: "pointer",
            border: `1px solid ${errors.address ? "#e53935" : "#dee2e6"}`,
            background: "#fff",
            fontSize: 14,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            minHeight: 44,
          }}
        >
          {selectedAddress ? (
            <span style={{ color: "#333", lineHeight: 1.5 }}>
              {selectedAddress.detail && `${selectedAddress.detail}, `}
              {selectedAddress.ward.name}, {selectedAddress.province.name}
            </span>
          ) : (
            <span style={{ color: "#aaa" }}>Chọn địa chỉ nhận hàng *</span>
          )}

          <span
            style={{
              color: "#007bff",
              fontSize: 13,
              marginLeft: 8,
              fontWeight: 600,
            }}
          >
            {selectedAddress ? "Thay đổi" : "Chọn"} →
          </span>
        </div>

        {errors.address && (
          <p
            style={{
              color: "#e53935",
              fontSize: 12,
              marginTop: 4,
              marginBottom: 0,
            }}
          >
            {errors.address}
          </p>
        )}
      </div>
    </SectionCard>
  );
}
