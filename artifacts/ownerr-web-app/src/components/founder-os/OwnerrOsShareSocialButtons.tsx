import { Instagram, Linkedin } from "lucide-react";
import { FaXTwitter } from "react-icons/fa6";
import { OWNERR_OS_SOCIAL } from "@/lib/ownerrOsShareAssets";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  layout?: "row" | "stack";
};

const links = [
  {
    key: "linkedin",
    href: OWNERR_OS_SOCIAL.linkedin,
    //label: "Follow on LinkedIn",
    className: "bg-[#0A66C2] text-white hover:bg-[#0A66C2]/90",
    icon: Linkedin,
  },
  {
    key: "instagram",
    href: OWNERR_OS_SOCIAL.instagram,
    //label: "Follow on Instagram",
    className:
      "bg-[color:var(--terminal-surface-2)] text-[color:var(--terminal-fg)] ring-1 ring-[color:var(--terminal-border)] hover:bg-[color:var(--terminal-bg)]",
    icon: Instagram,
  },
  {
    key: "x",
    href: OWNERR_OS_SOCIAL.x,
    //label: "Follow on X",
    className:
      "bg-[color:var(--terminal-surface-2)] text-[color:var(--terminal-fg)] ring-1 ring-[color:var(--terminal-border)] hover:bg-[color:var(--terminal-bg)]",
    icon: FaXTwitter,
  },
] as const;

export function OwnerrOsShareSocialButtons({ className, layout = "stack" }: Props) {
  return (
    <div
      className={cn(
        "flex gap-2",
        layout === "stack" ? "flex-col" : "flex-col sm:flex-row",
        className,
      )}
    >
      {links.map(({ key, href, className: btnClass, icon: Icon }) => (
        <a
          key={key}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "inline-flex h-12 items-center justify-center rounded-[10px] px-4 text-sm font-bold transition-colors",
            btnClass,
          )}
        >
          <Icon className="mr-2 h-5 w-5 shrink-0" aria-hidden />
          {/* {label} */}
        </a>
      ))}
    </div>
  );
}