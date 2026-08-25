import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { listBookings, listServices } from "@/lib/store";
import { AdminClient } from "./admin-client";

export default async function AdminPage() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }
  const [bookings, services] = await Promise.all([listBookings(), listServices()]);
  return <AdminClient bookings={bookings} services={services} />;
}
