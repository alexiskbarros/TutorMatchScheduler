import { google } from 'googleapis';
import type {
  LearnerRequest,
  LearningPeer,
  ClassSchedule,
  TimeSlot,
} from '@shared/schema';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
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
  return accessToken;
}

async function getGoogleSheetClient() {
  const accessToken = await getAccessToken();

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
    range: 'Requests!A:I',
  });
  
  const rows = response.data.values || [];
  if (rows.length === 0) {
    return [];
  }
  
  const [header, ...dataRows] = rows;
  const requests: LearnerRequest[] = [];
  
  console.log('Requests Sheet - Header row:', header);
  console.log('Requests Sheet - First 3 data rows:', dataRows.slice(0, 3));
  
  for (const row of dataRows) {
    const email = (row[1] || '').trim();
    
    // Skip test data
    if (email === 'chickey@test') {
      continue;
    }
    
    if (!email) {
      continue;
    }
    
    requests.push({
      timestamp: (row[0] || '').trim(),
      email,
      firstName: (row[2] || '').trim(),
      lastName: (row[3] || '').trim(),
      courseCode: (row[4] || '').trim(),
      instructor: (row[5] || '').trim(),
      instructorMatchRequired: (row[6] || '').trim().toUpperCase() === 'Y',
      sectionNumber: (row[7] || '').trim() || undefined,
    });
  }
  
  return requests;
}

export async function loadLearningPeers(): Promise<LearningPeer[]> {
  const sheets = await getGoogleSheetClient();
  
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Learning Peers!A:K',
  });
  
  const rows = response.data.values || [];
  if (rows.length === 0) {
    return [];
  }
  
  const [header, ...dataRows] = rows;
  const peers: LearningPeer[] = [];
  
  console.log('Learning Peers Sheet - Header row:', header);
  console.log('Learning Peers Sheet - First 3 data rows:', dataRows.slice(0, 3));
  
  for (const row of dataRows) {
    const email = (row[0] || '').trim();
    
    // Skip test data
    if (email === 'chickey@test') {
      continue;
    }
    
    if (!email) {
      continue;
    }
    
    const otherCourses = parseOtherCourses(row[9] || '');
    
    peers.push({
      email,
      preferredName: (row[1] || '').trim(),
      lastName: (row[2] || '').trim(),
      groups: parseInt(row[3] || '0', 10) || 0,
      courseCode1: (row[4] || '').trim() || undefined,
      instructor1: (row[5] || '').trim() || undefined,
      courseCode2: (row[6] || '').trim() || undefined,
      instructor2: (row[7] || '').trim() || undefined,
      courseCode3: (row[8] || '').trim() || undefined,
      instructor3: (row[9] || '').trim() || undefined,
      otherCourses,
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
