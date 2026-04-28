import { DashboardSidebar } from '@/components/Sidebar';

type Props = {
  children: React.ReactNode;
};

export function DashboardLayout({ children }: Props) {
  return (
    <div className="grid min-h-screen w-full lg:grid-cols-[240px_1fr]">
      <div className="hidden border-r bg-background lg:block">
        <DashboardSidebar />
      </div>
      <main className="flex flex-col">
        <div className="flex-1 p-4 sm:p-6">{children}</div>
      </main>
    </div>
  );
}