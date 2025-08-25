# Status Page Editor - Refactored Structure

This directory contains the refactored status page editor, which has been broken down into smaller, more manageable components while preserving all functionality.

## Structure

```
create/
├── status-page-editor.tsx          # Main component (orchestrates everything)
├── hooks/
│   └── useStatusPageEditor.ts      # Custom hook for state management
├── components/
│   ├── index.ts                    # Export all components
│   ├── overview-tab.tsx            # Basic information & logo upload
│   ├── structure-tab.tsx           # Sections & resources management
│   ├── maintenance-tab.tsx         # Maintenance scheduling
│   └── updates-tab.tsx             # Status updates & reports
└── README.md                       # This file
```

## Components

### Main Component
- **`status-page-editor.tsx`**: The main orchestrator component that manages the overall layout and coordinates between tabs.

### Custom Hook
- **`useStatusPageEditor.ts`**: Contains all the business logic, state management, and API calls. This hook encapsulates:
  - State management for all form fields
  - Data fetching and loading states
  - Save/create/update operations
  - Maintenance operations
  - Status update operations
  - Change detection logic

### Tab Components

#### Overview Tab (`overview-tab.tsx`)
Handles the basic information section including:
- Company name and publication status
- History range selection
- Logo upload (drag & drop support)
- Logo URL and contact URL configuration

#### Structure Tab (`structure-tab.tsx`)
Manages the status page structure including:
- Section creation, editing, and deletion
- Resource management within sections
- Monitor selection and widget type configuration
- Drag & drop reordering of sections

#### Maintenance Tab (`maintenance-tab.tsx`)
Handles maintenance scheduling including:
- Maintenance form with title, description, and time range
- Affected services selection
- Existing maintenance display and management
- Maintenance deletion

#### Updates Tab (`updates-tab.tsx`)
Manages status updates and reports including:
- Status report creation form
- Affected services status selection
- Existing status updates display
- Report submission and management

## Benefits of This Refactoring

1. **Separation of Concerns**: Each component has a single responsibility
2. **Maintainability**: Easier to find and fix issues in specific functionality
3. **Reusability**: Components can be reused in other parts of the application
4. **Testability**: Smaller components are easier to unit test
5. **Performance**: Components can be optimized individually
6. **Developer Experience**: Easier to understand and modify specific features

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
- Loading states
- API operations
- Change detection
- Error handling

## API Integration

The hook handles all API interactions:
- Status page CRUD operations
- Maintenance operations
- Status update operations
- Data fetching and caching

## Error Handling

Comprehensive error handling is implemented throughout:
- Form validation
- API error responses
- User-friendly error messages
- Toast notifications for success/error states
