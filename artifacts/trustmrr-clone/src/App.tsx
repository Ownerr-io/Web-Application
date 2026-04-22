import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/Layout";
import NotFound from "@/pages/not-found";

// Import pages (we will create these)
import Home from "@/pages/home";
import Acquire from "@/pages/acquire";
import Feed from "@/pages/feed";
import Stats from "@/pages/stats";
import Cofounders from "@/pages/cofounders";
import Game from "@/pages/game";
import StartupDetail from "@/pages/startup-detail";
import FounderProfile from "@/pages/founder-profile";

import { applyTheme, getInitialTheme } from "@/components/ThemeToggle";

if (typeof document !== 'undefined') {
  applyTheme(getInitialTheme());
}

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/acquire" component={Acquire} />
      <Route path="/feed" component={Feed} />
      <Route path="/stats" component={Stats} />
      <Route path="/cofounders" component={Cofounders} />
      <Route path="/game" component={Game} />
      <Route path="/startup/:slug" component={StartupDetail} />
      <Route path="/founder/:handle" component={FounderProfile} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Layout>
            <Router />
          </Layout>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;