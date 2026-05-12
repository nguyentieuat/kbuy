// components/Header.tsx

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import MenuHeader from "./MenuHeader";
import CartIcon from "./CartIcon";
import { useCategories } from "../hooks/useCategories";
import { useAuth } from "../contexts/AuthContext";

export default function Header() {
  const [openMenu, setOpenMenu] = useState(false);
  const { categories } = useCategories();
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState("");

  const { user } = useAuth();

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchValue.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchValue.trim())}`);
    }
  };

  useEffect(() => {
    if (openMenu) {
      document.body.classList.add("offcanvas-menu");
    } else {
      document.body.classList.remove("offcanvas-menu");
    }
    return () => {
      document.body.classList.remove("offcanvas-menu");
    };
  }, [openMenu]);

  return (
    <>
      {/* SITE MOBILE */}
      <div className="site-mobile-menu">
        <div className="site-mobile-menu-header">
          <div className="site-mobile-menu-close">
            <span
              className="icofont-close"
              onClick={() => setOpenMenu(false)}
            ></span>
          </div>
        </div>
        <div className="site-mobile-menu-body">
          <MenuHeader isMobile categories={categories} />
        </div>
      </div>

      <nav className="site-nav mb-5">
        <div
          className="sticky-nav js-sticky-header"
          style={{ padding: "10px" }}
        >
          <a href="index.html" className="logo menu-absolute m-0">
            UntreeStore<span className="text-primary">.</span>
          </a>
          <div className="container position-relative">
            <div className="site-navigation dark">
              {/* DESKTOP */}
              <div className="d-none d-lg-block">
                <MenuHeader categories={categories} />
              </div>

              <div className="menu-icons d-flex align-items-center gap-2">
                {/* Search input*/}
                <div className="search-inline">
                  <svg
                    width="1em"
                    height="1em"
                    viewBox="0 0 16 16"
                    className="bi bi-search search-icon-inline"
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
                  <input
                    type="search"
                    className="search-input-inline"
                    placeholder="Tìm sản phẩm..."
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    onKeyDown={handleSearch}
                  />
                </div>

                <CartIcon />

                <a
                  href="#"
                  className="user-profile"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(user ? "/profile" : "/login");
                  }}
                  title={user ? user.username : "Đăng nhập"}
                  style={{ position: "relative" }}
                >
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.username}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        objectFit: "cover",
                        border: "2px solid #007bff",
                      }}
                    />
                  ) : (
                    <svg
                      width="1em"
                      height="1em"
                      viewBox="0 0 16 16"
                      className="bi bi-person"
                      fill="currentColor"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fillRule="evenodd"
                        d="M13 14s1 0 1-1-1-4-6-4-6 3-6 4 1 1 1 1h10zm-9.995-.944v-.002.002zM3.022 13h9.956a.274.274 0 0 0 .014-.002l.008-.002c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664a1.05 1.05 0 0 0 .022.004zm9.974.056v-.002.002zM8 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm3-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"
                      />
                    </svg>
                  )}
                  {user && (
                    <span
                      style={{
                        position: "absolute",
                        top: -4,
                        right: -4,
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: "#27ae60",
                        border: "1px solid #fff",
                      }}
                    />
                  )}
                </a>
              </div>

              <a
                href="#"
                className="burger site-menu-toggle js-menu-toggle d-inline-block d-lg-none"
                style={{ marginLeft: "auto" }}
                data-toggle="collapse"
                data-target="#main-navbar"
                onClick={(e) => {
                  e.preventDefault();
                  setOpenMenu(true);
                }}
              >
                <span></span>
              </a>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}
