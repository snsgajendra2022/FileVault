import api from '../../api/client/axiosInstance';
import { getConnectionHint, getSaveData } from '../../utils/progressiveImageVariants';
import { MY_IMAGES_PAGE_SIZE } from './constants';
import type { MyImage, MyImagesPageResponse } from './types';

export async function fetchMyImagesPage(params: {
  token: string;
  page: number;
  size?: number;
}): Promise<MyImagesPageResponse> {
  const response = await api.get('/api/images/user/all', {
    params: {
      token: params.token,
      page: params.page,
      size: params.size ?? MY_IMAGES_PAGE_SIZE,
      connection: getConnectionHint(),
      saveData: getSaveData(),
    },
  });
  return response.data as MyImagesPageResponse;
}

export async function deleteMyImage(imageId: string): Promise<unknown> {
  const response = await api.delete(`/api/images/${imageId}`);
  return response.data;
}

export function downloadMyImage(image: MyImage): void {
  const link = document.createElement('a');
  link.href = image.downloadUrl;
  link.download = image.filename;
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function createPublicShareLink(params: {
  token: string;
  fileNames: string[];
}): Promise<string | null> {
  const res = await api.post<{ id?: string }>('/api/public/share-link', params);
  return res.data?.id ?? null;
}
