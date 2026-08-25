import { listServices } from "@/lib/store";
import { HomeClient } from "./home-client";

export default async function Home() {
  const services = (await listServices()).filter((s) => s.active);
  return <HomeClient services={services} />;
}
