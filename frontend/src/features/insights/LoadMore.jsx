import { Button } from '../../components/ui/Button'

/**
 * Pagination is the server's job — this only asks for the next page and the
 * cache appends it. Hidden entirely when the whole result set arrived in
 * one page, which is what `paginated: false` from the API means.
 */
export function LoadMore({ pagination, isFetching, onLoadMore }) {
  if (!pagination?.paginated) return null

  const { page, totalPages, totalItems, hasNextPage } = pagination

  return (
    <div className="load-more">
      <p className="load-more__status">
        Page {page} of {totalPages} · {totalItems} insights in total
      </p>

      {hasNextPage ? (
        <Button variant="secondary" onClick={onLoadMore} loading={isFetching}>
          {isFetching ? 'Loading' : 'Load more'}
        </Button>
      ) : (
        <p className="muted">Everything is loaded.</p>
      )}
    </div>
  )
}
