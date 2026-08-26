import { SessionClient } from "./SessionClient";

export default function L10SessionPage({ params }: { params: { id: string } }) {
  return <SessionClient sessionId={params.id} />;
}
