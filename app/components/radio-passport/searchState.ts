export function catalogRequestState(query: string) {
  return {
    shouldFetch: query.trim().length >= 2,
    isLoading: query.trim().length >= 2,
  };
}
