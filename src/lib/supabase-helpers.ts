import { supabase } from "@/integrations/supabase/client";

export async function getUserRole(userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .single();
  return data?.role ?? null;
}

export async function setUserRole(userId: string, role: "tenant" | "landlord" | "agent" | "admin") {
  const { error } = await supabase
    .from("user_roles")
    .insert({ user_id: userId, role });
  if (error) throw error;
}

export function getAffordability(rentPcm: number, annualIncome: number) {
  const ratio = rentPcm / (annualIncome / 12);
  if (ratio <= 0.35) return { status: "PASS" as const, ratio, message: "Rent is affordable" };
  if (ratio <= 0.45) return { status: "WARN" as const, ratio, message: "Rent is moderately high relative to income" };
  return { status: "FAIL" as const, ratio, message: "Rent exceeds recommended income ratio" };
}
