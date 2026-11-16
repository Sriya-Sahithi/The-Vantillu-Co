import Image from "next/image";

export function BrandMark({ showName = true }: { showName?: boolean }) {
  return (
    <>
      <Image
        alt="The Vantillu Co. circular brand seal"
        className="wordmark-seal"
        height={40}
        src="/brand/kitchen-seal.webp"
        width={40}
      />
      {showName ? <span className="wordmark-name">The Vantillu <i>Co.</i></span> : null}
    </>
  );
}
