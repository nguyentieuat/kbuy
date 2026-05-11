// components/RecaptchaBox.tsx

type Props = {
  containerRef: (el: HTMLDivElement | null) => void;
};

export default function RecaptchaBox({ containerRef }: Props) {
  return (
    <div
      ref={containerRef}
      style={{ position: "fixed", top: -9999, left: -9999 }}
    />
  );
}