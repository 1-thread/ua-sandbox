# Database Migrations

This folder contains database migration scripts that add new features or modify the schema.

## Migrations

- `add-asset-fields.sql` - Adds `status` and `storage_path` fields to the `deliverables` table
- `add-ip-id-to-deliverables.sql` - Adds `ip_id` column to `deliverables` table to support IP-specific deliverables

## Running Migrations

These migrations should be run in order:
1. `add-asset-fields.sql`
2. `add-ip-id-to-deliverables.sql`

## Note

After running migrations, you may need to run the ontology initializer (`ontology-initializer.sql`) to update existing data.

