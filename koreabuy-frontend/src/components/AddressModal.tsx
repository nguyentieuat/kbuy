// components/AddressModal.tsx

import { useState, useRef, useEffect } from "react";
import { useProvinces, useWards } from "../hooks/useAddress";
import type { Province, Ward } from "../hooks/useAddress";

type AddressModalResult = {
  receiver_gender: "male" | "female" | "other";
  receiver_name?: string;
  receiver_phone?: string;

  province: Province;
  ward: Ward;
  detail: string;
};

type AddressModalProps = {
  onClose: () => void;

  onConfirm: (result: AddressModalResult) => void | Promise<void>;

  mode?: "checkout" | "profile";

  initialData?: {
    province?: Province | null;
    ward?: Ward | null;
    detail?: string;

    receiver_gender: "male" | "female" | "other";
    receiver_name?: string;
    receiver_phone?: string;
  };
};

export default function AddressModal({
  onClose,
  onConfirm,
  mode = "checkout",
  initialData,
}: AddressModalProps) {
  const { provinces, loading: loadingProvinces } = useProvinces();
  const [selectedProvince, setSelectedProvince] = useState<Province | null>(
    initialData?.province ?? null,
  );

  const [selectedWard, setSelectedWard] = useState<Ward | null>(
    initialData?.ward ?? null,
  );

  const [detail, setDetail] = useState(initialData?.detail ?? "");

  const { wards, loading: loadingWards } = useWards(
    selectedProvince?.code ?? null,
  );

  const [searchProvince, setSearchProvince] = useState("");
  const [searchWard, setSearchWard] = useState("");
  const [step, setStep] = useState<"province" | "ward" | "detail">(
    initialData?.province
      ? initialData?.ward
        ? "detail"
        : "ward"
      : "province",
  );
  const detailRef = useRef<HTMLInputElement>(null);

  const [receiverGender, setReceiverGender] = useState<
    "male" | "female" | "other"
  >("male");

  const [receiverName, setReceiverName] = useState(
    initialData?.receiver_name ?? "",
  );

  const [receiverPhone, setReceiverPhone] = useState(
    initialData?.receiver_phone ?? "",
  );
  useEffect(() => {
    if (!initialData) return;

    setSelectedProvince(initialData.province ?? null);
    setSelectedWard(initialData.ward ?? null);
    setDetail(initialData.detail ?? "");

    setReceiverGender(initialData.receiver_gender ?? "other");

    setReceiverName(initialData.receiver_name ?? "");
    setReceiverPhone(initialData.receiver_phone ?? "");

    // sync lại step
    if (initialData.province && initialData.ward) {
      setStep("detail");
    } else if (initialData.province) {
      setStep("ward");
    } else {
      setStep("province");
    }
  }, [initialData]);

  const filteredProvinces = provinces.filter((p) =>
    p.name.toLowerCase().includes(searchProvince.toLowerCase()),
  );

  const filteredWards = wards.filter((w) =>
    w.name.toLowerCase().includes(searchWard.toLowerCase()),
  );

  const handleConfirm = () => {
    if (!selectedProvince || !selectedWard) return;

    if (mode === "profile") {
      if (!receiverName.trim() || !receiverPhone.trim()) return;

      onConfirm({
        province: selectedProvince,
        ward: selectedWard,
        detail,
        receiver_gender: receiverGender,

        receiver_name: mode === "profile" ? receiverName.trim() : undefined,

        receiver_phone: mode === "profile" ? receiverPhone.trim() : undefined,
      });
      return;
    }

    // checkout mode
    onConfirm({
      province: selectedProvince,
      ward: selectedWard,
      detail,
      receiver_gender: receiverGender,
    });
  };

  const canConfirm =
    selectedProvince &&
    selectedWard &&
    (mode !== "profile" || (receiverName.trim() && receiverPhone.trim()));

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          zIndex: 1040,
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          background: "#fff",
          borderRadius: 16,
          zIndex: 1050,
          width: "min(560px, 95vw)",
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 16px 48px rgba(0,0,0,0.15)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "18px 24px",
            borderBottom: "1px solid #f0f0f0",
            flexShrink: 0,
          }}
        >
          <h6 style={{ fontWeight: 700, margin: 0, fontSize: 16 }}>
            {mode === "profile"
              ? "Thêm / Sửa địa chỉ"
              : "Chọn địa chỉ nhận hàng"}
          </h6>
          <button
            onClick={onClose}
            style={{
              border: "none",
              background: "none",
              fontSize: 20,
              cursor: "pointer",
              color: "#888",
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* Profile mode — thông tin người nhận */}
        {mode === "profile" && (
          <div
            style={{
              padding: "16px 24px",
              borderBottom: "1px solid #f0f0f0",
              flexShrink: 0,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {/* Giới tính */}
            <div>
              <label
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  marginBottom: 8,
                  display: "block",
                }}
              >
                Giới tính
              </label>

              <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
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
                      checked={receiverGender === g}
                      onChange={(e) =>
                        setReceiverGender(
                          e.target.value as "male" | "female" | "other",
                        )
                      }
                    />
                    {g === "male" ? "Nam" : g === "female" ? "Nữ" : "Khác"}
                  </label>
                ))}
              </div>
            </div>
            {/* Tên người nhận + SĐT */}
            <div className="row g-3">
              <div className="col-sm-6">
                <label
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    marginBottom: 6,
                    display: "block",
                  }}
                >
                  Người nhận *
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Họ và tên"
                  value={receiverName}
                  onChange={(e) => setReceiverName(e.target.value)}
                  style={{ borderRadius: 8, fontSize: 14 }}
                />
              </div>

              <div className="col-sm-6">
                <label
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    marginBottom: 6,
                    display: "block",
                  }}
                >
                  Số điện thoại *
                </label>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    border: "1px solid #dee2e6",
                    borderRadius: 8,
                    overflow: "hidden",
                  }}
                >
                  <span
                    style={{
                      padding: "8px 10px",
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
                    placeholder="912345678"
                    value={receiverPhone}
                    onChange={(e) =>
                      setReceiverPhone(e.target.value.replace(/\D/g, ""))
                    }
                    style={{ borderRadius: 0, fontSize: 14 }}
                  />
                </div>
              </div>
            </div>

            {/* Preview validation */}
            {(!receiverName.trim() || !receiverPhone.trim()) && (
              <p style={{ fontSize: 12, color: "#e59335", margin: 0 }}>
                ⚠️ Vui lòng điền đầy đủ tên người nhận và số điện thoại
              </p>
            )}
          </div>
        )}
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "18px 24px",
            borderBottom: "1px solid #f0f0f0",
            flexShrink: 0,
          }}
        >
          <h6 style={{ fontWeight: 700, margin: 0, fontSize: 16 }}>
            Chọn địa chỉ nhận hàng
          </h6>
          <button
            onClick={onClose}
            style={{
              border: "none",
              background: "none",
              fontSize: 20,
              cursor: "pointer",
              color: "#888",
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* Step tabs */}
        <div
          style={{
            display: "flex",
            borderBottom: "1px solid #f0f0f0",
            flexShrink: 0,
          }}
        >
          {(
            [
              { key: "province", label: "Tỉnh / Thành phố" },
              { key: "ward", label: "Quận / Huyện / Xã" },
              { key: "detail", label: "Địa chỉ chi tiết" },
            ] as const
          ).map((s, idx) => {
            const isActive = step === s.key;
            const isDone =
              (s.key === "province" && selectedProvince) ||
              (s.key === "ward" && selectedWard);

            return (
              <button
                key={s.key}
                onClick={() => {
                  if (s.key === "ward" && !selectedProvince) return;
                  if (s.key === "detail" && !selectedWard) return;
                  setStep(s.key);
                }}
                style={{
                  flex: 1,
                  padding: "12px 8px",
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: isActive ? 700 : 400,
                  color: isActive ? "#007bff" : isDone ? "#27ae60" : "#aaa",
                  borderBottom: isActive
                    ? "2px solid #007bff"
                    : "2px solid transparent",
                  transition: "all 0.15s",
                }}
              >
                {isDone && !isActive ? "✓ " : `${idx + 1}. `}
                {s.label}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
          {/* STEP 1: Tỉnh */}
          {step === "province" && (
            <>
              <input
                type="text"
                className="form-control mb-3"
                placeholder="🔍 Tìm tỉnh / thành phố..."
                value={searchProvince}
                onChange={(e) => setSearchProvince(e.target.value)}
                autoFocus
                style={{ borderRadius: 8, fontSize: 14 }}
              />
              {loadingProvinces ? (
                <div
                  style={{ textAlign: "center", padding: 24, color: "#aaa" }}
                >
                  Đang tải...
                </div>
              ) : (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 4 }}
                >
                  {filteredProvinces.map((p) => (
                    <div
                      key={p.code}
                      onClick={() => {
                        setSelectedProvince(p);
                        setSelectedWard(null);
                        setSearchWard("");
                        setStep("ward");
                      }}
                      style={{
                        padding: "10px 14px",
                        borderRadius: 8,
                        cursor: "pointer",
                        fontSize: 14,
                        background:
                          selectedProvince?.code === p.code
                            ? "#e8f0fe"
                            : "transparent",
                        color:
                          selectedProvince?.code === p.code
                            ? "#007bff"
                            : "#333",
                        fontWeight:
                          selectedProvince?.code === p.code ? 600 : 400,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                      onMouseEnter={(e) => {
                        if (selectedProvince?.code !== p.code)
                          (e.currentTarget as HTMLDivElement).style.background =
                            "#f8f9fa";
                      }}
                      onMouseLeave={(e) => {
                        if (selectedProvince?.code !== p.code)
                          (e.currentTarget as HTMLDivElement).style.background =
                            "transparent";
                      }}
                    >
                      {p.name}
                      {selectedProvince?.code === p.code && (
                        <span style={{ color: "#007bff" }}>✓</span>
                      )}
                    </div>
                  ))}
                  {filteredProvinces.length === 0 && (
                    <p
                      style={{
                        color: "#aaa",
                        textAlign: "center",
                        padding: 16,
                      }}
                    >
                      Không tìm thấy kết quả
                    </p>
                  )}
                </div>
              )}
            </>
          )}

          {/* STEP 2: Quận/Huyện/Xã */}
          {step === "ward" && (
            <>
              {selectedProvince && (
                <div
                  style={{
                    padding: "8px 12px",
                    borderRadius: 8,
                    background: "#f0f6ff",
                    marginBottom: 12,
                    fontSize: 13,
                    color: "#007bff",
                    fontWeight: 600,
                  }}
                >
                  📍 {selectedProvince.name}
                </div>
              )}
              <input
                type="text"
                className="form-control mb-3"
                placeholder="🔍 Tìm quận / huyện / xã..."
                value={searchWard}
                onChange={(e) => setSearchWard(e.target.value)}
                autoFocus
                style={{ borderRadius: 8, fontSize: 14 }}
              />
              {loadingWards ? (
                <div
                  style={{ textAlign: "center", padding: 24, color: "#aaa" }}
                >
                  Đang tải...
                </div>
              ) : (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 4 }}
                >
                  {filteredWards.map((w) => (
                    <div
                      key={w.code}
                      onClick={() => {
                        setSelectedWard(w);
                        setStep("detail");
                        setTimeout(() => detailRef.current?.focus(), 100);
                      }}
                      style={{
                        padding: "10px 14px",
                        borderRadius: 8,
                        cursor: "pointer",
                        fontSize: 14,
                        background:
                          selectedWard?.code === w.code
                            ? "#e8f0fe"
                            : "transparent",
                        color:
                          selectedWard?.code === w.code ? "#007bff" : "#333",
                        fontWeight: selectedWard?.code === w.code ? 600 : 400,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                      onMouseEnter={(e) => {
                        if (selectedWard?.code !== w.code)
                          (e.currentTarget as HTMLDivElement).style.background =
                            "#f8f9fa";
                      }}
                      onMouseLeave={(e) => {
                        if (selectedWard?.code !== w.code)
                          (e.currentTarget as HTMLDivElement).style.background =
                            "transparent";
                      }}
                    >
                      {w.name}
                      {selectedWard?.code === w.code && (
                        <span style={{ color: "#007bff" }}>✓</span>
                      )}
                    </div>
                  ))}
                  {filteredWards.length === 0 && !loadingWards && (
                    <p
                      style={{
                        color: "#aaa",
                        textAlign: "center",
                        padding: 16,
                      }}
                    >
                      Không tìm thấy kết quả
                    </p>
                  )}
                </div>
              )}
            </>
          )}

          {/* STEP 3: Địa chỉ cụ thể */}
          {step === "detail" && (
            <>
              {selectedProvince && selectedWard && (
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: 8,
                    background: "#f0f6ff",
                    marginBottom: 16,
                    fontSize: 13,
                    color: "#555",
                    lineHeight: 1.6,
                  }}
                >
                  <span style={{ color: "#007bff", fontWeight: 600 }}>
                    {selectedWard.name}, {selectedProvince.name}
                  </span>
                </div>
              )}
              <label
                style={{
                  fontSize: 13,
                  color: "#888",
                  marginBottom: 6,
                  display: "block",
                }}
              >
                Số nhà, tên đường, tòa nhà...
              </label>
              <input
                ref={detailRef}
                type="text"
                className="form-control"
                placeholder="VD: 123 Nguyễn Huệ, Phường Bến Nghé"
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                style={{ borderRadius: 8, fontSize: 14 }}
              />
            </>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid #f0f0f0",
            display: "flex",
            gap: 12,
            flexShrink: 0,
          }}
        >
          <button
            onClick={onClose}
            className="btn btn-outline-secondary"
            style={{ flex: 1, borderRadius: 8 }}
          >
            Hủy
          </button>
          <button
            onClick={handleConfirm}
            className="btn btn-primary"
            disabled={!canConfirm}
            style={{ flex: 1, borderRadius: 8, fontWeight: 600 }}
          >
            Xác nhận
          </button>
        </div>
      </div>
    </>
  );
}
