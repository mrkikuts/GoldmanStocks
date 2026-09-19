import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";

import type {
  LocationPickerProps,
  SiteMapProps,
  SitesMapProps,
} from "./LeafletMap";

/**
 * Map components, safe to use anywhere: Leaflet only works in a browser, so the real module
 * is loaded lazily on the client and a same-sized skeleton renders on the server and while it
 * loads.
 */
const leaflet = () => import("./LeafletMap");
const LazySitesMap = lazy(() =>
  leaflet().then((m) => ({ default: m.SitesMap })),
);
const LazySiteMap = lazy(() => leaflet().then((m) => ({ default: m.SiteMap })));
const LazyLocationPicker = lazy(() =>
  leaflet().then((m) => ({ default: m.LocationPicker })),
);

function Placeholder({
  height = 420,
  className,
}: {
  height?: number | undefined;
  className?: string | undefined;
}) {
  return (
    <Skeleton
      className={`w-full rounded-xl ${className ?? ""}`}
      style={{ height }}
    />
  );
}

function clientOnly<
  P extends { height?: number | undefined; className?: string | undefined },
>(Component: React.ComponentType<P>) {
  return function MapOnClient(props: P) {
    const fallback = (
      <Placeholder height={props.height} className={props.className} />
    );
    return (
      <ClientOnly fallback={fallback}>
        <Suspense fallback={fallback}>
          <Component {...props} />
        </Suspense>
      </ClientOnly>
    );
  };
}

/** Every work site on a street/satellite map; optionally drag to move or click to place. */
export const SitesMap = clientOnly<SitesMapProps>(LazySitesMap);
/** One site with its plants, coloured by status. */
export const SiteMap = clientOnly<SiteMapProps>(LazySiteMap);
/** Pick a single spot: click the map or drag the pin. */
export const LocationPicker =
  clientOnly<LocationPickerProps>(LazyLocationPicker);
