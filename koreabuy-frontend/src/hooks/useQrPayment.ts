// hooks/useQrPayment.ts

import { useEffect, useState } from "react";

export type QrStatus = "loading" | "ready" | "checking" | "success" | "expired";

export type BankInfo = {
  bankId: string;
  accountNo: string;
  accountName: string;
  amount: number;
  description: string;
};

type Params = {
  orderId: string | number;

  initialTxnRef: string;
  initialQrUrl: string;
  initialBankInfo: BankInfo;

  onPaid?: () => void;
};

export function useQrPayment({
  orderId,
  initialTxnRef,
  initialQrUrl,
  initialBankInfo,
  onPaid,
}: Params) {
  const [status, setStatus] = useState<QrStatus>("ready");

  const [qrUrl, setQrUrl] = useState(initialQrUrl);

  const [txnRef, setTxnRef] = useState(initialTxnRef);

  const [bankInfo, setBankInfo] = useState(initialBankInfo);

  const [countdown, setCountdown] = useState(15 * 60);

  const [pollCount, setPollCount] = useState(0);

  // countdown
  useEffect(() => {
    if (status !== "ready") return;

    if (countdown <= 0) {
      setStatus("expired");
      return;
    }

    const timer = setInterval(() => {
      setCountdown((c) => c - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [status, countdown]);

  // polling
  useEffect(() => {
    if (status !== "ready" || !txnRef) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/pay/check/${txnRef}`);

        const data = await res.json();

        if (data.status === "paid") {
          clearInterval(interval);

          setStatus("success");

          setTimeout(() => {
            onPaid?.();
          }, 1200);
        } else if (data.status === "expired") {
          clearInterval(interval);

          setStatus("expired");
        }

        setPollCount((c) => c + 1);
      } catch (err) {
        console.error("Polling error", err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [status, txnRef]);

  // manual check
  const manualCheck = async () => {
    onPaid?.();
    // if (!txnRef) return;

    // setStatus("checking");

    // try {
    //   const res = await fetch(`/api/pay/check/${txnRef}`);

    //   const data = await res.json();

    //   if (data.status === "paid") {
    //     setStatus("success");

    //     setTimeout(() => {
    //       onPaid?.();
    //     }, 1200);
    //   } else {
    //     setStatus("ready");
    //   }
    // } catch (err) {
    //   console.error(err);

    //   setStatus("ready");
    // }
  };

  // regenerate qr
  const regenerateQr = async () => {
    try {
      setStatus("loading");

      const res = await fetch("/api/pay/regenerate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error);
      }

      setTxnRef(data.txnRef);

      setQrUrl(data.qrUrl);

      setBankInfo(data.bankInfo);

      setCountdown(15 * 60);

      setPollCount(0);

      setStatus("ready");
    } catch (err) {
      console.error(err);

      setStatus("expired");
    }
  };

  return {
    status,

    qrUrl,

    txnRef,

    bankInfo,

    countdown,

    pollCount,

    manualCheck,

    regenerateQr,
  };
}
