// components/checkout/SectionCard.tsx

import type { ReactNode } from "react";

type Props = {
  title?: string;
  children: ReactNode;
};

export default function SectionCard({ title, children }: Props) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 12,
        padding: 24,
        marginBottom: 16,
        border: "1px solid #eee",
      }}
    >
      {title && (
        <h6 style={{ fontWeight: 700, marginBottom: 20, fontSize: 15 }}>
          {title}
        </h6>
      )}
      {children}
    </div>
  );
}
