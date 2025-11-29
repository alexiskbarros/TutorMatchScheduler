import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, Loader2 } from "lucide-react";
import Dashboard from "@/pages/Dashboard";
import RunMatching from "@/pages/RunMatching";
import ReviewGroups from "@/pages/ReviewGroups";
import Matched from "@/pages/Matched";
import Unmatched from "@/pages/Unmatched";
import PeersWithoutGroups from "@/pages/PeersWithoutGroups";
import Settings from "@/pages/Settings";
import Landing from "@/pages/Landing";
import NotFound from "@/pages/not-found";

function AuthenticatedRouter() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/run-matching" component={RunMatching} />
      <Route path="/review-groups" component={ReviewGroups} />
      <Route path="/matched" component={Matched} />
      <Route path="/unmatched" component={Unmatched} />
      <Route path="/peers-without-groups" component={PeersWithoutGroups} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function MainApp() {
  const { user, isLoading, isAuthenticated } = useAuth();

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Landing />;
  }

  const userInitials = user?.firstName && user?.lastName
    ? `${user.firstName[0]}${user.lastName[0]}`
    : user?.email?.[0]?.toUpperCase() || "U";

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between gap-4 p-4 border-b">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground hidden sm:block">
                {user?.email || "Admin"}
              </span>
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.profileImageUrl || undefined} />
                <AvatarFallback className="text-xs">{userInitials}</AvatarFallback>
              </Avatar>
              <Button 
                variant="ghost" 
                size="icon" 
                asChild
                data-testid="button-logout"
              >
                <a href="/api/logout" title="Sign Out">
                  <LogOut className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-6">
            <AuthenticatedRouter />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <MainApp />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
