import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

interface EmailPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipients: Array<{ name: string; email: string; role: 'Learner' | 'Peer' }>;
  course: string;
  timeSlot: string;
  onConfirm: (sendCopy: boolean) => void;
}

export function EmailPreviewModal({
  open,
  onOpenChange,
  recipients,
  course,
  timeSlot,
  onConfirm
}: EmailPreviewModalProps) {
  const [sendCopy, setSendCopy] = useState(false);

  const handleConfirm = () => {
    onConfirm(sendCopy);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" data-testid="modal-email-preview">
        <DialogHeader>
          <DialogTitle>Email Preview</DialogTitle>
          <DialogDescription>
            Review the email notification before sending to all participants
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Recipients
            </p>
            <div className="flex flex-wrap gap-2">
              {recipients.map((recipient, idx) => (
                <Badge
                  key={idx}
                  variant={recipient.role === 'Peer' ? 'default' : 'secondary'}
                  data-testid={`badge-recipient-${idx}`}
                >
                  {recipient.name} ({recipient.role})
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Subject
            </p>
            <p className="text-sm font-mono bg-muted p-3 rounded-md" data-testid="text-email-subject">
              Study Group Confirmation - {course}
            </p>
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Message
            </p>
            <div className="bg-muted p-4 rounded-md space-y-3 text-sm" data-testid="text-email-body">
              <p>Dear Study Group Participants,</p>
              <p>
                Your study group for <strong>{course}</strong> has been confirmed!
              </p>
              <div className="bg-background p-3 rounded border">
                <p className="font-semibold mb-2">Session Details:</p>
                <ul className="space-y-1 text-sm">
                  <li><strong>Course:</strong> {course}</li>
                  <li><strong>Time:</strong> {timeSlot}</li>
                  <li><strong>Duration:</strong> 1 hour weekly (recurring for the semester)</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold mb-2">Group Members:</p>
                <ul className="space-y-1">
                  {recipients.map((recipient, idx) => (
                    <li key={idx}>
                      {recipient.name} - <em>{recipient.role}</em> ({recipient.email})
                    </li>
                  ))}
                </ul>
              </div>
              <p>
                Please coordinate with your group to confirm the meeting location.
              </p>
              <p className="text-muted-foreground">
                Best regards,<br />
                Mount Royal University Learning Support Team
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="send-copy"
              checked={sendCopy}
              onCheckedChange={(checked) => setSendCopy(checked as boolean)}
              data-testid="checkbox-send-copy"
            />
            <Label htmlFor="send-copy" className="text-sm cursor-pointer">
              Send me a copy of this email
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-email">
            Cancel
          </Button>
          <Button onClick={handleConfirm} data-testid="button-confirm-send-email">
            Confirm & Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
