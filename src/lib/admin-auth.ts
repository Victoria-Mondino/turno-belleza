import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "admin_session";
const SESSION_VALUE = "admin";

function sign(value: string): string {
  const secret = process.env.ADMIN_SESSION_SECRET || "dev-secret-cambiar-en-produccion";
  return createHmac("sha256", secret).update(value).digest("hex");
}

export async function createAdminSession(): Promise<void> {
  const sig = sign(SESSION_VALUE);
  const store = await cookies();
  store.set(COOKIE_NAME, `${SESSION_VALUE}.${sig}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export async function destroyAdminSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  if (!raw) return false;
  const [value, sig] = raw.split(".");
  if (!value || !sig) return false;
  const expected = sign(value);
  try {
    return value === SESSION_VALUE && timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}
