// MenuHeader.tsc

import { useState, useEffect } from "react";
import { NavLink, useSearchParams } from "react-router-dom";
import type { Category } from "../types/category";
import { SOURCES } from "../constains/sourceConstain";

type Props = {
  isMobile?: boolean;
  categories: Category[];
};

const SOURCE_NODE: Category = {
  id: -999,
  name: "Nguồn",
  slug: "source",
  full_slug: "source",
  children: [],
  is_source_group: true,
  to: "",
};

SOURCE_NODE.children = SOURCES.map((s, idx) => ({
  id: -1000 - idx,
  name: s.label,
  slug: s.value,
  full_slug: `source/${s.value}`,
  is_source_group: true,
  to: "",
}));

export default function MenuHeader({ isMobile, categories }: Props) {
  const [openIds, setOpenIds] = useState<number[]>([]);
  const toggleOpen = (id: number) => {
    setOpenIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const [params] = useSearchParams();

  const isInPath = (node: Category, target: string | null): boolean => {
    if (!target) return false;
    if (node.slug === target) return true;

    return node.children?.some((child) => isInPath(child, target)) ?? false;
  };

  const selectedCategory = params.get("category") || params.get("source");

  useEffect(() => {
    if (!selectedCategory) return;

    const findPath = (
      nodes: Category[],
      path: number[] = [],
    ): number[] | null => {
      for (const node of nodes) {
        if (node.slug === selectedCategory) return [...path, node.id];

        if (node.children) {
          const found = findPath(node.children, [...path, node.id]);
          if (found) return found;
        }
      }
      return null;
    };

    const path = findPath(categories);
    if (path) setOpenIds(path);
  }, [selectedCategory, categories]);

  const getTo = (item: Category) => {
    if (item.is_source_group) {
      return `/products?source=${item.slug}`;
    }
    return `/products?category=${item.slug}`;
  };

  const renderMenu = (data: Category[], level = 0) => {
    if (!data) return null;

    return data.map((item) => {
      const isActive = isInPath(item, selectedCategory);
      const isOpen = isMobile ? openIds.includes(item.id) : true;

      return (
        <li
          key={item.id}
          className={`${item.children?.length ? "has-children" : ""} ${
            isActive ? "active" : ""
          }`}
        >
          {/* Desktop: */}
          {!isMobile && (
            <NavLink
              to={getTo(item)}
              className={() => ""}
            >
              {item.name}
            </NavLink>
          )}

          {/* Mobile */}
          {isMobile && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                paddingLeft: `${level * 14}px`,
              }}
            >
              <NavLink
              to={getTo(item)}
              className={() => ""}
            >
              {item.name}
            </NavLink>

              {(item.children?.length ?? 0) > 0 && (
                <span
                  style={{ cursor: "pointer", padding: "0 10px" }}
                  onClick={() => toggleOpen(item.id)}
                >
                  <span
                    className={`arrow-collapse ${isOpen ? "" : "collapsed"}`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleOpen(item.id);
                    }}
                  />
                </span>
              )}
            </div>
          )}
          {(item.children?.length ?? 0) > 0 && (
            <ul className={`dropdown ${isOpen ? "show" : "collapse"}`}>
              {renderMenu(item.children!, level + 1)}
            </ul>
          )}
        </li>
      );
    });
  };
  const mergedCategories = [...categories, SOURCE_NODE];
  return (
    <ul className={isMobile ? "site-nav-wrap" : "site-menu"}>
      <li>
        <NavLink to="/" end>
          Trang chủ
        </NavLink>
      </li>

      {renderMenu(mergedCategories)}
    </ul>
  );
}
