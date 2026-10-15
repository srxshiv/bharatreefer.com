import Image from "next/image";
import { cn } from "@/lib/cn";
import logo from "../../../public/brand/logo.webp";

/**
 * The brand logo: the tricolour map, the reefer truck and the wordmark. It has a
 * transparent background and navy lettering, so on the dark theme it gets a thin white
 * outline (a drop shadow that follows its shape) to stand out from the navy behind it.
 */
export function Logo({
  name,
  className,
  priority = false,
}: {
  /** Accessible name; the image carries the wordmark. */
  name: string;
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src={logo}
      alt={name}
      priority={priority}
      sizes="(min-width: 1024px) 220px, 160px"
      className={cn(
        "h-12 w-auto lg:h-14",
        "dark:[filter:drop-shadow(0_0_0.6px_rgb(255_255_255))_drop-shadow(0_0_0.6px_rgb(255_255_255))_drop-shadow(0_0_5px_rgb(255_255_255/0.3))]",
        className,
      )}
    />
  );
}
