// pages/CategoryPage.tsx

import { useSearchParams } from "react-router-dom";

import CategoryProduct from "../components/containers/CategoryProduct";
import ProductsLanding from "../components/containers/ProductsLanding";

export default function CategoryPage() {
  const [params] = useSearchParams();

  const category = params.get("category");
  const source = params.get("source");

  const isListingPage = !!category || !!source;

  if (!isListingPage) {
    return <ProductsLanding />;
  }

  return <CategoryProduct />;
}
