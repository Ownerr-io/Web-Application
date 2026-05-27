import {
  DEMO_MARKETPLACE_BUYER_EMAIL,
  DEMO_MARKETPLACE_SELLER_EMAIL,
  showDemoAccountHints,
} from '@/lib/demo/demoAccountCatalog';

/**
 * Reminds devs/QA that demo users are real Supabase Auth users (seeded), not env-based auth.
 */
export function DemoAccountsHint() {
  if (!showDemoAccountHints()) return null;

  const lines = [
    { label: 'Buyer', email: DEMO_MARKETPLACE_BUYER_EMAIL },
    { label: 'Seller', email: DEMO_MARKETPLACE_SELLER_EMAIL },
  ];

  // return (
  //   <div className="mt-4 space-y-2 border-t border-[color:var(--terminal-border)] pt-4">
  //     <p className="text-center text-[10px] font-bold uppercase tracking-wider text-[color:var(--terminal-muted)]">
  //       Database demo accounts
  //     </p>
  //     <p className="text-center text-[11px] leading-relaxed text-[color:var(--terminal-muted)]">
  //       Run <span className="font-mono text-[color:var(--terminal-ochre)]">npm run marketplace:seed-demo</span>
  //       , then sign in with the seeded email and password from{' '}
  //       <span className="font-mono">scripts/demo-marketplace.constants.mjs</span> (not .env).
  //     </p>
  //     <ul className="space-y-1.5 rounded-[10px] border border-[color:var(--terminal-border)]/80 bg-[color:var(--terminal-bg)]/50 p-3 text-xs">
  //       {lines.map((row) => (
  //         <li key={row.email} className="flex flex-wrap justify-between gap-2">
  //           <span className="font-bold text-[color:var(--terminal-fg)]">{row.label}</span>
  //           <span className="font-mono text-[color:var(--terminal-muted)]">{row.email}</span>
  //         </li>
  //       ))}
  //     </ul>
  //   </div>
  // );
  return null;
}
