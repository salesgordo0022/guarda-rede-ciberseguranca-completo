# Table Creation Template

This template provides a simple way to create new tables in the mock database system.

## Steps to Create a New Table

### 1. Add Table Definition to Types

In `src/integrations/supabase/types.ts`, add your table to the `Tables` type:

```typescript
// Add to the Tables interface
your_table_name: {
  Row: {
    id: string
    // Add your fields here
    created_at: string
  }
  Insert: {
    id?: string
    // Add your fields here (make non-required fields optional with ?)
  }
  Update: {
    id?: string
    // Add your fields here (make all fields optional with ?)
  }
}
```

### 2. Add Table to Mock Database Schema

In `src/integrations/supabase/mock.ts`, add your table to the `Tables` type:

```typescript
type Tables = {
  // ... existing tables
  your_table_name: Row[];
};
```

### 3. Add Sample Data to Mock Database

In `src/integrations/supabase/mock.ts`, add sample data for your table in the `initial` object:

```javascript
const initial: Tables = {
  // ... existing tables
  your_table_name: [
    {
      id: 'unique-id-1',
      // Add your fields with sample data
      created_at: new Date().toISOString()
    },
    {
      id: 'unique-id-2',
      // Add your fields with sample data
      created_at: new Date().toISOString()
    }
  ]
};
```

### 4. Add Table to Database Constants (if needed)

If your table requires enum values or constants, add them to the `Constants` section:

```typescript
export const Constants = {
  public: {
    Enums: {
      // Add any new enums your table uses
      your_enum_name: ["value1", "value2", "value3"],
    },
  },
};
```

## Example: Creating a "Teams" Table

### 1. Add to Types

```typescript
teams: {
  Row: {
    id: string
    name: string
    description: string | null
    project_id: string
    created_at: string
  }
  Insert: {
    id?: string
    name: string
    description?: string | null
    project_id: string
    created_at?: string
  }
  Update: {
    id?: string
    name?: string
    description?: string | null
    project_id?: string
    created_at?: string
  }
}
```

### 2. Add to Mock Schema

```typescript
type Tables = {
  // ... existing tables
  teams: Row[];
};
```

### 3. Add Sample Data

```javascript
const initial: Tables = {
  // ... existing tables
  teams: [
    {
      id: 'team-1',
      name: 'Backend Developers',
      description: 'Team responsible for backend development',
      project_id: 'proj-1',
      created_at: new Date().toISOString()
    },
    {
      id: 'team-2',
      name: 'Frontend Developers',
      description: 'Team responsible for frontend development',
      project_id: 'proj-1',
      created_at: new Date().toISOString()
    }
  ]
};
```

## Best Practices

1. **Consistent Naming**: Use lowercase plural names for tables (e.g., `user_profiles`, `project_activities`)
2. **Foreign Keys**: Always include foreign key fields when referencing other tables
3. **Timestamps**: Include `created_at` and optionally `updated_at` fields
4. **IDs**: Use string UUIDs for primary keys
5. **Sample Data**: Provide meaningful sample data that demonstrates the table's purpose
6. **Documentation**: Document your table in the DATABASE_SCHEMA.md file