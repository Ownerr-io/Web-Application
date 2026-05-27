export class MarketplaceError extends Error {
  constructor(
    message: string,
    readonly code:
      | 'not_configured'
      | 'not_found'
      | 'forbidden'
      | 'validation'
      | 'profile_required'
      | 'unknown' = 'unknown',
  ) {
    super(message);
    this.name = 'MarketplaceError';
  }
}

export function mapSupabaseError(err: { message: string; code?: string }): MarketplaceError {
  if (err.code === 'PGRST116') return new MarketplaceError('Not found', 'not_found');
  if (err.code === '42501') return new MarketplaceError('Access denied', 'forbidden');
  return new MarketplaceError(err.message, 'unknown');
}
