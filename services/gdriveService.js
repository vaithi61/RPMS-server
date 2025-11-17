import { google } from 'googleapis';
import { Readable } from 'stream';
import path from 'path';

const DRIVE_SCOPES = ['https://www.googleapis.com/auth/drive.file'];

function getServiceAccountAuth() {
  const { GOOGLE_SERVICE_ACCOUNT_JSON, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_SERVICE_ACCOUNT_KEY_FILE, GOOGLE_APPLICATION_CREDENTIALS } = process.env;

  // Preferred: JSON string in env
  if (GOOGLE_SERVICE_ACCOUNT_JSON) {
    const creds = JSON.parse(GOOGLE_SERVICE_ACCOUNT_JSON);
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: creds.client_email,
        private_key: creds.private_key,
      },
      scopes: DRIVE_SCOPES,
    });
    return auth;
  }

  // Key file path via env (preferred for production VMs/containers)
  const keyFile = GOOGLE_SERVICE_ACCOUNT_KEY_FILE || GOOGLE_APPLICATION_CREDENTIALS;
  if (keyFile) {
    const keyFilePath = path.resolve(keyFile);
    const auth = new google.auth.GoogleAuth({ keyFile: keyFilePath, scopes: DRIVE_SCOPES });
    return auth;
  }

  // Alternative: explicit email + private key in env
  if (GOOGLE_SERVICE_ACCOUNT_EMAIL && GOOGLE_PRIVATE_KEY) {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
        // Handle escaped newlines in env vars
        private_key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      scopes: DRIVE_SCOPES,
    });
    return auth;
  }

  // Fallback to legacy OAuth2 if service account creds not provided
  const { GDRIVE_CLIENT_ID, GDRIVE_CLIENT_SECRET, GDRIVE_REFRESH_TOKEN } = process.env;
  const oAuth2Client = new google.auth.OAuth2(GDRIVE_CLIENT_ID, GDRIVE_CLIENT_SECRET);
  oAuth2Client.setCredentials({ refresh_token: GDRIVE_REFRESH_TOKEN });
  return oAuth2Client;
}

export async function uploadToDrive({ name, mimeType, body, parents }) {
  const parentFolder = process.env.DRIVE_PARENT_FOLDER_ID || process.env.GDRIVE_FOLDER_ID;
  const parentsArray = parents || (parentFolder ? [parentFolder] : undefined);

  const auth = getServiceAccountAuth();
  const drive = google.drive({ version: 'v3', auth });
  // googleapis expects a stream; if a Buffer is provided, convert to Readable stream
  const mediaBody = Buffer.isBuffer(body) ? Readable.from(body) : body;
  const res = await drive.files.create({
    requestBody: { name, parents: parentsArray },
    media: { mimeType, body: mediaBody },
    fields: 'id, webViewLink, name, mimeType, size',
    supportsAllDrives: true,
  });
  return res.data;
}

export async function getDriveFile(fileId) {
  const auth = getServiceAccountAuth();
  const drive = google.drive({ version: 'v3', auth });
  const res = await drive.files.get({ fileId, alt: 'media', supportsAllDrives: true }, { responseType: 'stream' });
  return res.data; // stream
}
