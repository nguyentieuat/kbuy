import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { BrowserRouter } from "react-router-dom";

// CSS
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./assets/css/animate.min.css";
import "./assets/css/owl.carousel.min.css";
import "./assets/css/owl.theme.default.min.css";
import "./assets/css/jquery.fancybox.min.css";
import "./assets/css/aos.css";
import "./assets/css/style.css";
import "./assets/css/custom.css";

import "./assets/fonts/icomoon/style.css";
import "./assets/fonts/flaticon/font/flaticon.css";

import { CartProvider } from "./contexts/CartContext";

createRoot(document.getElementById("root")!).render(
  <CartProvider>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </CartProvider>,
);
