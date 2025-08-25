# Status Page Editor - Refactored Structure

This directory contains the refactored status page editor, which has been broken down into smaller, more manageable components while preserving all functionality. The implementation now uses TanStack Query for efficient data fetching, caching, and state management.

## Structure

```
create/
├── status-page-editor.tsx          # Main component (orchestrates everything)
├── hooks/
│   └── useStatusPageEditor.ts      # Custom hook with TanStack Query integration
├── components/
│   ├── index.ts                    # Export all components
│   ├── OverviewTab.tsx             # Basic information & logo upload
│   ├── StructureTab.tsx            # Sections & resources management
│   ├── MaintenanceTab.tsx          # Maintenance scheduling
│   └── UpdatesTab.tsx              # Status updates & reports
└── README.md                       # This file
```

## Components

### Main Component
- **`status-page-editor.tsx`**: The main orchestrator component that manages the overall layout and coordinates between tabs. Includes error handling for failed data fetches.

### Custom Hook with TanStack Query
- **`useStatusPageEditor.ts`**: Enhanced with TanStack Query for optimal data management:
  - **Data Fetching**: Uses `useQuery` for status page and maintenance data
  - **Mutations**: Uses `useMutation` for all CRUD operations
  - **Cache Management**: Automatic cache invalidation and optimistic updates
  - **Loading States**: Granular loading states for different operations
  - **Error Handling**: Comprehensive error handling with user-friendly messages
  - **State Management**: Form state management with change detection

### Tab Components

#### Overview Tab (`OverviewTab.tsx`)
Handles the basic information section including:
- Company name and publication status
- History range selection
- Logo upload (drag & drop support)
- Logo URL and contact URL configuration

#### Structure Tab (`StructureTab.tsx`)
Manages the status page structure including:
- Section creation, editing, and deletion
- Resource management within sections
- Monitor selection and widget type configuration
- Drag & drop reordering of sections

#### Maintenance Tab (`MaintenanceTab.tsx`)
Handles maintenance scheduling including:
- Maintenance form with title, description, and time range
- Affected services selection
- Existing maintenance display and management
- Maintenance deletion with loading states

#### Updates Tab (`UpdatesTab.tsx`)
Manages status updates and reports including:
- Status report creation form
- Affected services status selection
- Existing status updates display
- Report submission with loading states

## TanStack Query Integration

### Data Fetching
- **Status Page Data**: Fetched using `useStatusPage` hook
- **Maintenance Data**: Fetched using `useMaintenances` hook
- **Monitor Data**: Fetched using `useMonitors` hook

### Mutations
- **Status Page Operations**: Create and update using `useCreateStatusPage` and `useUpdateStatusPage`
- **Maintenance Operations**: Create, update, and delete using maintenance hooks
- **Status Report Creation**: Custom mutation with optimistic updates

### Cache Management
- **Automatic Invalidation**: Related queries are invalidated after mutations
- **Optimistic Updates**: UI updates immediately while mutation is in progress
- **Error Recovery**: Failed mutations automatically revert optimistic updates

### Loading States
The hook provides granular loading states:
- `isLoading`: Initial data loading
- `isSaving`: Status page save operations
- `isCreatingReport`: Status report creation
- `isCreatingMaintenance`: Maintenance creation
- `isDeletingMaintenance`: Maintenance deletion

### Error Handling
- **Network Errors**: Automatic retry with exponential backoff
- **Authentication Errors**: Immediate failure without retry
- **Validation Errors**: User-friendly error messages
- **Toast Notifications**: Success and error feedback

## Benefits of This Refactoring

1. **Separation of Concerns**: Each component has a single responsibility
2. **Maintainability**: Easier to find and fix issues in specific functionality
3. **Reusability**: Components can be reused in other parts of the application
4. **Testability**: Smaller components are easier to unit test
5. **Performance**: TanStack Query provides automatic caching and background updates
6. **Developer Experience**: Easier to understand and modify specific features
7. **User Experience**: Better loading states and error handling

## Usage

The main component can be used exactly as before:

```tsx
import StatusPageEditor from './status-page-editor';

// Create mode
<StatusPageEditor mode="create" />

// Edit mode
<StatusPageEditor mode="edit" id="status-page-id" />
```

## State Management

All state is managed through the `useStatusPageEditor` hook, which provides:
- Form state (name, logo, sections, etc.)
- Loading states for all operations
- API operations with TanStack Query
- Change detection
- Error handling

## API Integration

The hook handles all API interactions with TanStack Query:
- Status page CRUD operations
- Maintenance operations
- Status update operations
- Data fetching and caching
- Automatic background refetching
- Optimistic updates

## Error Handling

Comprehensive error handling is implemented throughout:
- Form validation
- API error responses
- User-friendly error messages
- Toast notifications for success/error states
- Automatic retry for transient failures
- Graceful degradation for network issues

## Performance Optimizations

- **Caching**: TanStack Query provides intelligent caching
- **Background Updates**: Data is automatically refreshed in the background
- **Optimistic Updates**: UI responds immediately to user actions
- **Deduplication**: Multiple requests for the same data are deduplicated
- **Stale-While-Revalidate**: Shows cached data while fetching fresh data
