// components/SearchModal.tsx

import { useEffect } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function SearchModal({ open, onClose }: Props) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleEsc);

    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  useEffect(() => {
    if (open) {
      document.body.classList.add("search-open");
    } else {
      document.body.classList.remove("search-open");
    }

    return () => document.body.classList.remove("search-open");
  }, [open]);

  return (
    <>
      <div className={`search-form ${open ? "show" : ""}`} id="search-form">
        <form action="">
          <input
            type="search"
            className="form-control"
            placeholder="Enter keyword to search..."
          />
          <button className="button">
            <svg
              width="1em"
              height="1em"
              viewBox="0 0 16 16"
              className="bi bi-search"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                d="M10.442 10.442a1 1 0 0 1 1.415 0l3.85 3.85a1 1 0 0 1-1.414 1.415l-3.85-3.85a1 1 0 0 1 0-1.415z"
              />
              <path
                fillRule="evenodd"
                d="M6.5 12a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11zM13 6.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0z"
              />
            </svg>
          </button>
          <button className="button" onClick={onClose}>
            <div className="close-search">
              <span className="icofont-close js-close-search"></span>
            </div>
          </button>
        </form>
      </div>
    </>
  );
}
