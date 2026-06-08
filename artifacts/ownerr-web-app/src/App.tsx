import { Suspense } from "react";
import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MarketplaceLayout } from "@/components/MarketplaceLayout";
import { MarketingLayout } from "@/components/MarketingLayout";
import { ScrollToTop } from "@/components/ScrollToTop";
import NotFound from "@/pages/not-found";
import { ProductAuthScreen } from "@/components/auth/ProductAuthScreen";
import { ProductAuthCallbackPage } from "@/pages/products/ProductAuthCallbackPage";
import { ProductForgotPasswordPage } from "@/pages/products/ProductForgotPasswordPage";

import Landing from "@/pages/landing";
import ProductsPage from "@/pages/products";
import HowItWorksPage from "@/pages/how-it-works";
import ContactPage from "@/pages/contact";
import { MarketplaceStartupsRedirect } from "@/components/routing/MarketplaceStartupsRedirect";
import { RouteLoadingFallback } from "@/components/routing/RouteLoadingFallback";
import {
  LazyAcquirePage,
  LazyAdminFounderStatsPage,
  LazyAdminHubPage,
  LazyOwnerrNetworkAdminDashboard,
  LazyOwnerrNetworkMembersPage,
  LazyAdminLedgerPage,
  LazyAdminReferralsPage,
  LazyMarketplaceAdminDashboard,
  LazyMarketplaceAdminBuyersPage,
  LazyMarketplaceAdminSellersPage,
  LazyMarketplaceAdminListingsPage,
  LazyMarketplaceAdminSubmissionsPage,
  LazyMarketplaceAdminVerificationPage,
  LazyMarketplaceAdminOffersPage,
  LazyOwnerrOsAdminDashboard,
  LazyOwnerrOsAdminFoundersPage,
  LazyOwnerrOsAdminListingsPage,
  LazyOwnerrOsAdminAnalyticsPage,
  LazyAdminOperationsPage,
  LazyAdminSystemPage,
  LazyFounderOsFlowDialog,
  LazyMarketIntelligencePage,
  LazyStartupDetailPage,
  LazyStatsPage,
  LazyValuationPage,
} from "@/routing/lazyPages";

import ProductsOwnerrOsLanding from "@/pages/products/ownerr-os";
import OwnerrOsJoinPage from "@/pages/ownerr-os/join";
import ProductsOwnerrNetworkLanding from "@/pages/products/ownerr-network";

import OwnerrOsAppIndex from "@/pages/ownerr-os/app";
import OwnerrOsAppDashboard from "@/pages/ownerr-os/app/dashboard";
import OwnerrOsAppAnalytics from "@/pages/ownerr-os/app/analytics";
import OwnerrOsAppListings from "@/pages/ownerr-os/app/listings";
import OwnerrOsListingNewPage from "@/pages/ownerr-os/app/listings/new";
import OwnerrOsListingDetailPage from "@/pages/ownerr-os/app/listings/detail";
import OwnerrOsAppProfile from "@/pages/ownerr-os/app/profile";
import OwnerrOsAppSettings from "@/pages/ownerr-os/app/settings";

import OwnerrNetworkAppIndex from "@/pages/ownerr-network/app";
import OwnerrNetworkAppDashboard from "@/pages/ownerr-network/app/dashboard";
import OwnerrNetworkAppOnboarding from "@/pages/ownerr-network/app/onboarding";
import OwnerrNetworkAppProfile from "@/pages/ownerr-network/app/profile";
import OwnerrNetworkAppDiscover from "@/pages/ownerr-network/app/discover";
import OwnerrNetworkAppReferrals from "@/pages/ownerr-network/app/referrals";
import OwnerrNetworkAppWallet from "@/pages/ownerr-network/app/wallet";
import OwnerrNetworkAppSettings from "@/pages/ownerr-network/app/settings";
import OwnerrNetworkAppLeaderboard from "@/pages/ownerr-network/app/leaderboard";
import OwnerrNetworkAppMember from "@/pages/ownerr-network/app/member";
import OwnerrNetworkSharePage from "@/pages/share/network/[username]";
import FounderSharePage from "@/pages/share/founder/[code]";

import MarketplaceAppSettings from "@/pages/marketplace/app/settings";

import Home from "@/pages/home";
import Feed from "@/pages/feed";
import Cofounders from "@/pages/cofounders";
import FounderProfile from "@/pages/founder-profile";
import ClaimSpots from "@/pages/claim-spots";

