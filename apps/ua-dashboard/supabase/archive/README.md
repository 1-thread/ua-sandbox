# Archived SQL Scripts

This folder contains SQL scripts that were used for one-time fixes, diagnostics, and cleanup during development.

## Diagnostic Scripts

- `check-current-state.sql` - Check the current state of IPs, functions, and deliverables
- `check-task-duplicates.sql` - Find duplicate tasks
- `deep-diagnose.sql` - Deep diagnostic queries
- `diagnose-deliverable-issue.sql` - Diagnose deliverable-related issues
- `diagnose-ip-setup.sql` - Diagnose IP setup issues
- `quick-ip-check.sql` - Quick IP status check
- `verify-function-structure.sql` - Verify function structure

## Cleanup Scripts

- `cleanup-duplicate-deliverables.sql` - Remove duplicate deliverables
- `complete-cleanup-and-reinit.sql` - Complete cleanup and re-initialization
- `final-fix-procedure.sql` - Final fix procedure
- `find-and-clean-duplicate-tasks.sql` - Find and clean duplicate tasks
- `nuclear-cleanup.sql` - Aggressive cleanup script

## One-Time Fix Scripts

- `fix-and-initialize-all-ips.sql` - Fix and initialize all IPs
- `fix-unique-constraint.sql` - Fix unique constraint on deliverables
- `link-functions-to-ips.sql` - Link functions to IPs based on verticals
- `update-assets-page-for-ip-specific.sql` - Update assets page for IP-specific data
- `update-image-paths.sql` - Update image paths

## Note

These scripts are kept for historical reference but should not be run in production unless specifically needed. The current production setup uses the scripts in the main `supabase/` folder.

