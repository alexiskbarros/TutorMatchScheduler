import type { ProposedGroup } from "@shared/schema";

function formatTimeSlot(group: ProposedGroup, peerGroupNumber: number): string {
  const dayMap: Record<string, string> = {
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
  };
  
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };
  
  return `${dayMap[group.timeSlot.day]} ${formatTime(group.timeSlot.start)} - ${formatTime(group.timeSlot.end)}`;
}

export function generateMatchConfirmationEmail(
  group: ProposedGroup,
  peerGroupNumber: number
): { subject: string; body: string } {
  const learnerNames = group.learners.map(l => l.name).join(', ');
  const meetingTime = formatTimeSlot(group, peerGroupNumber);
  
  const body = `Hi All,

I am happy to confirm that you will be working together to review content from ${group.courseCode} this semester! 

Learning Peer (LP): ${group.peerName}
Potential meetings times (based on course schedules): ${meetingTime}
Refer to this group as: ${group.courseCode} - ${group.peerName} - Group ${peerGroupNumber}
Follow up with your Learner(s) within two business days to arrange your first meeting
Log your first meeting on Google Calendar 
Reoccurring invites will auto-generate when you complete the PLP Agreement
Learner(s): ${learnerNames}
Your LP will email you within two business days from receiving this email  
Please respond ASAP (no later than two business days)
Bring a copy of your course outline and class schedule to your first session
Your LP will create a Google Calendar invite for the first meeting
Please email PLP@mtroyal.ca if you no longer require support or have questions
The First Meeting:
First meetings are 60 minutes 
Use the First Meeting Checklist to guide your session
Take time to get to know each other, review the PLP Agreement, and set expectations, goals, and regular meeting times
Other Reminders:
Sessions should take place Monday to Friday between 8:00 AM - 8:00 PM  If necessary sessions can be held on the weekend ONLINE only.     
Please email PLP@mtroyal.ca to approve alternate times
PLP runs until the last day of classes 
Please notify your LP and PLP staff if you need to withdraw from PLP
If you have questions at any time, please do not hesitate to reach out.

Have a fantastic semester!

-The Peer Learning Team`;

  const subject = `${group.courseCode} - ${group.peerName} Group ${peerGroupNumber}`;

  return { subject, body };
}
