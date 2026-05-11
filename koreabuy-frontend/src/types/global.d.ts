declare module "swiper/css";
declare module "swiper/css/navigation";
declare module "swiper/css/pagination";
declare module "swiper/css/effect-fade";

import type { RecaptchaVerifier } from "firebase/auth";

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
  }
}
