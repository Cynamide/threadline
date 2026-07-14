# Runtime API Specification

**Detailed API reference for `@threadline/runtime`**

---

## Overview

The `@threadline/runtime` package provides a single function `handoff()` that allows AI agents to stub out architectural logic while providing safe fallback behavior.

---

## Installation

```bash
npm install @threadline/runtime
# or
pnpm add @threadline/runtime
# or
yarn add @threadline/runtime
```

---

## API Reference

### `handoff()`

Creates a callable wrapper that can be used in place of real implementation.

#### Signature

```typescript
function handoff<T = void>(options: HandoffOptions<T>): () => T | Promise<T | void> | void;
```

#### Parameters

##### HandoffOptions

```typescript
interface HandoffOptions<T = void> {
  /**
   * Stable identifier for tracking across code changes.
   * Must be a string literal (not a variable).
   * Should be kebab-case.
   * 
   * @example "settings-export-csv"
   */
  id: string;

  /**
   * Human-readable title describing what needs to be implemented.
   * Will be used as the Linear issue title.
   * 
   * @example "Export Data"
   */
  title: string;

  /**
   * Detailed description of what needs to be implemented.
   * Should include context about the implementation.
   * Will be used in Linear issue description.
   * 
   * @example "Trigger CSV export of current table view via /api/export"
   */
  description?: string;

  /**
   * Safe, non-breaking fallback behavior.
   * This function runs when the returned wrapper is invoked.
   * Successful return values are preserved.
   * If it throws or rejects, the wrapper swallows the failure and returns undefined.
   * 
   * @example () => alert('Feature coming soon')
   */
  fallback: () => T | Promise<T>;
}
```

#### Returns

A callable wrapper that invokes `fallback()` when called.

---

## Usage Examples

### Basic Usage

```typescript
import { handoff } from '@threadline/runtime';

function MyComponent() {
  const handleClick = handoff({
    id: 'my-component-action',
    title: 'Perform Action',
    description: 'Call /api/action with user input',
    fallback: () => {
      console.log('Action not yet implemented');
    }
  });

  return <button onClick={handleClick}>Click me</button>;
}
```

### With Return Value

```typescript
const getValue = handoff({
  id: 'get-config-value',
  title: 'Get Config Value',
  description: 'Fetch config from /api/config',
  fallback: () => ({
    defaultValue: 'temp'
  })
});

const config = getValue(); // Returns { defaultValue: 'temp' }
```

### Async Fallback

```typescript
const fetchData = handoff({
  id: 'fetch-user-data',
  title: 'Fetch User Data',
  description: 'GET /api/user/:id',
  fallback: async () => {
    console.log('Data fetching not implemented');
    return null;
  }
});

// Usage
await fetchData();
```

### Failure Handling

- In development, invoking a handoff wrapper still emits the existing warning before the fallback runs.
- In development, if the fallback throws or rejects, the runtime logs a `console.error` with the handoff title, id, and original error.
- In production, fallback failures are still neutralized to `undefined`, but no failure log is emitted.
- Successful fallback return values are unchanged in every environment.

### Event Handler

```typescript
import { handoff } from '@threadline/runtime';

function DeleteButton({ itemId }: { itemId: string }) {
  const handleDelete = handoff({
    id: 'delete-item',
    title: 'Delete Item',
    description: `DELETE /api/items/${itemId}`,
    fallback: () => {
      alert('Delete functionality coming soon');
    }
  });

  return (
    <button 
      onClick={handleDelete}
      className="text-red-500"
    >
      Delete
    </button>
  );
}
```

### Form Submission

```typescript
function ContactForm() {
  const [formData, setFormData] = useState({ name: '', email: '' });

  const handleSubmit = handoff({
    id: 'submit-contact-form',
    title: 'Submit Contact Form',
    description: 'POST /api/contact with form data and send email notification',
    fallback: () => {
      alert('Thank you for your message! We will respond soon.');
      setFormData({ name: '', email: '' }); // Reset form
    }
  });

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      handleSubmit();
    }}>
      <input 
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
      />
      <button type="submit">Submit</button>
    </form>
  );
}
```

### Multiple Handoffs in One Component