import { AuthenticatedShellRoute } from "@/components/DashboardLayout";
import { RouteGuard } from "@/components/routing/RouteGuard";
import { DeskRoleGuard } from "@/components/routing/DeskRoleGuard";
import { OwnerrNetworkProtectedRoute } from "@/components/ownerr-network/OwnerrNetworkProtectedRoute";
import { DemoMarketplaceShellGuard } from "@/components/routing/DemoMarketplaceShellGuard";
import { ProductShellEnforcer } from "@/components/routing/ProductShellEnforcer";
import BuyerDashboard from "@/pages/buyer";
import BuyerInterestsPage from "@/pages/buyer/interests";
import BuyerBidsPage from "@/pages/buyer/bids";
import BuyerOffersPage from "@/pages/buyer/offers";
import BuyerProfilePage from "@/pages/buyer/profile";
import BuyerInboxPage from "@/pages/buyer/inbox";
import BuyerInboxConversationPage from "@/pages/buyer/inbox-conversation";
import BuyerVerificationPage from "@/pages/buyer/verification";
import SellerListingsPage from "@/pages/seller/listings";
import SellerInboxPage from "@/pages/seller/inbox";
import SellerOffersPage from "@/pages/seller/offers";
import SellerInboxConversationPage from "@/pages/seller/inbox-conversation";
import SellerPersonVerificationPage from "@/pages/seller/verification";
import SellerCompaniesPage from "@/pages/seller/companies/index";
import SellerAddStartupPage from "@/pages/seller/companies/new";
import SellerCompanyDetailPage from "@/pages/seller/companies/detail";
import SellerVerificationDetailRedirect from "@/pages/seller/verification-detail";
import SellerProfilePage from "@/pages/seller/profile";
import SellerDashboard from "@/pages/seller";
import { applyTheme } from "@/components/ThemeToggle";
import { AddStartupProvider } from "@/context/AddStartupContext";
import { FounderOsProvider } from "@/context/FounderOsContext";
import { AuthProvider } from "@/context/AuthContext";
import { ActiveProductProvider } from "@/context/ActiveProductContext";
import MarketplaceAppEntryPage from "@/pages/marketplace/app/index";
import VerifyBusinessEmailPage from "@/pages/marketplace/verify-business-email";
import AuthStartPage from "@/pages/auth/start";
import ResetPasswordPage from "@/pages/auth/reset-password";
import VerifyEmailPage from "@/pages/auth/verify-email";
import AuthConfirmPage from "@/pages/auth/confirm";
import ReauthenticatePage from "@/pages/auth/reauthenticate";
import ForbiddenPage from "@/pages/forbidden";
import { PostHogProvider } from "@/components/analytics/PostHogProvider";
import {
  AUTH_ROUTES,
  MARKETPLACE_ROUTES,
  PRODUCT_ROUTES,
  PUBLIC_ROUTES,
  ADMIN_ROUTES,
} from "@/routing/routeRegistry";

