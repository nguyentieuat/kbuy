// api/otp.api.ts

export async function check({
  phone,
  paymentMethod,
  grandTotal,
}: {
  phone: string;
  paymentMethod: string;
  grandTotal: number;
}) {
  const res = await fetch("/api/otp/check", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      phone,
      paymentMethod,
      grandTotal,
    }),
  });

  const json = await res.json();

  return json.data;
}
