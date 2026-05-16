import { ValuationLottieAnimation } from './ValuationLottieAnimation';

/** Public asset — filename contains a space */
const LOTTIE_SRC = '/loading%20animation.lottie';

type Props = {
  onFinished: () => void;
};

export function ValuationIntroLottie({ onFinished }: Props) {
  return (
    <div
      className="pointer-events-none flex w-full items-center justify-center px-4"
      role="progressbar"
      aria-busy="true"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={0}
      aria-label="Loading valuation experience"
    >
      <ValuationLottieAnimation
        src={LOTTIE_SRC}
        loop={false}
        onComplete={onFinished}
        className="h-[min(52dvh,440px)] w-[min(88vw,440px)] sm:h-[min(72dvh,640px)] sm:w-[min(92vw,640px)]"
        aria-label="Loading valuation experience"
      />
    </div>
  );
}
