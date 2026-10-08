import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { addDays, isoDate, startOfWeek } from '@/lib/dates';
import i18n from '@/lib/i18n';
import type { Database } from '@/lib/database.types';

type Tables = Database['public']['Tables'];
type ProjectRow = Tables['projects']['Row'];
type PlantRow = Tables['plants']['Row'];
type TaskRow = Tables['tasks']['Row'];

export type WorkerProfile = { full_name: string };
export type Site = Pick<
  ProjectRow,
  'id' | 'name' | 'city' | 'address' | 'lat' | 'lng' | 'zones' | 'status'
>;
export type Plant = Pick<
  PlantRow,
  | 'id'
  | 'project_id'
  | 'common'
  | 'species'
  | 'status'
  | 'site'
  | 'next_task'
  | 'next_care'
  | 'lat'
  | 'lng'
>;
export type Job = Pick<
  TaskRow,
  | 'id'
  | 'title'
  | 'project_id'
  | 'day'
  | 'date'
  | 'start'
  | 'duration'
  | 'weather_note'
  | 'status'
>;

export interface WorkerData {
  profile: WorkerProfile;
  sites: Site[];
  plants: Plant[];
  jobs: Job[];
}

const queryKey = (userId: string) => ['worker-data', userId] as const;
const geotagKey = (userId: string) => `goldmanstocks-worker-geotag:${userId}`;

export async function getGeotagPreference(userId: string) {
  return (await AsyncStorage.getItem(geotagKey(userId))) === 'true';
}

export async function setGeotagPreference(userId: string, enabled: boolean) {
  await AsyncStorage.setItem(geotagKey(userId), String(enabled));
}

async function loadWorkerData(userId: string): Promise<WorkerData> {
  const { data: worker, error: workerError } = await supabase
    .from('workers')
    .select('id, name, app_role')
    .eq('user_id', userId)
    .maybeSingle();
  if (workerError) throw workerError;
  if (!worker || worker.app_role !== 'worker') {
    throw new Error(
      i18n.t('errors.workerNotLinked', {
        defaultValue: 'This account is not linked to a GoldmanStocks worker profile. Ask your manager to link it.',
      }),
    );
  }

  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('id, name, city, address, lat, lng, zones, status')
    .order('name');
  if (projectsError) throw projectsError;

  const projectIds = projects.map((project) => project.id);
  const [plantsResult, tasksResult] = await Promise.all([
    projectIds.length
      ? supabase
          .from('plants')
          .select('id, project_id, common, species, status, site, next_task, next_care, lat, lng')
          .in('project_id', projectIds)
          .order('common')
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from('tasks')
      .select(
        'id, title, project_id, day, date, start, duration, weather_note, status',
      )
      .eq('worker_id', worker.id)
      .order('date', { ascending: true, nullsFirst: false })
      .order('day')
      .order('start'),
  ]);
  if (plantsResult.error) throw plantsResult.error;
  if (tasksResult.error) throw tasksResult.error;

  return {
    profile: {
      full_name: worker.name,
    },
    sites: projects,
    plants: plantsResult.data,
    jobs: tasksResult.data,
  };
}

export function useWorkerData() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKey(user?.id ?? 'signed-out'),
    queryFn: () => loadWorkerData(user!.id),
    enabled: Boolean(user),
  });
}

export function useRefreshWorkerData() {
  const { user } = useAuth();
  const client = useQueryClient();
  return () => (user ? client.invalidateQueries({ queryKey: queryKey(user.id) }) : Promise.resolve());
}

export function isJobScheduledOn(job: Job, date: string) {
  if (job.date) return job.date === date;
  const day = (new Date(`${date}T12:00:00`).getDay() + 6) % 7;
  return job.day === day;
}

export function jobsForDate(jobs: Job[], date: string) {
  return jobs.filter((job) => isJobScheduledOn(job, date));
}

export function calendarDates(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = startOfWeek(first);
  return Array.from({ length: 42 }, (_, index) => isoDate(addDays(start, index)));
}

async function currentPosition(enabled: boolean) {
  if (!enabled) return null;
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) return null;
  const result = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  return { latitude: result.coords.latitude, longitude: result.coords.longitude };
}

async function pickCameraPhoto() {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) throw new Error(i18n.t('errors.cameraPermission'));
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    quality: 0.82,
    allowsEditing: false,
  });
  return result.canceled ? null : result.assets[0];
}

async function uploadPhoto(taskId: string, uri: string, mimeType?: string | null) {
  const response = await fetch(uri);
  if (!response.ok) throw new Error(`Could not read the captured photo (${response.status})`);
  const blob = await response.blob();
  const contentType = mimeType ?? 'image/jpeg';
  const extension =
    contentType === 'image/png'
      ? 'png'
      : contentType === 'image/webp'
        ? 'webp'
        : contentType === 'image/heic'
          ? 'heic'
          : 'jpg';
  const fileId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  const path = `tasks/${taskId}/${fileId}.${extension}`;
  const { error } = await supabase.storage.from('task-photos').upload(path, blob, {
    contentType,
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export function useCompleteJob() {
  const { user } = useAuth();
  const refresh = useRefreshWorkerData();

  return useMutation({
    mutationFn: async (job: Job) => {
      if (!user) throw new Error(i18n.t('errors.signInToFinish'));
      const asset = await pickCameraPhoto();
      if (!asset) return false;
      const takenAt = new Date().toISOString();
      const geotag = await getGeotagPreference(user.id);
      const position = await currentPosition(geotag);
      const path = await uploadPhoto(job.id, asset.uri, asset.mimeType);
      const { error } = await supabase.rpc('complete_worker_task', {
        p_task_id: job.id,
        p_storage_path: path,
        p_taken_at: takenAt,
        p_lat: position?.latitude ?? null,
        p_lng: position?.longitude ?? null,
      });
      if (error) {
        const { error: cleanupError } = await supabase.storage
          .from('task-photos')
          .remove([path]);
        if (cleanupError) {
          throw new Error(
            `Task completion failed (${error.message}); photo cleanup failed (${cleanupError.message})`,
            { cause: error },
          );
        }
        throw error;
      }
      return true;
    },
    onSuccess: async (saved) => {
      if (saved) await refresh();
    },
  });
}

export function useToggleJobSkipped() {
  const refresh = useRefreshWorkerData();
  return useMutation({
    mutationFn: async (job: Job) => {
      const { error } = await supabase.rpc('set_worker_task_status', {
        p_task_id: job.id,
        p_status: job.status === 'skipped' ? 'planned' : 'skipped',
      });
      if (error) throw error;
    },
    onSuccess: refresh,
  });
}

export { currentPosition, pickCameraPhoto, uploadPhoto };