if (typeof document !== "undefined") {
  applyTheme();
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 20_000,
    },
    mutations: {
      retry: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path={PUBLIC_ROUTES.home}>
        <MarketingLayout>
          <Landing />
        </MarketingLayout>
      </Route>
      <Route path={PUBLIC_ROUTES.products}>
        <ProductsPage />
      </Route>
      <Route path={PUBLIC_ROUTES.valuation}>
        <Suspense
          fallback={<RouteLoadingFallback label="Loading valuation…" />}
        >
          <LazyValuationPage />
        </Suspense>
      </Route>
      <Route path={PUBLIC_ROUTES.marketIntelligence}>
        <Suspense
          fallback={<RouteLoadingFallback label="Loading intelligence…" />}
        >
          <LazyMarketIntelligencePage />
        </Suspense>
      </Route>
      <Route path={PUBLIC_ROUTES.howItWorks}>
        <HowItWorksPage />
      </Route>
      <Route path={PUBLIC_ROUTES.contact}>
        <ContactPage />
      </Route>
      <Route path={PUBLIC_ROUTES.adminFounderStats}>
        <MarketingLayout terminalPalette={false}>
          <RouteGuard pathname={PUBLIC_ROUTES.adminFounderStats}>
            <Suspense
              fallback={<RouteLoadingFallback label="Loading admin…" />}
            >
              <LazyAdminFounderStatsPage />
            </Suspense>
          </RouteGuard>
        </MarketingLayout>
      </Route>

      <Route path={ADMIN_ROUTES.hub}>
        <RouteGuard pathname={ADMIN_ROUTES.hub}>
          <Suspense fallback={<RouteLoadingFallback label="Loading admin…" />}>
            <LazyAdminHubPage />
          </Suspense>
        </RouteGuard>
      </Route>

      <Route path={ADMIN_ROUTES.ownerrNetworkDashboard}>
        <RouteGuard pathname={ADMIN_ROUTES.ownerrNetworkDashboard}>
          <Suspense
            fallback={<RouteLoadingFallback label="Loading dashboard…" />}
          >
            <LazyOwnerrNetworkAdminDashboard />
          </Suspense>
        </RouteGuard>
      </Route>
      <Route path={ADMIN_ROUTES.ownerrNetworkMembers}>
        <RouteGuard pathname={ADMIN_ROUTES.ownerrNetworkMembers}>
          <Suspense
            fallback={<RouteLoadingFallback label="Loading members…" />}
          >
            <LazyOwnerrNetworkMembersPage />
          </Suspense>
        </RouteGuard>
      </Route>
      <Route path={ADMIN_ROUTES.ownerrNetworkUsers}>
        <Redirect to={ADMIN_ROUTES.ownerrNetworkMembers} replace />
      </Route>
      <Route path={ADMIN_ROUTES.ownerrNetworkProfiles}>
        <Redirect to={ADMIN_ROUTES.ownerrNetworkMembers} replace />
      </Route>
      <Route path={ADMIN_ROUTES.ownerrNetworkLedger}>
        <RouteGuard pathname={ADMIN_ROUTES.ownerrNetworkLedger}>
          <Suspense fallback={<RouteLoadingFallback label="Loading ledger…" />}>
            <LazyAdminLedgerPage />
          </Suspense>
        </RouteGuard>
      </Route>
      <Route path={ADMIN_ROUTES.ownerrNetworkReferrals}>
        <RouteGuard pathname={ADMIN_ROUTES.ownerrNetworkReferrals}>
          <Suspense
            fallback={<RouteLoadingFallback label="Loading referrals…" />}
          >
            <LazyAdminReferralsPage />
          </Suspense>
        </RouteGuard>
      </Route>

      <Route path={ADMIN_ROUTES.marketplaceDashboard}>
        <RouteGuard pathname={ADMIN_ROUTES.marketplaceDashboard}>
          <Suspense
            fallback={<RouteLoadingFallback label="Loading dashboard…" />}
          >
            <LazyMarketplaceAdminDashboard />
          </Suspense>
        </RouteGuard>
      </Route>
      <Route path={ADMIN_ROUTES.marketplaceBuyers}>
        <RouteGuard pathname={ADMIN_ROUTES.marketplaceBuyers}>
          <Suspense fallback={<RouteLoadingFallback label="Loading buyers…" />}>
            <LazyMarketplaceAdminBuyersPage />
          </Suspense>
        </RouteGuard>
      </Route>
      <Route path={ADMIN_ROUTES.marketplaceSellers}>
        <RouteGuard pathname={ADMIN_ROUTES.marketplaceSellers}>
          <Suspense
            fallback={<RouteLoadingFallback label="Loading sellers…" />}
          >
            <LazyMarketplaceAdminSellersPage />
          </Suspense>
        </RouteGuard>
      </Route>
      <Route path={ADMIN_ROUTES.marketplaceListings}>
        <RouteGuard pathname={ADMIN_ROUTES.marketplaceListings}>
          <Suspense
            fallback={<RouteLoadingFallback label="Loading listings…" />}
          >
            <LazyMarketplaceAdminListingsPage />
          </Suspense>
        </RouteGuard>
      </Route>
      <Route path={ADMIN_ROUTES.marketplaceVerification}>
        <RouteGuard pathname={ADMIN_ROUTES.marketplaceVerification}>
          <Suspense
            fallback={<RouteLoadingFallback label="Loading verification…" />}
          >
            <LazyMarketplaceAdminVerificationPage />
          </Suspense>
        </RouteGuard>
      </Route>
      <Route path={ADMIN_ROUTES.marketplaceSubmissions}>
        <RouteGuard pathname={ADMIN_ROUTES.marketplaceSubmissions}>
          <Suspense
            fallback={<RouteLoadingFallback label="Loading submissions…" />}
          >
            <LazyMarketplaceAdminSubmissionsPage />
          </Suspense>
        </RouteGuard>
      </Route>
      <Route path={ADMIN_ROUTES.marketplaceOffers}>
        <RouteGuard pathname={ADMIN_ROUTES.marketplaceOffers}>
          <Suspense fallback={<RouteLoadingFallback label="Loading offers…" />}>
            <LazyMarketplaceAdminOffersPage />
          </Suspense>
        </RouteGuard>
      </Route>

      <Route path={ADMIN_ROUTES.ownerrOsDashboard}>
        <RouteGuard pathname={ADMIN_ROUTES.ownerrOsDashboard}>
          <Suspense
            fallback={<RouteLoadingFallback label="Loading dashboard…" />}
          >
            <LazyOwnerrOsAdminDashboard />
          </Suspense>
        </RouteGuard>
      </Route>
      <Route path={ADMIN_ROUTES.ownerrOsFounders}>
        <RouteGuard pathname={ADMIN_ROUTES.ownerrOsFounders}>
          <Suspense
            fallback={<RouteLoadingFallback label="Loading founders…" />}
          >
            <LazyOwnerrOsAdminFoundersPage />
          </Suspense>
        </RouteGuard>
      </Route>
      <Route path={ADMIN_ROUTES.ownerrOsListings}>
        <RouteGuard pathname={ADMIN_ROUTES.ownerrOsListings}>
          <Suspense
            fallback={<RouteLoadingFallback label="Loading listings…" />}
          >
            <LazyOwnerrOsAdminListingsPage />
          </Suspense>
        </RouteGuard>
      </Route>
      <Route path={ADMIN_ROUTES.ownerrOsAnalytics}>
        <RouteGuard pathname={ADMIN_ROUTES.ownerrOsAnalytics}>
          <Suspense
            fallback={<RouteLoadingFallback label="Loading analytics…" />}
          >
            <LazyOwnerrOsAdminAnalyticsPage />
          </Suspense>
        </RouteGuard>
      </Route>

      <Route path={ADMIN_ROUTES.operations}>
        <RouteGuard pathname={ADMIN_ROUTES.operations}>
          <Suspense
            fallback={<RouteLoadingFallback label="Loading operations…" />}
          >
            <LazyAdminOperationsPage />
          </Suspense>
        </RouteGuard>
      </Route>
      <Route path={ADMIN_ROUTES.system}>
        <RouteGuard pathname={ADMIN_ROUTES.system}>
          <Suspense fallback={<RouteLoadingFallback label="Loading system…" />}>
            <LazyAdminSystemPage />
          </Suspense>
        </RouteGuard>
      </Route>

      {/* Legacy admin paths → new app-scoped routes */}
      <Route path={ADMIN_ROUTES.adminDashboard}>
        <Redirect to={ADMIN_ROUTES.ownerrNetworkDashboard} replace />
      </Route>
      <Route path={ADMIN_ROUTES.adminUsers}>
        <Redirect to={ADMIN_ROUTES.ownerrNetworkMembers} replace />
      </Route>
      <Route path={ADMIN_ROUTES.adminProfiles}>
        <Redirect to={ADMIN_ROUTES.ownerrNetworkMembers} replace />
      </Route>
      <Route path={ADMIN_ROUTES.adminLedger}>
        <Redirect to={ADMIN_ROUTES.ownerrNetworkLedger} replace />
      </Route>
      <Route path={ADMIN_ROUTES.adminReferrals}>
        <Redirect to={ADMIN_ROUTES.ownerrNetworkReferrals} replace />
      </Route>

      <Route path={PRODUCT_ROUTES.ownerrOsJoin}>
        <OwnerrOsJoinPage />
      </Route>

      <Route path={PRODUCT_ROUTES.ownerrOsLanding}>
        <ProductsOwnerrOsLanding />
      </Route>
      <Route path={PRODUCT_ROUTES.ownerrNetworkLanding}>
        <ProductsOwnerrNetworkLanding />
      </Route>
      <Route path={PRODUCT_ROUTES.marketplaceLanding}>
        <Redirect to={MARKETPLACE_ROUTES.root} replace />
      </Route>

      <Route path="/products/ownerr-os/login">
        <ProductAuthScreen appSlug="ownerr_os" mode="signin" />
      </Route>
      <Route path="/products/ownerr-os/register">
        <ProductAuthScreen appSlug="ownerr_os" mode="signup" />
      </Route>
      <Route path="/products/ownerr-os/callback">
        <ProductAuthCallbackPage />
      </Route>
      <Route path="/products/ownerr-os/forgot-password">
        <ProductForgotPasswordPage appSlug="ownerr_os" />
      </Route>

      <Route path="/products/marketplace/login">
        <Redirect to={MARKETPLACE_ROUTES.portalLogin} replace />
      </Route>
      <Route path="/products/marketplace/register">
        <Redirect to={MARKETPLACE_ROUTES.portalRegister} replace />
      </Route>
      <Route path="/products/marketplace/callback">
        <Redirect to={MARKETPLACE_ROUTES.portalCallback} replace />
      </Route>
      <Route path="/products/marketplace/forgot-password">
        <Redirect to={MARKETPLACE_ROUTES.portalForgotPassword} replace />
      </Route>

      <Route path={MARKETPLACE_ROUTES.portalLogin}>
        <ProductAuthScreen appSlug="marketplace" mode="signin" />
      </Route>
      <Route path={MARKETPLACE_ROUTES.portalRegister}>
        <ProductAuthScreen appSlug="marketplace" mode="signup" />
      </Route>
      <Route path={MARKETPLACE_ROUTES.portalCallback}>
        <ProductAuthCallbackPage />
      </Route>
      <Route path={MARKETPLACE_ROUTES.portalForgotPassword}>
        <ProductForgotPasswordPage appSlug="marketplace" />
      </Route>

      <Route path="/products/ownerr-network/login">
        <ProductAuthScreen appSlug="ownerr_network" mode="signin" />
      </Route>
      <Route path="/products/ownerr-network/register">
        <ProductAuthScreen appSlug="ownerr_network" mode="signup" />
      </Route>
      <Route path="/products/ownerr-network/callback">
        <ProductAuthCallbackPage />
      </Route>
      <Route path="/products/ownerr-network/forgot-password">
        <ProductForgotPasswordPage appSlug="ownerr_network" />
      </Route>

      <Route path={AUTH_ROUTES.start}>
        <AuthStartPage />
      </Route>
      <Route path={AUTH_ROUTES.resetPassword}>
        <ResetPasswordPage />
      </Route>
      <Route path={AUTH_ROUTES.verifyEmail}>
        <VerifyEmailPage />
      </Route>
      <Route path={AUTH_ROUTES.confirm}>
        <AuthConfirmPage />
      </Route>
      <Route path={AUTH_ROUTES.reauthenticate}>
        <ReauthenticatePage />
      </Route>
      <Route path={AUTH_ROUTES.forbidden}>
        <ForbiddenPage />
      </Route>
      <Route path="/auth/login">
        <Redirect to={AUTH_ROUTES.start} replace />
      </Route>
      <Route path="/auth/register">
        <Redirect to={AUTH_ROUTES.start} replace />
      </Route>
      <Route path="/auth/forgot-password">
        <Redirect to={AUTH_ROUTES.start} replace />
      </Route>
      <Route path="/auth/callback">
        <Redirect to={AUTH_ROUTES.start} replace />
      </Route>

      <Route path={MARKETPLACE_ROUTES.settings}>
        <AuthenticatedShellRoute
          product="marketplace"
          pathname={MARKETPLACE_ROUTES.settings}
        >
          <MarketplaceAppSettings />
        </AuthenticatedShellRoute>
      </Route>

      <Route path={PRODUCT_ROUTES.ownerrOsProfile}>
        <AuthenticatedShellRoute
          product="ownerr_os"
          pathname={PRODUCT_ROUTES.ownerrOsProfile}
        >
          <OwnerrOsAppProfile />
        </AuthenticatedShellRoute>
      </Route>
      <Route path={PRODUCT_ROUTES.ownerrOsSettings}>
        <AuthenticatedShellRoute
          product="ownerr_os"
          pathname={PRODUCT_ROUTES.ownerrOsSettings}
        >
          <OwnerrOsAppSettings />
        </AuthenticatedShellRoute>
      </Route>
      <Route path={PRODUCT_ROUTES.ownerrOsListingNew}>
        <AuthenticatedShellRoute
          product="ownerr_os"
          pathname={PRODUCT_ROUTES.ownerrOsListingNew}
        >
          <OwnerrOsListingNewPage />
        </AuthenticatedShellRoute>
      </Route>
      <Route path={`${PRODUCT_ROUTES.ownerrOsListings}/:id`}>
        <AuthenticatedShellRoute
          product="ownerr_os"
          pathname={PRODUCT_ROUTES.ownerrOsListings}
        >
          <OwnerrOsListingDetailPage />
        </AuthenticatedShellRoute>
      </Route>
      <Route path={PRODUCT_ROUTES.ownerrOsListings}>
        <AuthenticatedShellRoute
          product="ownerr_os"
          pathname={PRODUCT_ROUTES.ownerrOsListings}
        >
          <OwnerrOsAppListings />
        </AuthenticatedShellRoute>
      </Route>
      <Route path={PRODUCT_ROUTES.ownerrOsAnalytics}>
        <AuthenticatedShellRoute
          product="ownerr_os"
          pathname={PRODUCT_ROUTES.ownerrOsAnalytics}
        >
          <OwnerrOsAppAnalytics />
        </AuthenticatedShellRoute>
      </Route>
      <Route path={PRODUCT_ROUTES.ownerrOsReferrals}>
        <Redirect to={PRODUCT_ROUTES.ownerrOsDashboard} />
      </Route>
      <Route path={PRODUCT_ROUTES.ownerrOsDashboard}>
        <AuthenticatedShellRoute
          product="ownerr_os"
          pathname={PRODUCT_ROUTES.ownerrOsDashboard}
        >
          <OwnerrOsAppDashboard />
        </AuthenticatedShellRoute>
      </Route>
      <Route path={PRODUCT_ROUTES.ownerrOsApp}>
        <AuthenticatedShellRoute
          product="ownerr_os"
          pathname={PRODUCT_ROUTES.ownerrOsApp}
        >
          <OwnerrOsAppIndex />
        </AuthenticatedShellRoute>
      </Route>

      <Route path={PRODUCT_ROUTES.ownerrNetworkSettings}>
        <AuthenticatedShellRoute
          product="ownerr_network"
          pathname={PRODUCT_ROUTES.ownerrNetworkSettings}
        >
          <OwnerrNetworkProtectedRoute>
            <OwnerrNetworkAppSettings />
          </OwnerrNetworkProtectedRoute>
        </AuthenticatedShellRoute>
      </Route>
      <Route path={PRODUCT_ROUTES.ownerrNetworkLeaderboard}>
        <AuthenticatedShellRoute
          product="ownerr_network"
          pathname={PRODUCT_ROUTES.ownerrNetworkLeaderboard}
        >
          <OwnerrNetworkProtectedRoute>
            <OwnerrNetworkAppLeaderboard />
          </OwnerrNetworkProtectedRoute>
        </AuthenticatedShellRoute>
      </Route>
      <Route path={PRODUCT_ROUTES.ownerrNetworkWallet}>
        <AuthenticatedShellRoute
          product="ownerr_network"
          pathname={PRODUCT_ROUTES.ownerrNetworkWallet}
        >
          <OwnerrNetworkProtectedRoute>
            <OwnerrNetworkAppWallet />
          </OwnerrNetworkProtectedRoute>
        </AuthenticatedShellRoute>
      </Route>
      <Route path={PRODUCT_ROUTES.ownerrNetworkReferrals}>
        <AuthenticatedShellRoute
          product="ownerr_network"
          pathname={PRODUCT_ROUTES.ownerrNetworkReferrals}
        >
          <OwnerrNetworkProtectedRoute>
            <OwnerrNetworkAppReferrals />
          </OwnerrNetworkProtectedRoute>
        </AuthenticatedShellRoute>
      </Route>
      <Route path={PRODUCT_ROUTES.ownerrNetworkDiscover}>
        <AuthenticatedShellRoute
          product="ownerr_network"
          pathname={PRODUCT_ROUTES.ownerrNetworkDiscover}
        >
          <OwnerrNetworkProtectedRoute>
            <OwnerrNetworkAppDiscover />
          </OwnerrNetworkProtectedRoute>
        </AuthenticatedShellRoute>
      </Route>
      <Route path="/ownerr-network/app/member/:username">
        <AuthenticatedShellRoute
          product="ownerr_network"
          pathname="/ownerr-network/app/member/:username"
        >
          <OwnerrNetworkProtectedRoute>
            <OwnerrNetworkAppMember />
          </OwnerrNetworkProtectedRoute>
        </AuthenticatedShellRoute>
      </Route>
      <Route path={PRODUCT_ROUTES.ownerrNetworkProfile}>
        <AuthenticatedShellRoute
          product="ownerr_network"
          pathname={PRODUCT_ROUTES.ownerrNetworkProfile}
        >
          <OwnerrNetworkProtectedRoute>
            <OwnerrNetworkAppProfile />
          </OwnerrNetworkProtectedRoute>
        </AuthenticatedShellRoute>
      </Route>
      <Route path={PRODUCT_ROUTES.ownerrNetworkOnboarding}>
        <AuthenticatedShellRoute
          product="ownerr_network"
          pathname={PRODUCT_ROUTES.ownerrNetworkOnboarding}
          fullBleedMain
        >
          <OwnerrNetworkProtectedRoute requireOnboardingComplete={false}>
            <OwnerrNetworkAppOnboarding />
          </OwnerrNetworkProtectedRoute>
        </AuthenticatedShellRoute>
      </Route>
      <Route path={PRODUCT_ROUTES.ownerrNetworkDashboard}>
        <AuthenticatedShellRoute
          product="ownerr_network"
          pathname={PRODUCT_ROUTES.ownerrNetworkDashboard}
        >
          <OwnerrNetworkProtectedRoute>
            <OwnerrNetworkAppDashboard />
          </OwnerrNetworkProtectedRoute>
        </AuthenticatedShellRoute>
      </Route>
      <Route path={PRODUCT_ROUTES.ownerrNetworkApp}>
        <AuthenticatedShellRoute
          product="ownerr_network"
          pathname={PRODUCT_ROUTES.ownerrNetworkApp}
        >
          <OwnerrNetworkProtectedRoute>
            <OwnerrNetworkAppIndex />
          </OwnerrNetworkProtectedRoute>
        </AuthenticatedShellRoute>
      </Route>

      <Route path="/share/network/:username">
        <OwnerrNetworkSharePage />
      </Route>
      <Route path="/share/founder/:code">
        <FounderSharePage />
      </Route>

      <Route path="/marketplace/verify-business-email">
        <MarketplaceLayout>
          <VerifyBusinessEmailPage />
        </MarketplaceLayout>
      </Route>
      <Route path="/marketplace/startup/:slug">
        <MarketplaceLayout>
          <Suspense
            fallback={<RouteLoadingFallback label="Loading listing…" />}
          >
            <LazyStartupDetailPage />
          </Suspense>
        </MarketplaceLayout>
      </Route>
      <Route path="/marketplace/founder/:handle">
        <MarketplaceLayout>
          <FounderProfile />
        </MarketplaceLayout>
      </Route>
      <Route path={MARKETPLACE_ROUTES.startups}>
        <MarketplaceStartupsRedirect />
      </Route>
      <Route path={MARKETPLACE_ROUTES.acquire}>
        <MarketplaceLayout>
          <Suspense
            fallback={<RouteLoadingFallback label="Loading acquire…" />}
          >
            <LazyAcquirePage />
          </Suspense>
        </MarketplaceLayout>
      </Route>
      <Route path={MARKETPLACE_ROUTES.feed}>
        <MarketplaceLayout>
          <Feed />
        </MarketplaceLayout>
      </Route>
      <Route path={MARKETPLACE_ROUTES.stats}>
        <MarketplaceLayout>
          <Suspense fallback={<RouteLoadingFallback label="Loading stats…" />}>
            <LazyStatsPage />
          </Suspense>
        </MarketplaceLayout>
      </Route>
      <Route path={MARKETPLACE_ROUTES.cofounders}>
        <MarketplaceLayout>
          <Cofounders />
        </MarketplaceLayout>
      </Route>
      <Route path={MARKETPLACE_ROUTES.claim}>
        <MarketplaceLayout>
          <ClaimSpots />
        </MarketplaceLayout>
      </Route>
      <Route path={MARKETPLACE_ROUTES.root}>
        <MarketplaceLayout>
          <Home />
        </MarketplaceLayout>
      </Route>

      <Route path={MARKETPLACE_ROUTES.buyerInterests}>
        <AuthenticatedShellRoute
          product="marketplace"
          pathname={MARKETPLACE_ROUTES.buyerInterests}
        >
          <DeskRoleGuard role="buyer">
            <BuyerInterestsPage />
          </DeskRoleGuard>
        </AuthenticatedShellRoute>
      </Route>
      <Route path={MARKETPLACE_ROUTES.buyerAcquire}>
        <AuthenticatedShellRoute
          product="marketplace"
          pathname={MARKETPLACE_ROUTES.buyerAcquire}
        >
          <DeskRoleGuard role="buyer">
            <Suspense
              fallback={<RouteLoadingFallback label="Loading acquire…" />}
            >
              <LazyAcquirePage />
            </Suspense>
          </DeskRoleGuard>
        </AuthenticatedShellRoute>
      </Route>
      <Route path={MARKETPLACE_ROUTES.buyerBids}>
        <AuthenticatedShellRoute
          product="marketplace"
          pathname={MARKETPLACE_ROUTES.buyerBids}
        >
          <DeskRoleGuard role="buyer">
            <BuyerBidsPage />
          </DeskRoleGuard>
        </AuthenticatedShellRoute>
      </Route>
      <Route path={MARKETPLACE_ROUTES.buyerOffers}>
        <AuthenticatedShellRoute
          product="marketplace"
          pathname={MARKETPLACE_ROUTES.buyerOffers}
        >
          <DeskRoleGuard role="buyer">
            <BuyerOffersPage />
          </DeskRoleGuard>
        </AuthenticatedShellRoute>
      </Route>
      <Route path="/marketplace/app/buyer/inbox/:conversationId">
        <AuthenticatedShellRoute
          product="marketplace"
          pathname="/marketplace/app/buyer/inbox/:conversationId"
        >
          <DeskRoleGuard role="buyer">
            <BuyerInboxConversationPage />
          </DeskRoleGuard>
        </AuthenticatedShellRoute>
      </Route>
      <Route path={MARKETPLACE_ROUTES.buyerInbox}>
        <AuthenticatedShellRoute
          product="marketplace"
          pathname={MARKETPLACE_ROUTES.buyerInbox}
        >
          <DeskRoleGuard role="buyer">
            <BuyerInboxPage />
          </DeskRoleGuard>
        </AuthenticatedShellRoute>
      </Route>
      <Route path={MARKETPLACE_ROUTES.buyerVerification}>
        <AuthenticatedShellRoute
          product="marketplace"
          pathname={MARKETPLACE_ROUTES.buyerVerification}
        >
          <DeskRoleGuard role="buyer">
            <BuyerVerificationPage />
          </DeskRoleGuard>
        </AuthenticatedShellRoute>
      </Route>
      <Route path={MARKETPLACE_ROUTES.buyerProfile}>
        <AuthenticatedShellRoute
          product="marketplace"
          pathname={MARKETPLACE_ROUTES.buyerProfile}
        >
          <DeskRoleGuard role="buyer">
            <BuyerProfilePage />
          </DeskRoleGuard>
        </AuthenticatedShellRoute>
      </Route>
      <Route path={MARKETPLACE_ROUTES.buyer}>
        <AuthenticatedShellRoute
          product="marketplace"
          pathname={MARKETPLACE_ROUTES.buyer}
        >
          <DeskRoleGuard role="buyer">
            <BuyerDashboard />
          </DeskRoleGuard>
        </AuthenticatedShellRoute>
      </Route>

      <Route path={MARKETPLACE_ROUTES.sellerCompanyNew}>
        <AuthenticatedShellRoute
          product="marketplace"
          pathname={MARKETPLACE_ROUTES.sellerCompanyNew}
        >
          <DeskRoleGuard role="founder">
            <SellerAddStartupPage />
          </DeskRoleGuard>
        </AuthenticatedShellRoute>
      </Route>
      <Route path={`${MARKETPLACE_ROUTES.seller}/companies/:slug`}>
        <AuthenticatedShellRoute
          product="marketplace"
          pathname={`${MARKETPLACE_ROUTES.seller}/companies/:slug`}
        >
          <DeskRoleGuard role="founder">
            <SellerCompanyDetailPage />
          </DeskRoleGuard>
        </AuthenticatedShellRoute>
      </Route>
      <Route path={MARKETPLACE_ROUTES.sellerCompanies}>
        <AuthenticatedShellRoute
          product="marketplace"
          pathname={MARKETPLACE_ROUTES.sellerCompanies}
        >
          <DeskRoleGuard role="founder">
            <SellerCompaniesPage />
          </DeskRoleGuard>
        </AuthenticatedShellRoute>
      </Route>
      <Route path={MARKETPLACE_ROUTES.sellerPersonVerification}>
        <AuthenticatedShellRoute
          product="marketplace"
          pathname={MARKETPLACE_ROUTES.sellerPersonVerification}
        >
          <DeskRoleGuard role="founder">
            <SellerPersonVerificationPage />
          </DeskRoleGuard>
        </AuthenticatedShellRoute>
      </Route>
      <Route path={`${MARKETPLACE_ROUTES.seller}/verification/:slug`}>
        <AuthenticatedShellRoute
          product="marketplace"
          pathname={`${MARKETPLACE_ROUTES.seller}/verification/:slug`}
        >
          <DeskRoleGuard role="founder">
            <SellerVerificationDetailRedirect />
          </DeskRoleGuard>
        </AuthenticatedShellRoute>
      </Route>
      <Route path={MARKETPLACE_ROUTES.sellerProfile}>
        <AuthenticatedShellRoute
          product="marketplace"
          pathname={MARKETPLACE_ROUTES.sellerProfile}
        >
          <DeskRoleGuard role="founder">
            <SellerProfilePage />
          </DeskRoleGuard>
        </AuthenticatedShellRoute>
      </Route>
      <Route path="/marketplace/app/seller/inbox/:conversationId">
        <AuthenticatedShellRoute
          product="marketplace"
          pathname="/marketplace/app/seller/inbox/:conversationId"
        >
          <DeskRoleGuard role="founder">
            <SellerInboxConversationPage />
          </DeskRoleGuard>
        </AuthenticatedShellRoute>
      </Route>
      <Route path={MARKETPLACE_ROUTES.sellerOffers}>
        <AuthenticatedShellRoute
          product="marketplace"
          pathname={MARKETPLACE_ROUTES.sellerOffers}
        >
          <DeskRoleGuard role="founder">
            <SellerOffersPage />
          </DeskRoleGuard>
        </AuthenticatedShellRoute>
      </Route>
      <Route path={MARKETPLACE_ROUTES.founderInbox}>
        <AuthenticatedShellRoute
          product="marketplace"
          pathname={MARKETPLACE_ROUTES.founderInbox}
        >
          <DeskRoleGuard role="founder">
            <SellerInboxPage />
          </DeskRoleGuard>
        </AuthenticatedShellRoute>
      </Route>
      <Route path={MARKETPLACE_ROUTES.founderListings}>
        <AuthenticatedShellRoute
          product="marketplace"
          pathname={MARKETPLACE_ROUTES.founderListings}
        >
          <DeskRoleGuard role="founder">
            <SellerListingsPage />
          </DeskRoleGuard>
        </AuthenticatedShellRoute>
      </Route>
      <Route path={MARKETPLACE_ROUTES.founderHub}>
        <AuthenticatedShellRoute
          product="marketplace"
          pathname={MARKETPLACE_ROUTES.founderHub}
        >
          <DeskRoleGuard role="founder">
            <SellerDashboard />
          </DeskRoleGuard>
        </AuthenticatedShellRoute>
      </Route>
      <Route path={MARKETPLACE_ROUTES.buyerDashboard}>
        <AuthenticatedShellRoute
          product="marketplace"
          pathname={MARKETPLACE_ROUTES.buyerDashboard}
        >
          <DeskRoleGuard role="buyer">
            <BuyerDashboard />
          </DeskRoleGuard>
        </AuthenticatedShellRoute>
      </Route>
      <Route path={MARKETPLACE_ROUTES.buyerBrowse}>
        <AuthenticatedShellRoute
          product="marketplace"
          pathname={MARKETPLACE_ROUTES.buyerBrowse}
        >
          <DeskRoleGuard role="buyer">
            <Suspense
              fallback={<RouteLoadingFallback label="Loading browse…" />}
            >
              <LazyAcquirePage />
            </Suspense>
          </DeskRoleGuard>
        </AuthenticatedShellRoute>
      </Route>
      <Route path={`${MARKETPLACE_ROUTES.buyer}/startup/:slug`}>
        <AuthenticatedShellRoute
          product="marketplace"
          pathname={`${MARKETPLACE_ROUTES.buyer}/startup/:slug`}
        >
          <DeskRoleGuard role="buyer">
            <Suspense
              fallback={<RouteLoadingFallback label="Loading listing…" />}
            >
              <LazyStartupDetailPage />
            </Suspense>
          </DeskRoleGuard>
        </AuthenticatedShellRoute>
      </Route>
      <Route path={`${MARKETPLACE_ROUTES.buyer}/founder/:handle`}>
        <AuthenticatedShellRoute
          product="marketplace"
          pathname={`${MARKETPLACE_ROUTES.buyer}/founder/:handle`}
        >
          <DeskRoleGuard role="buyer">
            <FounderProfile />
          </DeskRoleGuard>
        </AuthenticatedShellRoute>
      </Route>
      <Route path={MARKETPLACE_ROUTES.sellerDashboard}>
        <AuthenticatedShellRoute
          product="marketplace"
          pathname={MARKETPLACE_ROUTES.sellerDashboard}
        >
          <DeskRoleGuard role="founder">
            <SellerDashboard />
          </DeskRoleGuard>
        </AuthenticatedShellRoute>
      </Route>
      <Route path={MARKETPLACE_ROUTES.sellerListings}>
        <AuthenticatedShellRoute
          product="marketplace"
          pathname={MARKETPLACE_ROUTES.sellerListings}
        >
          <DeskRoleGuard role="founder">
            <SellerListingsPage />
          </DeskRoleGuard>
        </AuthenticatedShellRoute>
      </Route>
      <Route path={`${MARKETPLACE_ROUTES.seller}/startup/:slug`}>
        <AuthenticatedShellRoute
          product="marketplace"
          pathname={`${MARKETPLACE_ROUTES.seller}/startup/:slug`}
        >
          <DeskRoleGuard role="founder">
            <Suspense
              fallback={<RouteLoadingFallback label="Loading listing…" />}
            >
              <LazyStartupDetailPage />
            </Suspense>
          </DeskRoleGuard>
        </AuthenticatedShellRoute>
      </Route>
      <Route path={MARKETPLACE_ROUTES.sellerInbox}>
        <AuthenticatedShellRoute
          product="marketplace"
          pathname={MARKETPLACE_ROUTES.sellerInbox}
        >
          <DeskRoleGuard role="founder">
            <SellerInboxPage />
          </DeskRoleGuard>
        </AuthenticatedShellRoute>
      </Route>
      <Route path={MARKETPLACE_ROUTES.app}>
        <AuthenticatedShellRoute
          product="marketplace"
          pathname={MARKETPLACE_ROUTES.app}
        >
          <MarketplaceAppEntryPage />
        </AuthenticatedShellRoute>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AddStartupProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AuthProvider>
              <PostHogProvider>
                <ActiveProductProvider>
                  <FounderOsProvider>
                    <DemoMarketplaceShellGuard />
                    <ProductShellEnforcer />
                    <ScrollToTop />
                    <Router />
                    <Suspense fallback={null}>
                      <LazyFounderOsFlowDialog />
                    </Suspense>
                    <Toaster />
                  </FounderOsProvider>
                </ActiveProductProvider>
              </PostHogProvider>
            </AuthProvider>
          </WouterRouter>
        </TooltipProvider>
      </AddStartupProvider>
    </QueryClientProvider>
  );
}

export default App;
