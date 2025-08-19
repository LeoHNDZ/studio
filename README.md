# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.

## Autocomplete System

The autocomplete system has been refactored to use a composition repository instead of GitHub issues. This provides better phrase suggestions based on the user's own previously created compositions.

### Configuration

Set the data mode using the `NEXT_PUBLIC_DATA_MODE` environment variable:

- `local` (default): Uses localStorage for composition storage
- `api`: Reserved for future server/API implementation

### Architecture

The autocomplete system consists of:

1. **Data Layer** (`src/data/`):
   - `types.ts`: Core interfaces for compositions and repositories
   - `phraseUtils.ts`: N-gram extraction and scoring utilities
   - `localCompositionRepository.ts`: localStorage implementation
   - `apiCompositionRepository.ts`: Future API implementation stub
   - `repository.ts`: Factory for selecting repository implementation

2. **Phrase Extraction**: 
   - Extracts 1-5 word phrases from composition texts
   - Minimum 2 characters per phrase
   - Frequency and recency-based scoring with exponential decay (60-minute half-life)

3. **Suggestion Sources**:
   - **Local phrases**: From current unsaved canvas state (5-point boost)
   - **Repository phrases**: From previously saved compositions (scored by frequency + recency)

4. **Persistence**: 
   - Compositions auto-save to repository after 2 seconds of inactivity
   - Phrase suggestions update dynamically based on saved compositions

### Migration from GitHub Issues

The previous system fetched autocomplete suggestions from GitHub issues via `/api/tickets`. This endpoint now returns a deprecation notice. All autocomplete functionality has been moved to the composition repository system.
