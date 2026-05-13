// components/profile/AddressSection.tsx
import { useState } from "react";
import { useAddresses } from "../../hooks/useAddress";
import AddressModal from "../../components/AddressModal";
import { useToast } from "../../hooks/useToast";

export default function AddressSection({
  authHeaders,
}: {
  authHeaders: Record<string, string>;
}) {
  const {
    addresses,
    loading,
    setDefault,
    remove,
    createOrUpdate,
  } = useAddresses(authHeaders);

  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);

  const { show: showToast } = useToast();

 const handleSave = async (result: any) => {
  const body = {
    receiver_name: result.receiver_name,
    receiver_phone: result.receiver_phone,
    province: result.province.name,
    ward: result.ward.name,
    province_code: result.province.code,
    ward_code: result.ward.code,
    detail: result.detail,
    full_address: [
      result.detail,
      result.ward.name,
      result.province.name,
    ]
      .filter(Boolean)
      .join(", "),
  };

  await createOrUpdate(editTarget?.id ?? null, body);

  setShowModal(false);
  setEditTarget(null);
  showToast(editTarget ? "Đã cập nhật" : "Đã thêm", "success");
};

  if (loading)
    return (
      <div style={{ textAlign: "center", padding: 32 }}>
        <div className="spinner-border spinner-border-sm text-primary" />
      </div>
    );

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 12,
        padding: 24,
        border: "1px solid #eee",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <h6 style={{ fontWeight: 700, margin: 0 }}>Địa chỉ giao hàng</h6>
        <button
          onClick={() => {
            setEditTarget(null);
            setShowModal(true);
          }}
          className="btn btn-primary btn-sm"
          style={{ borderRadius: 8, fontWeight: 600 }}
        >
          + Thêm địa chỉ
        </button>
      </div>

      {addresses.length === 0 ? (
        <div style={{ textAlign: "center", padding: "24px 0", color: "#aaa" }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>📍</div>
          <p style={{ fontSize: 13 }}>Chưa có địa chỉ nào</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {addresses.map((addr) => (
            <div
              key={addr.id}
              style={{
                padding: "14px 16px",
                borderRadius: 10,
                border: addr.is_default
                  ? "2px solid #007bff"
                  : "1px solid #eee",
                background: addr.is_default ? "#f0f6ff" : "#fff",
                position: "relative",
              }}
            >
              {/* Badge mặc định */}
              {addr.is_default && (
                <span
                  style={{
                    position: "absolute",
                    top: -1,
                    right: 12,
                    background: "#007bff",
                    color: "#fff",
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: "0 0 6px 6px",
                  }}
                >
                  MẶC ĐỊNH
                </span>
              )}

              <p style={{ fontWeight: 600, fontSize: 14, margin: 0 }}>
                {addr.receiver_name}
                <span
                  style={{
                    color: "#888",
                    fontWeight: 400,
                    marginLeft: 8,
                    fontSize: 13,
                  }}
                >
                  +84 {addr.receiver_phone}
                </span>
              </p>
              <p style={{ fontSize: 13, color: "#555", margin: "4px 0 0" }}>
                {addr.full_address}
              </p>

              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                {!addr.is_default && (
                  <button
                    onClick={() => setDefault(addr.id)}
                    style={{
                      border: "1px solid #007bff",
                      background: "none",
                      color: "#007bff",
                      fontSize: 12,
                      borderRadius: 6,
                      padding: "3px 10px",
                      cursor: "pointer",
                    }}
                  >
                    Đặt mặc định
                  </button>
                )}
                <button
                  onClick={() => {
                    setEditTarget(addr);
                    setShowModal(true);
                  }}
                  style={{
                    border: "1px solid #ddd",
                    background: "none",
                    color: "#555",
                    fontSize: 12,
                    borderRadius: 6,
                    padding: "3px 10px",
                    cursor: "pointer",
                  }}
                >
                  Sửa
                </button>
                {!addr.is_default && (
                  <button
                    onClick={() => remove(addr.id)}
                    style={{
                      border: "1px solid #ffcdd2",
                      background: "none",
                      color: "#e53935",
                      fontSize: 12,
                      borderRadius: 6,
                      padding: "3px 10px",
                      cursor: "pointer",
                    }}
                  >
                    Xóa
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <AddressModal
          mode="profile"
          initialData={{
            province: editTarget
              ? { name: editTarget.province, code: 0 }
              : null,

            ward: editTarget ? { name: editTarget.ward, code: 0 } : null,

            detail: editTarget?.detail ?? "",

            receiver_gender: editTarget?.receiver_gender ?? "male",

            receiver_name: editTarget?.receiver_name ?? "",

            receiver_phone: editTarget?.receiver_phone ?? "",
          }}
          onClose={() => {
            setShowModal(false);
            setEditTarget(null);
          }}
          onConfirm={handleSave}
        />
      )}
    </div>
  );
}
