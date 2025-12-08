import dynamic from "next/dynamic";
import HomePage from "../components/HomePage";

function IndexPage() {
  return <HomePage />;
}

export default dynamic(() => Promise.resolve(IndexPage), {
  ssr: false,
});