```typescript
function UserProfile({ userId }: { userId: string }) {
  const handleUpdateAvatar = handoff({
    id: 'update-avatar',
    title: 'Update Avatar',
    description: 'POST /api/user/:id/avatar with image file',
    fallback: () => alert('Avatar upload coming soon')
  });

  const handleUpdateProfile = handoff({
    id: 'update-profile',
    title: 'Update Profile',
    description: 'PUT /api/user/:id with profile data',
    fallback: () => alert('Profile update coming soon')
  });

  const handleDeleteAccount = handoff({
    id: 'delete-account',
    title: 'Delete Account',
    description: 'DELETE /api/user/:id and redirect to home',
    fallback: () => {
      if (confirm('Are you sure?')) {
        alert('Account deletion coming soon');
      }
    }
  });

  return (
    <div>
      <button onClick={handleUpdateAvatar}>Change Avatar</button>
      <button onClick={handleUpdateProfile}>Edit Profile</button>
      <button onClick={handleDeleteAccount}>Delete Account</button>
    </div>
  );
}
```

---

## Object Form Only

Use the object form for every handoff:

```typescript
// Object form only
const handler = handoff({
  id: 'submit-form',
  title: 'Submit Form',
  description: 'POST form data to /api/submit',
  fallback: () => alert('Form submission coming soon')
});
```

---

## Development vs Production Behavior

### Development Mode

When `process.env.NODE_ENV === 'development'`, calling the returned wrapper logs a warning before it runs the fallback:

```typescript
const handler = handoff({
  id: 'test',
  title: 'Test Handoff',
  description: 'Test description',
  fallback: () => {}
});

handler();

// Console output:
// [Threadline] Handoff triggered: "Test Handoff"
// Description: Test description
// ID: test
// This should be implemented by an engineer.
```

### Production Mode

When `process.env.NODE_ENV === 'production'`:

- No console warnings
- The wrapper still runs the fallback
- No performance impact beyond the wrapper call itself

---

## ID Naming Guidelines

### Good IDs

```typescript
'settings-export-csv'           // Context + action
'profile-upload-avatar'         // Feature + action
'dashboard-delete-item'         // Location + action
'notification-toggle-email'     // Feature + sub-action
'cart-checkout-payment'         // Flow + step
```

### Bad IDs

```typescript
'handoff1'                      // Not descriptive
'fix'                           // Too vague
'test'                          // Not specific
'someRandomString'              // Not kebab-case
'do-the-thing-with-the-api'     // Too long
```

### ID Rules

1. Use kebab-case (lowercase, hyphens)
2. Include context (feature/page name)
3. Include action (what happens)
4. Be specific but concise
5. Start with a letter, not a number

---

## Error Handling

The `handoff()` wrapper should keep the UI usable even if the fallback fails:

```typescript
handoff({
  id: 'error-handoff',
  title: 'Error',
  fallback: () => { throw new Error('oops'); }
});
```

Implementations should catch fallback errors, report them in development, and avoid breaking the surrounding UI.

---

## TypeScript Types

```typescript
// Import types
import type { HandoffOptions } from '@threadline/runtime';

// Use in your code
const options: HandoffOptions = {
  id: 'my-handoff',
  title: 'My Handoff',
  fallback: () => {}
};
```

---

## Bundle Size

The runtime package is designed to be minimal:
- No external dependencies
- ~1KB gzipped
- Tree-shakeable

---

## Version Compatibility

| @threadline/runtime | React | Node |
|---------------------|-------|------|
| 1.x                 | 17+   | 16+  |

---

## Migration Guide

### From Comments to handoff()

Before:
```typescript
// TODO: Implement API call
const handleClick = () => {
  console.log('not implemented');
};
```

After:
```typescript
const handleClick = handoff({
  id: 'handle-click',
  title: 'Handle Click',
  description: 'Implement API call',
  fallback: () => console.log('not implemented')
});
```

### From Placeholders to handoff()

Before:
```typescript
const handleSubmit = async () => {
  // TODO: Replace with actual implementation
  alert('Form submission coming soon');
};
```

After:
```typescript
const handleSubmit = handoff({
  id: 'submit-form',
  title: 'Submit Form',
  description: 'POST form data to /api/submit',
  fallback: () => alert('Form submission coming soon')
});
```

---

## FAQ

### Can I use variables for IDs?

No, IDs must be string literals for AST parsing:

```typescript
// ❌ Not allowed
const id = 'my-handoff';
handoff({ id, ... });

// ✅ Correct
handoff({ id: 'my-handoff', ... });
```

### Can handoff return a Promise?

Yes, use async fallbacks:

```typescript
const fetchData = handoff({
  id: 'fetch-data',
  title: 'Fetch Data',
  fallback: async () => {
    return { data: null };
  }
});

const result = await fetchData();
```

### Can I use handoff outside of components?

Yes, it works in any JavaScript/TypeScript context:

```typescript
// In a utility file
export const saveToStorage = handoff({
  id: 'save-storage',
  title: 'Save to Storage',
  fallback: () => console.log('Storage not implemented')
});
```
