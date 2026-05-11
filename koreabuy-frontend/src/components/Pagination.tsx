// components/Pagination.tsx

type Props = {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
};

export default function Pagination({ page, totalPages, onChange }: Props) {
  if (!totalPages || totalPages <= 1) return null;

  const maxVisible = 5;
  let start = Math.max(1, page - Math.floor(maxVisible / 2));
  let end = start + maxVisible - 1;

  if (end > totalPages) {
    end = totalPages;
    start = Math.max(1, end - maxVisible + 1);
  }

  const pages = [];
  for (let p = start; p <= end; p++) {
    pages.push(p);
  }

  const isFirst = page === 1;
  const isLast = page === totalPages;

  return (
    <div className="row mt-5 pb-5">
      <div className="col-lg-12">
        <div className="custom-pagination" style={{ textAlign: "center" }}>
          <ul className="list-unstyled">
            {/* Prev */}
            <li>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (page > 1) onChange(page - 1);
                }}
                style={{
                  pointerEvents: isFirst ? "none" : "auto",
                  opacity: isFirst ? 0.5 : 1,
                  cursor: isFirst ? "not-allowed" : "pointer",
                }}
              >
                <svg
                  width="1em"
                  height="1em"
                  viewBox="0 0 16 16"
                  className="bi bi-arrow-left"
                  fill="currentColor"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.854 4.646a.5.5 0 0 1 0 .708L3.207 8l2.647 2.646a.5.5 0 0 1-.708.708l-3-3a.5.5 0 0 1 0-.708l3-3a.5.5 0 0 1 .708 0z"
                  />
                  <path
                    fillRule="evenodd"
                    d="M2.5 8a.5.5 0 0 1 .5-.5h10.5a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z"
                  />
                </svg>
              </a>
            </li>
            {/* Pages */}
            {pages.map((p) => (
              <li key={p} className={p === page ? "active" : ""}>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (p !== page) onChange(p);
                  }}
                  style={{
                    pointerEvents: p === page ? "none" : "auto",
                    cursor: p === page ? "default" : "pointer",
                  }}
                >
                  {p}
                </a>
              </li>
            ))}
            {/* Next */}
            <li>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (page < totalPages) onChange(page + 1);
                }}
                style={{
                  pointerEvents: isLast ? "none" : "auto",
                  opacity: isLast ? 0.5 : 1,
                  cursor: isLast ? "not-allowed" : "pointer",
                }}
              >
                <svg
                  width="1em"
                  height="1em"
                  viewBox="0 0 16 16"
                  className="bi bi-arrow-right"
                  fill="currentColor"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    d="M10.146 4.646a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708-.708L12.793 8l-2.647-2.646a.5.5 0 0 1 0-.708z"
                  />
                  <path
                    fillRule="evenodd"
                    d="M2 8a.5.5 0 0 1 .5-.5H13a.5.5 0 0 1 0 1H2.5A.5.5 0 0 1 2 8z"
                  />
                </svg>
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
