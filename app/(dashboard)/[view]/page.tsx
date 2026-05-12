import { notFound } from "next/navigation";
import { getRoutedViewSegments, getViewForRouteSegment } from "@/lib/app/routes";

type RoutedViewPageProps = {
  params: Promise<{
    view: string;
  }>;
};

export const dynamicParams = false;

// Prebuild the supported vanity routes such as /transactions and /card-fit.
export function generateStaticParams() {
  return getRoutedViewSegments().map((view) => ({ view }));
}

// Validates routed views while AppShell handles the actual client-side rendering.
export default async function RoutedViewPage({ params }: RoutedViewPageProps) {
  const { view } = await params;

  if (!getViewForRouteSegment(view)) {
    notFound();
  }

  return null;
}
