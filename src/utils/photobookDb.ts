import { createStore, del, get, set } from 'idb-keyval'

export type PhotoBookDbPhoto = {
  name: string
  dataUrl: string
  source?: 'album' | 'local' | 'filevault'
}

const photoStore = createStore('photobook_db', 'photos')

export async function photobookDbGetPhoto(id: string): Promise<PhotoBookDbPhoto | null> {
  const val = await get<PhotoBookDbPhoto>(id, photoStore)
  return val ?? null
}

export async function photobookDbSetPhoto(id: string, photo: PhotoBookDbPhoto): Promise<void> {
  await set(id, photo, photoStore)
}

export async function photobookDbDeletePhoto(id: string): Promise<void> {
  await del(id, photoStore)
}

