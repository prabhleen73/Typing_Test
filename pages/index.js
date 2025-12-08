import dynamic from "next/dynamic";
import HomePage from "../components/HomePage";

// ✅ Disable SSR for the entire home page
const NoSSRHome = dynamic(() => Promise.resolve(HomePage), {
  ssr: false,
});

export default function IndexPage() {
  return <NoSSRHome />;
}
