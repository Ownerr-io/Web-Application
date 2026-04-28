import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/Layout";
import NotFound from "@/pages/not-found";

// Import pages
import Home from "@/pages/home";
import Acquire from "@/pages/acquire";
import Feed from "@/pages/feed";
import Stats from "@/pages/stats";
import Cofounders from "@/pages/cofounders";
import StartupDetail from "@/pages/startup-detail";
import FounderProfile from "@/pages/founder-profile";
import ClaimSpots from "@/pages/claim-spots";

// V2 Imports
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

import { applyTheme, getInitialTheme } from "@/components/ThemeToggle";
import { AddStartupProvider } from "@/context/AddStartupContext";
import { MockBiddingProvider } from "@/context/MockBiddingContext";
import { MockSessionProvider, useMockSession } from "@/context/MockSessionContext";
import { AuthRole } from "./lib/mockAuthService";

if (typeof document !== "undefined") {
  applyTheme(getInitialTheme());
}

const queryClient = new QueryClient();

type ProtectedRouteProps = {
  role: AuthRole;
  component: React.ComponentType;
};

type PublicRouteProps = {
  component: React.ComponentType;
};

function PublicRoute({ component: Component }: PublicRouteProps) {
  const { currentUser } = useMockSession();

  if (currentUser) {
    return <Redirect to={currentUser.role === "buyer" ? "/buyer" : "/seller"} />;
  }

  return <Component />;
}

function ProtectedRoute({ role, component: Component }: ProtectedRouteProps) {
  const { currentUser } = useMockSession();

  if (!currentUser) {
    return <Redirect to="/" />;
  }

  if (currentUser.role !== role) {
    return <Redirect to={currentUser.role === "buyer" ? "/buyer" : "/seller"} />;
  }

  return <Component />;
}

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/">
          <PublicRoute component={Home} />
        </Route>
        <Route path="/feed">
          <PublicRoute component={Feed} />
        </Route>
        <Route path="/stats">
          <PublicRoute component={Stats} />
        </Route>
        <Route path="/cofounders">
          <PublicRoute component={Cofounders} />
        </Route>
        <Route path="/claim">
          <PublicRoute component={ClaimSpots} />
        </Route>
        <Route path="/startup/:slug">
          <PublicRoute component={StartupDetail} />
        </Route>
        <Route path="/founder/:handle">
          <PublicRoute component={FounderProfile} />
        </Route>

        <Route path="/acquire">
          <PublicRoute component={Acquire} />
        </Route>

        {/* V2 Dashboard Routes */}
        <Route path="/buyer">
          <DashboardLayout>
            <ProtectedRoute role="buyer" component={BuyerDashboard} />
          </DashboardLayout>
        </Route>
        <Route path="/buyer/interests">
          <DashboardLayout>
            <ProtectedRoute role="buyer" component={BuyerInterestsPage} />
          </DashboardLayout>
        </Route>
        <Route path="/buyer/acquire">
          <DashboardLayout>
            <ProtectedRoute role="buyer" component={Acquire} />
          </DashboardLayout>
        </Route>
        <Route path="/buyer/bids">
          <DashboardLayout>
            <ProtectedRoute role="buyer" component={BuyerBidsPage} />
          </DashboardLayout>
        </Route>
        <Route path="/buyer/profile">
          <DashboardLayout>
            <ProtectedRoute role="buyer" component={BuyerProfilePage} />
          </DashboardLayout>
        </Route>

        <Route path="/seller">
          <DashboardLayout>
            <ProtectedRoute role="founder" component={SellerDashboard} />
          </DashboardLayout>
        </Route>
        <Route path="/seller/listings">
          <DashboardLayout>
            <ProtectedRoute role="founder" component={SellerListingsPage} />
          </DashboardLayout>
        </Route>
        <Route path="/seller/inbox">
          <DashboardLayout>
            <ProtectedRoute role="founder" component={SellerInboxPage} />
          </DashboardLayout>
        </Route>
        <Route path="/seller/verification">
          <DashboardLayout>
            <ProtectedRoute role="founder" component={SellerVerificationPage} />
          </DashboardLayout>
        </Route>
        <Route path="/seller/profile">
          <DashboardLayout>
            <ProtectedRoute role="founder" component={SellerProfilePage} />
          </DashboardLayout>
        </Route>

        <Route component={NotFound} />
      </Switch>
    </Layout>
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
                <Router />
              </WouterRouter>
              <Toaster />
            </TooltipProvider>
          </MockBiddingProvider>
        </AddStartupProvider>
      </MockSessionProvider>
    </QueryClientProvider>
  );
}

export default App;