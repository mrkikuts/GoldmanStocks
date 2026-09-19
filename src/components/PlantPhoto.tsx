import { useQuery } from "@tanstack/react-query";

import { getPlantPhotoUrl } from "@/lib/plants.functions";

/** The picture taken when the plant was registered — renders nothing if there isn't one. */
export function PlantPhoto({
  plantId,
  className,
}: {
  plantId: string;
  className?: string;
}) {
  const photo = useQuery({
    queryKey: ["plant-photo", plantId],
    queryFn: () => getPlantPhotoUrl({ data: plantId }),
    staleTime: 30 * 60 * 1000, // signed URLs last an hour
  });
  if (!photo.data) return null;
  return (
    <img
      src={photo.data}
      alt=""
      className={`w-full rounded-lg object-cover ${className ?? "h-44"}`}
    />
  );
}
