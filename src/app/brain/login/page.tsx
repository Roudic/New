import { redirect } from "next/navigation";
import { BRAIN_LOGIN_ENABLED } from "@/lib/second-brain/brain-login";
import BrainLoginForm from "./BrainLoginForm";

export default function BrainLoginPage() {
  if (!BRAIN_LOGIN_ENABLED) {
    redirect("/brain");
  }
  return <BrainLoginForm />;
}
