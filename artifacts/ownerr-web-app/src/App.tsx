import { Switch, Route, Router as WouterRouter, Redirect, useParams } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MarketplaceLayout } from "@/components/MarketplaceLayout";
import { MarketingLayout } from "@/components/MarketingLayout";
import { AuthDialog } from "@/components/AuthDialog";
import { ScrollToTop } from "@/components/ScrollToTop";
import NotFound from "@/pages/not-found";

import Landing from "@/pages/landing";
import ValuationPage from "@/pages/valuation";
import MarketIntelligencePage from "@/pages/market-intelligence";
import HowItWorksPage from "@/pages/how-it-works";
import PricingPage from "@/pages/pricing";

import Home from "@/pages/home";
import Acquire from "@/pages/acquire";
import Feed from "@/pages/feed";
import Stats from "@/pages/stats";
import Cofounders from "@/pages/cofounders";
import StartupDetail from "@/pages/startup-detail";
import FounderProfile from "@/pages/founder-profile";
import ClaimSpots from "@/pages/claim-spots";

import { DashboardLayout } from '@/components/DashboardLayout';
import BuyerDashboard from '@/pages/buyer';
import BuyerInterestsPage from '@/pages/buyer/interests';
import BuyerBidsPage from '@/pages/buyer/bids';
import BuyerProfilePage from '@/pages/buyer/profile';
import SellerDashboard from '@/pages/seller';
import SellerListingsPage from '@/pages/seller/listings';
import SellerInboxPage from '@/pages/seller/inbox';
import SellerVerificationPage from '@/pages/seller/verification';
import SellerProfilePage from '@/pages/seller/profile';
import DashboardHubPage from '@/pages/dashboard-hub';
import AppSettingsPage from '@/pages/app-settings';
import AppMessagesPage from '@/pages/app-messages';
import AppBidsPage from '@/pages/app-bids';

import { applyTheme } from "@/components/ThemeToggle";
import { AddStartupProvider } from "@/context/AddStartupContext";
import { MockBiddingProvider } from "@/context/MockBiddingContext";
import { MockSessionProvider, useMockSession } from "@/context/MockSessionContext";
import { AuthRole } from "./lib/mockAuthService";
import { appPath, marketplacePath } from "@/lib/appPaths";
import { appDeskHrefForRole } from "@/routes/navConfig";

if (typeof document !== "undefined") {
  applyTheme();
}

const queryClient = new QueryClient();

type ProtectedRouteProps = {
  role: AuthRole;
  component: React.ComponentType;
};

function ProtectedAuthenticated({ component: Component }: { component: React.ComponentType }) {
  const { currentUser } = useMockSession();
  if (!currentUser) return <Redirect to={marketplacePath('/')} />;
  return <Component />;
}

function ProtectedRoute({ role, component: Component }: ProtectedRouteProps) {
  const { currentUser } = useMockSession();

  if (!currentUser) {
    return <Redirect to={marketplacePath('/')} />;
  }

  if (currentUser.role !== role) {
    return <Redirect to={appPath('/')} />;
  }

  return <Component />;
}

/** Signed-in users skip public marketing / marketplace and go straight to the private desk. */
function RedirectIfAuthenticated({ children }: { children: React.ReactNode }) {
  const { currentUser } = useMockSession();
  if (currentUser) {
    return <Redirect to={appDeskHrefForRole(currentUser.role)} />;
  }
  return <>{children}</>;
}

function RedirectLegacyStartup() {
  const { slug } = useParams<{ slug: string }>();
  return <Redirect to={marketplacePath(`/startup/${slug ?? ""}`)} />;
}

function RedirectLegacyFounder() {
  const { handle } = useParams<{ handle: string }>();
  return <Redirect to={marketplacePath(`/founder/${handle ?? ""}`)} />;
}

function RedirectAppStartupToMarketplace() {
  const { slug } = useParams<{ slug: string }>();
  return <Redirect to={marketplacePath(`/startup/${slug ?? ""}`)} />;
}

