import { useState, useEffect, useCallback, useRef } from 'react';

const useInfiniteScroll = (fetchFunction, options = {}) => {
    const { limit = 10, deduplicate = true } = options;
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [error, setError] = useState(null);

    // Use a ref to prevent race conditions or double-fetches in React 18 strict mode
    const isFetching = useRef(false);

    const loadMore = useCallback(async (reset = false) => {
        if (loading || (!hasMore && !reset)) return;

        setLoading(true);
        setError(null);
        isFetching.current = true;

        try {
            const currentOffset = reset ? 0 : offset;
            const currentOffset = reset ? 0 : offset;
            const result = await fetchFunction(currentOffset, limit);

            const newItems = Array.isArray(result) ? result : result.items;
            const fetchedCount = Array.isArray(result) ? newItems.length : result.fetchedCount;

            if (reset) {
                setItems(newItems);
                setOffset(fetchedCount);
            } else {
                setItems(prev => {
                    if (!deduplicate) return [...prev, ...newItems];

                    // Smart De-duplication using ID
                    // Handles potential conflicts if items are shifted in backend
                    const existingIds = new Set(prev.map(item => item.id || item._id));
                    const uniqueNew = newItems.filter(item => {
                        const id = item.id || item._id;
                        // If no ID exists, fallback to allowing it (risk of dupes but better than empty)
                        if (id === undefined || id === null) return true;
                        return !existingIds.has(id);
                    });

                    return [...prev, ...uniqueNew];
                });
                setOffset(prev => prev + fetchedCount);
            }

            // If we got fewer items than limit (based on source fetch), we reached the end
            // We use fetchedCount because that represents the backend pagination unit
            if (fetchedCount < limit) {
                setHasMore(false);
            } else {
                setHasMore(true);
            }

        } catch (err) {
            console.error("Infinite Scroll Error:", err);
            setError(err);
        } finally {
            setLoading(false);
            isFetching.current = false;
        }
    }, [fetchFunction, limit, offset, hasMore, loading, deduplicate]);

    // Initial Load - Guard against infinite loops
    useEffect(() => {
        if (offset === 0 && !loading) {
            loadMore();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run only on mount to trigger the first fetch. Subsequent fetches are manual or observer-triggered.

    // Utility to completely reset the list (e.g., when search query changes)
    const reset = useCallback(() => {
        setItems([]);
        setOffset(0);
        setHasMore(true);
        setLoading(false);
        // Important: trigger immediate reload after state reset
        // We can do this by calling loadMore(true) but we need to ensure state is clean first
        // actually loadMore(true) handles the atomic reset+fetch
        loadMore(true);
    }, [loadMore]);

    // Ref for the sentinel element
    const observer = useRef();
    const lastElementRef = useCallback(node => {
        if (loading) return;
        if (observer.current) observer.current.disconnect();

        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore && !isFetching.current) {
                loadMore();
            }
        });

        if (node) observer.current.observe(node);
    }, [loading, hasMore, loadMore]);

    return { items, loading, hasMore, error, lastElementRef, reset, setItems, loadMore };
};

export default useInfiniteScroll;
