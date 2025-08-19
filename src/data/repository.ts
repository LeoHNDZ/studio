// Factory function to get the appropriate composition repository implementation

import type { CompositionRepository } from './types';
import { LocalCompositionRepository } from './localCompositionRepository';
import { ApiCompositionRepository } from './apiCompositionRepository';

export type DataMode = 'local' | 'api';

/**
 * Get the composition repository implementation based on environment configuration
 */
export function getCompositionRepository(): CompositionRepository {
  // Check environment variable for data mode (default to 'local')
  const dataMode = (process.env.NEXT_PUBLIC_DATA_MODE || 'local') as DataMode;
  
  switch (dataMode) {
    case 'api':
      return new ApiCompositionRepository();
    case 'local':
    default:
      return new LocalCompositionRepository();
  }
}

// Export a singleton instance to avoid recreating repository instances
let repositoryInstance: CompositionRepository | null = null;

export function getCompositionRepositoryInstance(): CompositionRepository {
  if (!repositoryInstance) {
    repositoryInstance = getCompositionRepository();
  }
  return repositoryInstance;
}