function RedirectAppFounderToMarketplace() {
  const { handle } = useParams<{ handle: string }>();
  return <Redirect to={marketplacePath(`/founder/${handle ?? ""}`)} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/">
        <RedirectIfAuthenticated>
          <MarketingLayout>
            <Landing />
          </MarketingLayout>
        </RedirectIfAuthenticated>
      </Route>
      <Route path="/valuation">
        <RedirectIfAuthenticated>
          <ValuationPage />
        </RedirectIfAuthenticated>
      </Route>
      <Route path="/market-intelligence">
        <RedirectIfAuthenticated>
          <MarketIntelligencePage />
        </RedirectIfAuthenticated>
      </Route>
      <Route path="/how-it-works">
        <RedirectIfAuthenticated>
          <HowItWorksPage />
        </RedirectIfAuthenticated>
      </Route>
      <Route path="/pricing">
        <RedirectIfAuthenticated>
          <PricingPage />
        </RedirectIfAuthenticated>
      </Route>

      <Route path="/feed">
        <Redirect to={marketplacePath("/feed")} />
      </Route>
      <Route path="/stats">
        <Redirect to={marketplacePath("/stats")} />
      </Route>
      <Route path="/cofounders">
        <Redirect to={marketplacePath("/cofounders")} />
      </Route>
      <Route path="/claim">
        <Redirect to={marketplacePath("/claim")} />
      </Route>
      <Route path="/acquire">
        <Redirect to={marketplacePath("/acquire")} />
      </Route>
      <Route path="/startup/:slug">
        <RedirectLegacyStartup />
      </Route>
      <Route path="/founder/:handle">
        <RedirectLegacyFounder />
      </Route>

      <Route path="/buyer">
        <Redirect to={appPath("/buyer")} />
      </Route>
      <Route path="/buyer/interests">
        <Redirect to={appPath("/buyer/interests")} />
      </Route>
      <Route path="/buyer/acquire">
        <Redirect to={appPath("/buyer/acquire")} />
      </Route>
      <Route path="/buyer/bids">
        <Redirect to={appPath("/buyer/bids")} />
      </Route>
      <Route path="/buyer/profile">
        <Redirect to={appPath("/buyer/profile")} />
      </Route>
      <Route path="/seller">
        <Redirect to={appPath("/seller")} />
      </Route>
      <Route path="/seller/listings">
        <Redirect to={appPath("/seller/listings")} />
      </Route>
      <Route path="/seller/inbox">
        <Redirect to={appPath("/seller/inbox")} />
      </Route>
      <Route path="/seller/verification">
        <Redirect to={appPath("/seller/verification")} />
      </Route>
      <Route path="/seller/profile">
        <Redirect to={appPath("/seller/profile")} />
      </Route>

      {/* Legacy public marketplace URLs → `/marketplace` */}
      <Route path="/app/feed">
        <Redirect to={marketplacePath("/feed")} />
      </Route>
      <Route path="/app/stats">
        <Redirect to={marketplacePath("/stats")} />
      </Route>
      <Route path="/app/cofounders">
        <Redirect to={marketplacePath("/cofounders")} />
      </Route>
      <Route path="/app/claim">
        <Redirect to={marketplacePath("/claim")} />
      </Route>
      <Route path="/app/startup/:slug">
        <RedirectAppStartupToMarketplace />
      </Route>
      <Route path="/app/founder/:handle">
        <RedirectAppFounderToMarketplace />
      </Route>
      <Route path="/app/acquire">
        <Redirect to={marketplacePath("/acquire")} />
      </Route>
      <Route path="/app/">
        <Redirect to={marketplacePath("/")} />
      </Route>

      <Route path="/marketplace/startup/:slug">
        <RedirectIfAuthenticated>
          <MarketplaceLayout>
            <StartupDetail />
          </MarketplaceLayout>
        </RedirectIfAuthenticated>
      </Route>
      <Route path="/marketplace/founder/:handle">
        <RedirectIfAuthenticated>
          <MarketplaceLayout>
            <FounderProfile />
          </MarketplaceLayout>
        </RedirectIfAuthenticated>
      </Route>
      <Route path="/marketplace/acquire">
        <RedirectIfAuthenticated>
          <MarketplaceLayout>
            <Acquire />
          </MarketplaceLayout>
        </RedirectIfAuthenticated>
      </Route>
      <Route path="/marketplace/feed">
        <RedirectIfAuthenticated>
          <MarketplaceLayout>
            <Feed />
          </MarketplaceLayout>
        </RedirectIfAuthenticated>
      </Route>
      <Route path="/marketplace/stats">
        <RedirectIfAuthenticated>
          <MarketplaceLayout>
            <Stats />
          </MarketplaceLayout>
        </RedirectIfAuthenticated>
      </Route>
      <Route path="/marketplace/cofounders">
        <RedirectIfAuthenticated>
          <MarketplaceLayout>
            <Cofounders />
          </MarketplaceLayout>
        </RedirectIfAuthenticated>
      </Route>
      <Route path="/marketplace/claim">
        <RedirectIfAuthenticated>
          <MarketplaceLayout>
            <ClaimSpots />
          </MarketplaceLayout>
        </RedirectIfAuthenticated>
      </Route>
      <Route path="/marketplace/">
        <RedirectIfAuthenticated>
          <MarketplaceLayout>
            <Home />
          </MarketplaceLayout>
        </RedirectIfAuthenticated>
      </Route>
      <Route path="/marketplace">
        <RedirectIfAuthenticated>
          <MarketplaceLayout>
            <Home />
          </MarketplaceLayout>
        </RedirectIfAuthenticated>
      </Route>

      <Route path="/app/buyer/interests">
        <DashboardLayout>
          <ProtectedRoute role="buyer" component={BuyerInterestsPage} />
        </DashboardLayout>
      </Route>
      <Route path="/app/buyer/acquire">
        <DashboardLayout>
          <ProtectedRoute role="buyer" component={Acquire} />
        </DashboardLayout>
      </Route>
      <Route path="/app/buyer/bids">
        <DashboardLayout>
          <ProtectedRoute role="buyer" component={BuyerBidsPage} />
        </DashboardLayout>
      </Route>
      <Route path="/app/buyer/profile">
        <DashboardLayout>
          <ProtectedRoute role="buyer" component={BuyerProfilePage} />
        </DashboardLayout>
      </Route>
      <Route path="/app/buyer">
        <DashboardLayout>
          <ProtectedRoute role="buyer" component={BuyerDashboard} />
        </DashboardLayout>
      </Route>

      <Route path="/app/seller/listings">
        <DashboardLayout>
          <ProtectedRoute role="founder" component={SellerListingsPage} />
        </DashboardLayout>
      </Route>
      <Route path="/app/seller/inbox">
        <DashboardLayout>
          <ProtectedRoute role="founder" component={SellerInboxPage} />
        </DashboardLayout>
      </Route>
      <Route path="/app/seller/verification">
        <DashboardLayout>
          <ProtectedRoute role="founder" component={SellerVerificationPage} />
        </DashboardLayout>
      </Route>
      <Route path="/app/seller/profile">
        <DashboardLayout>
          <ProtectedRoute role="founder" component={SellerProfilePage} />
        </DashboardLayout>
      </Route>
      <Route path="/app/seller">
        <DashboardLayout>
          <ProtectedRoute role="founder" component={SellerDashboard} />
        </DashboardLayout>
      </Route>

      <Route path="/app/settings">
        <DashboardLayout>
          <ProtectedAuthenticated component={AppSettingsPage} />
        </DashboardLayout>
      </Route>
      <Route path="/app/messages">
        <DashboardLayout>
          <ProtectedAuthenticated component={AppMessagesPage} />
        </DashboardLayout>
      </Route>
      <Route path="/app/bids">
        <DashboardLayout>
          <ProtectedAuthenticated component={AppBidsPage} />
        </DashboardLayout>
      </Route>
      <Route path="/app">
        <DashboardLayout>
          <ProtectedAuthenticated component={DashboardHubPage} />
        </DashboardLayout>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MockSessionProvider>
        <AddStartupProvider>
          <MockBiddingProvider>
            <TooltipProvider>
              <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                <ScrollToTop />
                <Router />
              </WouterRouter>
              <AuthDialog />
              <Toaster />
            </TooltipProvider>
          </MockBiddingProvider>
        </AddStartupProvider>
      </MockSessionProvider>
    </QueryClientProvider>
  );
}

export default App;
