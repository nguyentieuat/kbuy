// App.tsx

import { Routes, Route } from "react-router-dom";
import AppLayout from "./layouts/AppLayout";
import Home from "./pages/Home";
import CategoryPage from "./pages/CategoryPage";
import ProductDetail from "./pages/ProductDetail";
import CartPage from "./pages/CartPage";
import ScrollToTopButton from "./components/common/ScrollToTopButton";
import ScrollToTop from "./components/ScrollToTop";
import CheckoutPage from "./pages/CheckoutPage";
import OrderDetail from "./pages/OrderDetail";
import LoginPage from "./pages/LoginPage";
import ProfilePage from "./pages/ProfilePage";
import ImportRequestPage from "./pages/ImportRequestPage";
import AdminOrderPage from "./components/admin/AdminOrderPage";
import TermsPage from "./pages/TermsPage";


export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/products/:slug" element={<ProductDetail />} />
          <Route path="/products" element={<CategoryPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/input-link" element={<ImportRequestPage />} />
          <Route path="/terms" element={<TermsPage />} />
        </Route>

        <Route >
          <Route path="/login" element={<LoginPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/order/:orderCode" element={<OrderDetail />} />

          <Route path="/admin" element={<AdminOrderPage />} />
        </Route>
      </Routes>
      <ScrollToTopButton />
    </>
  );
}
