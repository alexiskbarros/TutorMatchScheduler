import { EmailPreviewModal } from '../EmailPreviewModal';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export default function EmailPreviewModalExample() {
  const [open, setOpen] = useState(true);

  const handleConfirm = (sendCopy: boolean) => {
    console.log('Sending email, send copy:', sendCopy);
  };

  return (
    <div className="p-4">
      <Button onClick={() => setOpen(true)} data-testid="button-open-modal">
        Open Email Preview
      </Button>
      <EmailPreviewModal
        open={open}
        onOpenChange={setOpen}
        recipients={[
          { name: 'Sarah Johnson', email: 'sarah.johnson@mtroyal.ca', role: 'Peer' },
          { name: 'Alex Chen', email: 'alex.chen@mtroyal.ca', role: 'Learner' },
          { name: 'Emma Wilson', email: 'emma.wilson@mtroyal.ca', role: 'Learner' }
        ]}
        course="MATH 1505 - Calculus I"
        timeSlot="Monday 2:00 PM - 3:00 PM"
        onConfirm={handleConfirm}
      />
    </div>
  );
}
