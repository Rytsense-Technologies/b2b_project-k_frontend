import { asList } from '@/lib/api/superadmin/http';

/** The API caps page_size at 100. */
const PAGE_SIZE = 100;
const MAX_PAGES = 50;

/**
 * Every row of a paged list, for dropdowns and pickers that must offer all options.
 * @param {(args: { page: number, pageSize: number }) => Promise<any>} fetchPage
 */
export async function fetchAllPages(fetchPage, { maxPages = MAX_PAGES } = {}) {
  const first = await fetchPage({ page: 1, pageSize: PAGE_SIZE });
  const items = [...asList(first, [])];
  const total = Number(first?.total) || items.length;
  const pages = Math.min(maxPages, Math.ceil(total / PAGE_SIZE));
  if (pages > 1) {
    const rest = await Promise.all(
      Array.from({ length: pages - 1 }, (_, i) => fetchPage({ page: i + 2, pageSize: PAGE_SIZE })),
    );
    rest.forEach((res) => items.push(...asList(res, [])));
  }
  return { ...(Array.isArray(first) ? {} : first), items, total };
}
