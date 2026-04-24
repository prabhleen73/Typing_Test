import { useEffect } from "react";
import { useRouter } from "next/router";

export default function IndexPage() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;

    router.replace("/login");
  }, [router]);

  return null;
}
