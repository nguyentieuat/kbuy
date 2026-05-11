// components/CategorySidebar.tsx

import { useState } from "react";
import type { Category } from "../types/category";

type Props = {
  categories: Category[];
  onSelect?: (slug: string) => void;
};

export default function CategorySidebar({ categories, onSelect }: Props) {
  const [openSlugs, setOpenSlugs] = useState<string[]>([]);

  const toggle = (slug: string) => {
    setOpenSlugs((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    );
  };

  const render = (items: Category[], level = 0) => {
    return items.map((cat) => {
      const isOpen = openSlugs.includes(cat.slug);

      const hasChildren =
        Array.isArray(cat.children) && cat.children.length > 0;

      return (
        <div key={cat.slug}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              paddingLeft: level * 12,
              cursor: "pointer",
              fontWeight: level === 0 ? 600 : 400,
            }}
            onClick={() => {
              if (hasChildren) {
                toggle(cat.slug);
              } else {
                onSelect?.(cat.slug);
              }
            }}
          >
            <span>
              {hasChildren ? (isOpen ? "▼ " : "▶ ") : ""} {cat.name}
            </span>

            <span>{Number(cat.product_count)}</span>
          </div>

          {isOpen && hasChildren && (
            <div>{render(cat.children!, level + 1)}</div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="col-md-3">
      <ul className="list-unstyled categories">{render(categories)}</ul>
    </div>
  );
}
