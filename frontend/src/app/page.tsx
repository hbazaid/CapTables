import dynamic from "next/dynamic";

const CapTableDashboard = dynamic(() => import("@/components/CapTableDashboard"), {
  ssr: false,
});

export default function Home() {
  return <CapTableDashboard />;
}
