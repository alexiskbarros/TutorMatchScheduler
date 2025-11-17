import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const { toast } = useToast();

  const handleSave = () => {
    console.log('Saving settings');
    toast({
      title: "Settings Saved",
      description: "Your preferences have been updated successfully.",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold" data-testid="text-page-title">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure system preferences and data source connections
        </p>
      </div>

      <div className="max-w-2xl space-y-6">
        <Card data-testid="card-data-source">
          <CardHeader>
            <CardTitle>Data Source</CardTitle>
            <CardDescription>
              Configure Google Sheets integration for participant data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sheet-url">Google Sheet URL</Label>
              <Input
                id="sheet-url"
                placeholder="https://docs.google.com/spreadsheets/d/..."
                data-testid="input-sheet-url"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="service-account">Service Account Email</Label>
              <Input
                id="service-account"
                placeholder="service-account@project.iam.gserviceaccount.com"
                data-testid="input-service-account"
              />
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-matching-constraints">
          <CardHeader>
            <CardTitle>Matching Constraints</CardTitle>
            <CardDescription>
              Configure time windows and matching rules
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-time">Availability Start Time</Label>
                <Input
                  id="start-time"
                  type="time"
                  defaultValue="08:00"
                  data-testid="input-start-time"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-time">Availability End Time</Label>
                <Input
                  id="end-time"
                  type="time"
                  defaultValue="20:00"
                  data-testid="input-end-time"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="travel-buffer">Travel Buffer (minutes)</Label>
              <Input
                id="travel-buffer"
                type="number"
                defaultValue="5"
                min="0"
                data-testid="input-travel-buffer"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max-group-size">Maximum Group Size</Label>
              <Input
                id="max-group-size"
                type="number"
                defaultValue="4"
                min="1"
                max="10"
                data-testid="input-max-group-size"
              />
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-email-settings">
          <CardHeader>
            <CardTitle>Email Notifications</CardTitle>
            <CardDescription>
              Configure email service for group notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="from-email">From Email Address</Label>
              <Input
                id="from-email"
                type="email"
                placeholder="noreply@mtroyal.ca"
                data-testid="input-from-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-email">Administrator Email (for copies)</Label>
              <Input
                id="admin-email"
                type="email"
                placeholder="admin@mtroyal.ca"
                data-testid="input-admin-email"
              />
            </div>
          </CardContent>
        </Card>

        <Separator />

        <div className="flex justify-end gap-2">
          <Button variant="outline" data-testid="button-cancel-settings">
            Cancel
          </Button>
          <Button onClick={handleSave} data-testid="button-save-settings">
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
