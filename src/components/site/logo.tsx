import Image from "next/image";
import { cn } from "@/lib/cn";
import logo from "../../../public/brand/logo.webp";

/**
 * The brand logo: the tricolour map, the reefer truck and the wordmark. It has a
 * transparent background and dark lettering, so it needs a light surface behind it.
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
      className={cn("h-12 w-auto lg:h-14", className)}
    />
  );
}
