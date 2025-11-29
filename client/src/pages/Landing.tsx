import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calendar, CheckCircle, ArrowRight } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            <span className="font-semibold text-lg">Volunteer Matching System</span>
          </div>
          <Button asChild data-testid="button-login">
            <a href="/api/login">
              Sign In
              <ArrowRight className="h-4 w-4 ml-2" />
            </a>
          </Button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Semester Volunteer Matching System
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Automate the matching of students seeking academic help with qualified Learning Peers 
            based on course requirements, instructor preferences, and schedule availability.
          </p>
          
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <Card>
              <CardHeader>
                <Calendar className="h-10 w-10 text-primary mb-2 mx-auto" />
                <CardTitle className="text-lg">Smart Scheduling</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Automatically detects schedule conflicts and finds optimal meeting times 
                  with travel buffers.
                </CardDescription>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <Users className="h-10 w-10 text-primary mb-2 mx-auto" />
                <CardTitle className="text-lg">Group Optimization</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Creates balanced groups of 2-4 learners per peer, maximizing match rates 
                  while respecting constraints.
                </CardDescription>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CheckCircle className="h-10 w-10 text-primary mb-2 mx-auto" />
                <CardTitle className="text-lg">Admin Review</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Review proposed matches, approve or reject groups, and manually adjust 
                  placements as needed.
                </CardDescription>
              </CardContent>
            </Card>
          </div>

          <Button size="lg" asChild data-testid="button-get-started">
            <a href="/api/login">
              Sign In to Get Started
              <ArrowRight className="h-5 w-5 ml-2" />
            </a>
          </Button>
          
          <p className="text-sm text-muted-foreground mt-6">
            Mount Royal University Administration Tool
          </p>
        </div>
      </main>
    </div>
  );
}
