import type {
  PatientRecord,
  MaternityPatient,
  SmsReminder,
  EmergencyAlert,
  Secourist,
} from "@/types/medical";

export interface StoredUser {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: "medecin" | "patient";
  dossierNumber?: string;
  createdAt: string;
}

const db = {
  users: [] as StoredUser[],
  patients: [] as PatientRecord[],
  maternityPatients: [] as MaternityPatient[],
  smsReminders: [] as SmsReminder[],
  emergencyAlerts: [] as EmergencyAlert[],
  secourists: [] as Secourist[],
};

export function getDb() {
  return db;
}

export function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

function simpleHash(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36) + password.length.toString(36);
}

export function hashPassword(password: string): string {
  return simpleHash(password);
}

export function verifyPassword(password: string, hash: string): boolean {
  return simpleHash(password) === hash;
}

export function createToken(user: StoredUser): string {
  const payload = {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    phone: user.phone,
    dossierNumber: user.dossierNumber,
  };
  return Buffer.from(JSON.stringify(payload)).toString("base64");
}
