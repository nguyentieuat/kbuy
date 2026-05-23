// containers/CategoryProduct.tsx

import { useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import ProductsGrid from "../product/ProductsGrid";
import ProductsCarousel from "../product/ProductsCarousel";
import { useProducts, useRecommendedProducts } from "../../hooks/useProducts";
import Pagination from "../Pagination";
import { useCategoriesWithCount } from "../../hooks/useCategories";
import { SOURCES } from "../../constains/sourceConstain";

export default function CategoryProduct() {
  const [params, setParams] = useSearchParams();
  const productsRef = useRef<HTMLDivElement>(null);

  const category = params.get("category") || undefined;
  const source = params.get("source") || undefined;
  const page = Number(params.get("page") || 1);
  const sort = params.get("sort") || "newest";
  const search = params.get("search") || undefined;

  useEffect(() => {
    productsRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [page]);

  const { categories } = useCategoriesWithCount();

  const {
    products: productsGrid,
    pagination,
    loading,
    error,
  } = useProducts({
    search,
    category,
    source,
    page,
    limit: 12,
    sort,
  });

  const currentIds = productsGrid.map((p) => p.id);

  const { products: recommendedProducts } = useRecommendedProducts({
    category,
    source,
    excludeIds: currentIds,
    limit: 12,
  });

  // Loading skeleton
  if (loading) {
    return (
      <div className="untree_co-section">
        <div className="container">
          <div className="row">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="col-6 col-md-6 mb-4 col-lg-4">
                <div
                  style={{
                    height: 320,
                    background: "#f0f0f0",
                    borderRadius: 8,
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) return null; // fail silently on homepage

  // Lấy category đang được chọn từ danh sách categories
  const flattenCategories = (cats: typeof categories): typeof categories => {
    return cats.flatMap((cat) => [
      cat,
      ...(cat.children ? flattenCategories(cat.children) : []),
    ]);
  };

  const flatCategories = flattenCategories(categories);

  // Build breadcrumb trail đầy đủ từ selected lên đến root
  const getSourceLabel = (value?: string) => {
    return SOURCES.find((s) => s.value === value)?.label ?? value;
  };
  const buildBreadcrumb = (slug: string | undefined) => {
    if (!slug) return [];

    // source mode
    if (source) {
      return [
        {
          id: -1,
          name: getSourceLabel(source),
          slug: source,
        },
      ];
    }

    // category mode
    const trail: typeof categories = [];

    let current = flatCategories.find((cat) => cat.slug === slug);

    while (current) {
      trail.unshift(current);

      current = current.parent_id
        ? flatCategories.find(
            (cat) => String(cat.id) === String(current!.parent_id),
          )
        : undefined;
    }

    return trail;
  };

  const breadcrumb = buildBreadcrumb(category || source);

  return (
    <div className="untree_co-section pt-3">
      <div
        ref={productsRef}
        className="container"
        style={{ paddingTop: "100px" }}
      >
        <div className="row align-items-center mb-5">
          <div className="col-lg-9">
            {/* Thay đổi tiêu đề theo context */}
            {search ? (
              <h2 className="mb-3 mb-lg-0">
                Kết quả cho: <em>"{search}"</em>
                <span className="text-muted fs-6 ms-2">
                  ({pagination?.total ?? 0} sản phẩm)
                </span>
              </h2>
            ) : (
              <h2 className="mb-3 mb-lg-0">
                {breadcrumb.length > 0 ? (
                  <>
                    {breadcrumb.map((cat, index) => {
                      const isLast = index === breadcrumb.length - 1;
                      return (
                        <span key={cat.id}>
                          {isLast ? (
                            <span>{cat.name}</span>
                          ) : (
                            <span
                              className="text-muted"
                              style={{ cursor: "pointer" }}
                              onClick={() =>
                                setParams({
                                  category: cat.slug,
                                  page: "1",
                                  sort,
                                })
                              }
                            >
                              {cat.name}
                            </span>
                          )}
                          {!isLast && (
                            <span
                              className="mx-2"
                              style={{ fontSize: "0.85em" }}
                            >
                              ›
                            </span>
                          )}
                        </span>
                      );
                    })}
                  </>
                ) : (
                  "Products"
                )}
              </h2>
            )}
          </div>
          <div className="col-lg-3">
            <div className="d-flex sort align-items-center justify-content-lg-end">
              <strong className="mr-2">Sắp xếp:</strong>
              <form action="#">
                <select
                  value={sort}
                  onChange={(e) => {
                    setParams({
                      ...(search && { search }),
                      ...(category && { category }),
                      ...(source && { source }),
                      page: "1",
                      sort: e.target.value,
                    });
                    productsRef.current?.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    });
                  }}
                >
                  <option value="newest">Mới nhất</option>
                  <option value="price_asc">Giá: Thấp → Cao</option>
                  <option value="price_desc">Giá: Cao → Thấp</option>
                  <option value="rating_desc">Đánh giá cao</option>
                  <option value="featured">Nổi bật</option>
                </select>
              </form>
            </div>
          </div>
        </div>

        <div className="row">
          {/* <div className="col-md-9"> */}
          <div className="untree_co-section" style={{ padding: "0px" }}>
            <div className="container">
              {/* Không có kết quả */}
              {!loading && productsGrid.length === 0 ? (
                <div className="text-center py-5">
                  <p className="text-muted">
                    Không tìm thấy sản phẩm {search ? `cho "${search}"` : ""}.
                  </p>
                </div>
              ) : (
                <ProductsGrid products={productsGrid} />
              )}
            </div>
          </div>

          <Pagination
            page={page}
            totalPages={pagination?.totalPages || 0}
            onChange={(newPage) => {
              setParams({
                ...(search && { search }),
                ...(category && { category }),
                ...(source && { source }),
                page: String(newPage),
                sort,
              });
            }}
          />
        </div>
      </div>
      {/* </div> */}

      <ProductsCarousel products={recommendedProducts} />
    </div>
  );
}
