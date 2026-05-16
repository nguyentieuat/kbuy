// // api/cart.api.ts

const API_URL = "/api/cart";

function getAuthHeaders() {
  const token = localStorage.getItem("token");

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function fetchCart() {
  const res = await fetch(API_URL, {
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    throw new Error("Failed to fetch cart");
  }

  return res.json();
}

export async function addCartItem(data: {
  productId: number;
  variantId?: number | null;
  quantity: number;
}) {
  const res = await fetch(`${API_URL}/items`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    throw new Error("Failed to add item");
  }

  return res.json();
}

export async function updateCartItem(
  itemId: string,
  quantity: number,
) {
  const res = await fetch(`${API_URL}/items/${itemId}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      quantity,
    }),
  });

  if (!res.ok) {
    throw new Error("Failed to update item");
  }

  return res.json();
}

export async function deleteCartItem(itemId: string) {
  const res = await fetch(`${API_URL}/items/${itemId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    throw new Error("Failed to delete item");
  }

  return res.json();
}
