import Link from "next/link";
import { secondaryButton } from "@/components/admin/ui";

export default function AdminNotFound() {
  return (
    <div className="py-16 text-center">
      <h1 className="text-2xl font-bold tracking-tight text-ink-950">Request not found</h1>
      <p className="mt-2 text-ink-500">It may have been removed, or the link is incomplete.</p>
      <Link href="/desk" className={`${secondaryButton} mt-6`}>
        Back to quote requests
      </Link>
    </div>
  );
}
