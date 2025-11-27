import { google } from 'googleapis';
import type {
  LearnerRequest,
  LearningPeer,
  ClassSchedule,
  TimeSlot,
} from '@shared/schema';

// WARNING: Never cache this client.
// Access tokens expire, so a new client must be created each time.
// Always call this function again to get a fresh client.
async function getGoogleSheetClient() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  const connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-sheet',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Google Sheet not connected');
  }

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.sheets({ version: 'v4', auth: oauth2Client });
}

const SPREADSHEET_ID = '1pNHzIYH58a7zPTjexSQW6eGibYJGQYk5Yfv1pdNYdW8';

// Parse time slot string like "0830-0950" to TimeSlot object
function parseTimeSlot(slot: string): TimeSlot {
  const cleaned = slot.trim();
  const [start, end] = cleaned.split('-');
  
  if (!start || !end || start.length !== 4 || end.length !== 4) {
    throw new Error(`Invalid time slot format: ${slot}`);
  }
  
  return {
    start: `${start.slice(0, 2)}:${start.slice(2)}`,
    end: `${end.slice(0, 2)}:${end.slice(2)}`,
  };
}

// Parse schedule field like "0830-0950; 1000-1120" into array of TimeSlots
function parseScheduleField(field: string): TimeSlot[] {
  if (!field || field.trim() === '') {
    return [];
  }
  
  return field
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0)
    .map(parseTimeSlot);
}

// Parse "Other Courses" field, stripping grade letters
function parseOtherCourses(field: string): Array<{ courseCode: string; instructor: string }> {
  if (!field || field.trim() === '') {
    return [];
  }
  
  const courses: Array<{ courseCode: string; instructor: string }> = [];
  const entries = field.split(',').map(s => s.trim()).filter(s => s.length > 0);
  
  for (const entry of entries) {
    // Remove grade letters like (A), (A-), (B+), etc.
    const cleaned = entry.replace(/\s*\([A-F][+-]?\)/gi, '').trim();
    
    // Expected format: "COURSE CODE - Instructor Name"
    const parts = cleaned.split('-').map(p => p.trim());
    if (parts.length >= 2) {
      courses.push({
        courseCode: parts[0],
        instructor: parts.slice(1).join('-'), // Handle instructor names with hyphens
      });
    }
  }
  
  return courses;
}

export async function loadRequests(): Promise<LearnerRequest[]> {
  const sheets = await getGoogleSheetClient();
  
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Requests!A:V', // Extended to column V to include Section Number at column 21
  });
  
  const rows = response.data.values || [];
  if (rows.length === 0) {
    return [];
  }
  
  const [header, ...dataRows] = rows;
  const requests: LearnerRequest[] = [];
  
  for (const row of dataRows) {
    const email = (row[7] || '').trim(); // Column 8 in Excel = index 7
    
    // Skip test data
    if (email === 'chickey@test') {
      continue;
    }
    
    if (!email) {
      continue;
    }
    
    requests.push({
      timestamp: (row[6] || '').trim(),     // Column 7 = index 6
      email,                                  // Column 8 = index 7
      firstName: (row[8] || '').trim(),      // Column 9 = index 8
      lastName: (row[11] || '').trim(),      // Column 12 = index 11
      courseCode: (row[16] || '').trim(),    // Column 17 = index 16
      instructor: (row[17] || '').trim(),    // Column 18 = index 17
      instructorMatchRequired: (row[18] || '').trim().toUpperCase() === 'Y', // Column 19 = index 18
      sectionNumber: (row[21] || '').trim() || undefined, // Column 22 = index 21
    });
  }
  
  return requests;
}

export async function loadLearningPeers(): Promise<LearningPeer[]> {
  const sheets = await getGoogleSheetClient();
  
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Learning Peers!A:Q', // Extended to column Q to include "Other Courses"
  });
  
  const rows = response.data.values || [];
  if (rows.length === 0) {
    return [];
  }
  
  const [header, ...dataRows] = rows;
  const peers: LearningPeer[] = [];
  
  for (const row of dataRows) {
    const email = (row[1] || '').trim(); // Column 2 in Excel = index 1
    
    // Skip test data
    if (email === 'chickey@test') {
      continue;
    }
    
    if (!email) {
      continue;
    }
    
    const otherCourses = parseOtherCourses(row[15] || ''); // Column 16 = index 15
    
    peers.push({
      email,                                     // Column 2 = index 1
      preferredName: (row[4] || '').trim(),     // Column 5 (Preferred Name) = index 4
      lastName: (row[5] || '').trim(),          // Column 6 = index 5
      groups: parseInt(row[8] || '0', 10) || 0, // Column 9 = index 8
      courseCode1: (row[9] || '').trim() || undefined,  // Column 10 = index 9
      instructor1: (row[10] || '').trim() || undefined, // Column 11 = index 10
      courseCode2: (row[11] || '').trim() || undefined, // Column 12 = index 11
      instructor2: (row[12] || '').trim() || undefined, // Column 13 = index 12
      courseCode3: (row[13] || '').trim() || undefined, // Column 14 = index 13
      instructor3: (row[14] || '').trim() || undefined, // Column 15 = index 14
      otherCourses,                             // Column 16 = index 15
    });
  }
  
  return peers;
}

export async function loadVolunteerSchedules(): Promise<ClassSchedule[]> {
  const sheets = await getGoogleSheetClient();
  
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Volunteer Class Schedule!A:G',
  });
  
  const rows = response.data.values || [];
  if (rows.length === 0) {
    return [];
  }
  
  const [header, ...dataRows] = rows;
  const schedules: ClassSchedule[] = [];
  
  for (const row of dataRows) {
    const email = (row[0] || '').trim();
    
    // Skip test data
    if (email === 'chickey@test') {
      continue;
    }
    
    if (!email) {
      continue;
    }
    
    schedules.push({
      email,
      firstName: (row[1] || '').trim(),
      monday: parseScheduleField(row[2] || ''),
      tuesday: parseScheduleField(row[3] || ''),
      wednesday: parseScheduleField(row[4] || ''),
      thursday: parseScheduleField(row[5] || ''),
      friday: parseScheduleField(row[6] || ''),
    });
  }
  
  return schedules;
}

export async function loadLearnerSchedules(): Promise<ClassSchedule[]> {
  const sheets = await getGoogleSheetClient();
  
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Learner Class Schedule!A:G',
  });
  
  const rows = response.data.values || [];
  if (rows.length === 0) {
    return [];
  }
  
  const [header, ...dataRows] = rows;
  const schedules: ClassSchedule[] = [];
  
  for (const row of dataRows) {
    const email = (row[0] || '').trim();
    
    // Skip test data
    if (email === 'chickey@test') {
      continue;
    }
    
    if (!email) {
      continue;
    }
    
    schedules.push({
      email,
      firstName: (row[1] || '').trim(),
      monday: parseScheduleField(row[2] || ''),
      tuesday: parseScheduleField(row[3] || ''),
      wednesday: parseScheduleField(row[4] || ''),
      thursday: parseScheduleField(row[5] || ''),
      friday: parseScheduleField(row[6] || ''),
    });
  }
  
  return schedules;
}
