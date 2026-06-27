// pages/CategoryPage.tsx

import { useSearchParams } from "react-router-dom";

import CategoryProduct from "../components/containers/CategoryProduct";
import ProductsLanding from "../components/containers/ProductsLanding";

export default function CategoryPage() {
  const [params] = useSearchParams();

  const category = params.get("category");
  const source = params.get("source");
  const search = params.get("search"); 

  const isListingPage = !!category || !!source || !!search; 

  if (!isListingPage) {
    return <ProductsLanding />;
  }

  return <CategoryProduct />;
}
