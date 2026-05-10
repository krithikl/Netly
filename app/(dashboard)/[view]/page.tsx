import { notFound } from "next/navigation";
import { getRoutedViewSegments, getViewForRouteSegment } from "@/lib/app/routes";

type RoutedViewPageProps = {
  params: Promise<{
    view: string;
  }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return getRoutedViewSegments().map((view) => ({ view }));
}

export default async function RoutedViewPage({ params }: RoutedViewPageProps) {
  const { view } = await params;

  if (!getViewForRouteSegment(view)) {
    notFound();
  }

  return null;
}
