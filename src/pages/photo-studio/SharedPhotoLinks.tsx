import React from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { FaCopy, FaShare } from 'react-icons/fa';
import toast from 'react-hot-toast';
import api from '../../api/client/axiosInstance';
import LoadingSpinner from '../../components/common/LoadingSpinner';

type AlbumListItem = {
  shareAlbumId: number;
  token: string;
  publicUrl: string;
  title?: string | null;
  status?: string | null;
  createdAt?: string | null;
  replacedById?: number | null;
  imageCount?: number | null;
};

type ListAlbumsResponse = {
  albums?: AlbumListItem[];
  total?: number;
  page?: number;
  size?: number;
  totalPages?: number;
};

const PAGE_SIZE = 20;

export default function SharedPhotoLinks() {
  const { t } = useTranslation();

  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ['publicShareAlbums'],
      queryFn: async ({ pageParam }) => {
        const res = await api.get<ListAlbumsResponse>('/api/public-share/albums', {
          params: { page: pageParam, size: PAGE_SIZE },
        });
        return res.data;
      },
      initialPageParam: 0,
      getNextPageParam: (lastPage) => {
        const page = lastPage?.page ?? 0;
        const totalPages = lastPage?.totalPages ?? 0;
        return page + 1 < totalPages ? page + 1 : undefined;
      },
      retry: 1,
      refetchOnWindowFocus: false,
    });

  const items = (data?.pages ?? []).flatMap((p) => p.albums ?? []);
  const total = data?.pages?.[0]?.total ?? items.length;

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied');
    } catch {
      toast.error('Copy failed');
    }
  };

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <div className="font-semibold text-red-800">Failed to load shared links</div>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <FaShare className="mr-3 text-indigo-600" />
            Shared Photo Links
          </h1>
          <p className="text-gray-600 mt-2 text-sm">
            Total: {total}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
        {items.length === 0 ? (
          <div className="text-gray-500 text-sm">No shared photo links yet.</div>
        ) : (
          <div className="space-y-3">
            {items.map((a) => {
              const url = a.publicUrl?.startsWith('http') ? a.publicUrl : `${origin}${a.publicUrl}`;
              const label = a.title?.trim() ? a.title : `Share #${a.shareAlbumId}`;
              return (
                <div key={a.shareAlbumId} className="rounded-xl border border-gray-200 p-4">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-900 truncate">{label}</div>
                      <div className="mt-1 text-xs text-gray-600">
                        {a.imageCount ?? 0} images • {a.createdAt ? new Date(a.createdAt).toLocaleString() : ''}
                        {a.replacedById ? ` • replacedBy ${a.replacedById}` : ''}
                      </div>
                      <div className="mt-2 text-sm text-gray-700 break-all">{url}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => copy(url)}
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
                      >
                        <FaCopy /> Copy link
                      </button>
                      <div className="inline-flex items-center rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-500">
                        Update images: use Recreate API
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {hasNextPage && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold hover:bg-gray-50 disabled:opacity-50"
                >
                  {isFetchingNextPage ? 'Loading…' : 'Load more'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

