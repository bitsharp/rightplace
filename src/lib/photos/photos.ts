import * as Crypto from 'expo-crypto';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { RpcError, toRpcErrorCode } from '@/lib/rpcError';
import { supabase } from '@/lib/supabase';

import { resizeTarget } from './photoSize';

export type PhotoSource = 'camera' | 'library';
export type PickedPhoto = { uri: string; width: number; height: number };
export type PickResult =
  { status: 'picked'; photo: PickedPhoto } | { status: 'cancelled' } | { status: 'denied' };

const JPEG_QUALITY = 0.7;
// The picker may hand over the camera's own JPEG; `exif: false` keeps the location out of what the app
// reads, and re-encoding in preparePhoto drops it from the file that is uploaded.
const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  quality: 0.9,
  exif: false,
};

function toResult(result: ImagePicker.ImagePickerResult): PickResult {
  const [asset] = result.assets ?? [];
  if (result.canceled || !asset) return { status: 'cancelled' };
  return { status: 'picked', photo: { uri: asset.uri, width: asset.width, height: asset.height } };
}

// Permissions are asked only now, at the tap on the camera. The gallery uses the system picker,
// which needs no permission: the app never sees photos the user did not choose.
export async function pickPhoto(source: PhotoSource): Promise<PickResult> {
  if (source === 'library')
    return toResult(await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS));
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) return { status: 'denied' };
  return toResult(await ImagePicker.launchCameraAsync(PICKER_OPTIONS));
}

async function sizeOf(photo: PickedPhoto): Promise<{ width: number; height: number }> {
  if (photo.width > 0 && photo.height > 0) return photo;
  const image = await ImageManipulator.manipulate(photo.uri).renderAsync();
  return { width: image.width, height: image.height };
}

// Returns the uri of a new JPEG: long side <= 1280 px, never upscaled. Re-encoding does not copy the
// original's EXIF block, so the GPS position of the shot never leaves the phone (principle 3).
export async function preparePhoto(photo: PickedPhoto): Promise<string> {
  const original = await sizeOf(photo);
  const target = resizeTarget(original.width, original.height);
  const context = ImageManipulator.manipulate(photo.uri);
  if (target.width !== original.width || target.height !== original.height) context.resize(target);
  const image = await context.renderAsync();
  const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: JPEG_QUALITY });
  return saved.uri;
}

export type PhotoBucket = 'chat-photos' | 'posts';

// `cleanUri` must be the output of preparePhoto: the original file is never uploaded.
// The path is always <user id>/<uuid>.jpg: it is the only shape the RPCs accept.
export async function uploadPhoto(
  bucket: PhotoBucket,
  userId: string,
  cleanUri: string,
): Promise<string> {
  const path = `${userId}/${Crypto.randomUUID()}.jpg`;
  const body = await (await fetch(cleanUri)).arrayBuffer();
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, body, { contentType: 'image/jpeg', upsert: false });
  if (error) throw new RpcError(toRpcErrorCode(error));
  return path;
}
