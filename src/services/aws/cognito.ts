// Amazon Cognito authentication adapter.
// Demo mode keeps a local session; swap `signIn`/`signUp` bodies for the Cognito
// InitiateAuth / SignUp calls (e.g. via amazon-cognito-identity-js or Amplify Auth).
import { awsConfig } from "./config";

export interface SessionUser {
  name: string;
  email: string;
  role: string;
  organisation: string;
  initials: string;
}

const KEY = "bq.session";

export async function signIn(email: string, _password: string): Promise<SessionUser> {
  if (awsConfig.enabled) {
    throw new Error("Cognito sign-in not wired yet: implement InitiateAuth (USER_PASSWORD_AUTH or SRP) here.");
  }
  const local = email.split("@")[0].replace(/[._-]+/g, " ");
  const name = local.replace(/\b\w/g, (c) => c.toUpperCase()) || "Demo User";
  const user: SessionUser = { name, email, role: "Quality Manager", organisation: "Demo Cosmetics Ltd", initials: initials(name) };
  localStorage.setItem(KEY, JSON.stringify(user));
  return user;
}

export async function signUp(input: { name: string; email: string; organisation: string; role: string }): Promise<SessionUser> {
  if (awsConfig.enabled) {
    throw new Error("Cognito sign-up not wired yet: implement SignUp + ConfirmSignUp here.");
  }
  const user: SessionUser = { ...input, initials: initials(input.name) };
  localStorage.setItem(KEY, JSON.stringify(user));
  return user;
}

export function demoUser(): SessionUser {
  const user: SessionUser = { name: "Adaeze Okafor", email: "demo@blendquoin.top", role: "Quality Manager", organisation: "Demo Cosmetics Ltd", initials: "AO" };
  localStorage.setItem(KEY, JSON.stringify(user));
  return user;
}

export function currentUser(): SessionUser | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SessionUser) : null;
  } catch {
    return null;
  }
}

export function signOut() {
  localStorage.removeItem(KEY);
}

export async function getIdToken(): Promise<string | null> {
  return null; // Return the Cognito ID token once wired.
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");
}
