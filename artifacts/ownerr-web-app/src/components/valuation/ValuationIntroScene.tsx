import { ValuationIntroLottie } from './ValuationIntroLottie';
type Props = {
  onContinue: () => void;
};

/** Intro: Lottie loading animation — tap to continue. */
export function ValuationIntroScene({ onContinue }: Props) {
  return (
    <button
      type="button"
      className="relative flex h-full min-h-0 w-full flex-1 cursor-default flex-col border-0 bg-transparent p-0"
      onClick={onContinue}
      aria-label="Continue to valuation questions"
    >
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <ValuationIntroLottie onFinished={onContinue} />
      </div>
    </button>
  );
}
