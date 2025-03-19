import { getServerSession as getSession } from "next-auth";
import { authOptions } from "@/lib/auth.config";

export async function getServerSession() {
  return await getSession(authOptions);
}
