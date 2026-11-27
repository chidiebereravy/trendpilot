import Image from "next/image";

export default function TrendPilotLogo({ isText = true, className = "" }) {
  return (
    <div className={`inline-flex items-center ${className}`}>
      {isText ? (
        <Image
          src="/images/trendpilot-background-2.png"
          alt="TrendPilot"
          width={240}
          height={160}
          priority
          className="h-18 w-18 object-contain md:w-48"
        />
      ) : (
        <Image
          src="/images/trendpilot-background-1.png"
          alt="TrendPilot"
          width={64}
          height={64}
          priority
          className="h-10 w-10 object-contain sm:h-12 sm:w-12"
        />
      )}
    </div>
  );
}
