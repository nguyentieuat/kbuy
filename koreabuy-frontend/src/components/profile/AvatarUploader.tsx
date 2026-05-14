// components/profile/AvatarUploader.tsx
import { useState, useRef } from "react";
import { useToast } from "../../hooks/useToast";

type Props = {
  currentAvatar: string | null;
  authHeaders: Record<string, string>;
  onUploaded: () => void;
};

export default function AvatarUploader({
  currentAvatar,
  authHeaders,
  onUploaded,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const { show: showToast } = useToast();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);

    // Upload
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: {
          Authorization: authHeaders.Authorization,
        },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onUploaded();
      showToast("Đã cập nhật ảnh đại diện", "success");
    } catch (err: any) {
      showToast(err.message, "error");
      setPreview(null);
    } finally {
      setUploading(false);
    }
  };

  const displayAvatar = preview ?? currentAvatar;

  return (
    <div style={{ position: "relative", width: 64, height: 64 }}>
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          overflow: "hidden",
          background: "#f0f6ff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 28,
          border: "2px solid #007bff",
        }}
      >
        {displayAvatar ? (
          <img
            src={`${displayAvatar}`}
            alt="avatar"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          "👤"
        )}
      </div>

      {/* Edit button */}
      <button
        onClick={() => {
          fileRef.current?.click();
        }}
        disabled={uploading}
        style={{
          position: "absolute",
          bottom: -2,
          right: -2,
          width: 22,
          height: 22,
          borderRadius: "50%",
          background: "#007bff",
          border: "2px solid #fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          fontSize: 10,
          color: "#fff",
        }}
        title="Đổi ảnh"
      >
        {uploading ? "⏳" : "✏️"}
      </button>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        style={{ display: "none" }}
      />
    </div>
  );
}
