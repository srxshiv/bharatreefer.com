import type { CSSProperties } from "react";
import Image from "next/image";
import { ChevronRight } from "lucide-react";
import type { BusinessInfo } from "@/config/site";
import truck from "../../../public/brand/bharat-reefer-truck.jpg";
import { IntroMotion } from "./intro-motion";

const SCENE_ID = "intro";
const SLOGAN = "Linking Bharat.";

/**
 * The truck photo, fixed behind the whole home page: full screen when the page opens, then, as
 * the page slides up over it, faded into a blurred copy of itself, so it stays softly behind
 * the content in every browser (backdrop blur alone is not drawn everywhere). On phones the
 * whole photo shows across the screen on that blurred copy, so the logo is never cut off.
 */
export function IntroBackdrop({ business }: { business: BusinessInfo }) {
  return (
    <div data-intro-backdrop="" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-black">
      {/* Blurred, so a small copy is plenty. */}
      <Image src={truck} alt="" aria-hidden="true" fill sizes="20vw" className="scale-125 object-cover opacity-80 blur-2xl brightness-110 saturate-150" />
      <div className="intro-sharp absolute inset-0">
        <Image
          src={truck}
          alt={`A ${business.name} refrigerated truck with the ${business.name} logo, on the highway at sunset`}
          fill
          loading="eager"
          placeholder="blur"
          sizes="100vw"
          className="intro-photo object-contain object-[50%_40%] landscape:object-cover landscape:object-[50%_55%]"
        />
      </div>
    </div>
  );
}

/**
 * The opening scene over that photo, told as you scroll: the name lights up word by word,
 * then the slogan in the tricolour, the promise and the buttons. IntroMotion turns the scroll
 * into the CSS variables that drive it (globals.css, "opening scene"). Shown whole, without
 * motion, for anyone who asks their device for less motion.
 */
export function Intro({
  business,
  showStory,
}: {
  business: BusinessInfo;
  /** Links to the About section when it is shown. */
  showStory: boolean;
}) {
  const words = business.name.split(" ");

  return (
    <section id={SCENE_ID} aria-label={`${business.name}: ${SLOGAN}`} className="intro relative">
      <div className="intro-stage relative h-svh overflow-hidden">
        <div aria-hidden="true" className="intro-shade pointer-events-none absolute inset-0" />

        <div className="intro-statement absolute inset-x-0 bottom-[8svh] px-5 text-center text-white portrait:bottom-[12svh]">
          <p className="intro-bands">
            {words.map((word, index) => (
              <span key={word} className="intro-band" style={{ "--i": index } as CSSProperties}>
                {word}
              </span>
            ))}
          </p>
          <p className="intro-band intro-slogan" style={{ "--i": words.length } as CSSProperties}>
            {SLOGAN}
          </p>
          <p className="intro-line mx-auto mt-5 max-w-2xl text-lg/8 text-balance text-white/85 sm:text-xl/9">
            Your reliable cold chain partners.
          </p>
          <div className="intro-cta mt-8 flex flex-wrap items-center justify-center gap-x-7 gap-y-3">
            <a
              href="#quote"
              className="inline-flex h-12 items-center rounded-full bg-white px-7 text-[15px] font-semibold text-navy-950 transition-colors hover:bg-ice-100"
            >
              Get a quote
            </a>
            {showStory ? (
              <a
                href="#about"
                className="group inline-flex items-center gap-1 text-[15px] font-medium text-white/85 transition-colors hover:text-white"
              >
                Our story
                <ChevronRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-0.5" />
              </a>
            ) : null}
          </div>
        </div>

        {/* Over the buttons once it has faded, so it must let clicks through. */}
        <div aria-hidden="true" className="intro-cue pointer-events-none absolute inset-x-0 bottom-[4svh] flex flex-col items-center gap-2.5">
          <span className="caption text-white/70">Scroll</span>
          <span className="intro-cue-track">
            <span className="intro-cue-dot" />
          </span>
        </div>
      </div>
      <IntroMotion sceneId={SCENE_ID} />
    </section>
  );
}
