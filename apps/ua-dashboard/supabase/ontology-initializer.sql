-- Ontology Initializer Function
-- This function populates IP-specific functions, tasks, and deliverables for a new IP
-- based on the generic templates in the database.
--
-- Usage: SELECT initialize_ip_ontology('doh-world');
-- Or: SELECT initialize_ip_ontology_by_id('uuid-of-ip');

-- Function to initialize ontology for an IP by slug
CREATE OR REPLACE FUNCTION initialize_ip_ontology(ip_slug TEXT)
RETURNS TABLE(
  functions_added INTEGER,
  tasks_added INTEGER,
  deliverables_added INTEGER,
  aliases_added INTEGER,
  criteria_added INTEGER
) AS $$
DECLARE
  v_ip_id UUID;
  v_functions_count INTEGER := 0;
  v_tasks_count INTEGER := 0;
  v_deliverables_count INTEGER := 0;
  v_aliases_count INTEGER := 0;
  v_criteria_count INTEGER := 0;
BEGIN
  -- Get IP ID
  SELECT id INTO v_ip_id FROM ips WHERE slug = ip_slug;
  
  IF v_ip_id IS NULL THEN
    RAISE EXCEPTION 'IP with slug % not found', ip_slug;
  END IF;

  -- Call the main initializer
  SELECT * INTO 
    v_functions_count, 
    v_tasks_count, 
    v_deliverables_count,
    v_aliases_count,
    v_criteria_count
  FROM initialize_ip_ontology_by_id(v_ip_id);

  RETURN QUERY SELECT 
    v_functions_count,
    v_tasks_count,
    v_deliverables_count,
    v_aliases_count,
    v_criteria_count;
END;
$$ LANGUAGE plpgsql;

-- Main function to initialize ontology for an IP by ID
CREATE OR REPLACE FUNCTION initialize_ip_ontology_by_id(ip_id_param UUID)
RETURNS TABLE(
  functions_added INTEGER,
  tasks_added INTEGER,
  deliverables_added INTEGER,
  aliases_added INTEGER,
  criteria_added INTEGER
) AS $$
DECLARE
  v_functions_count INTEGER := 0;
  v_tasks_count INTEGER := 0;
  v_deliverables_count INTEGER := 0;
  v_aliases_count INTEGER := 0;
  v_criteria_count INTEGER := 0;
  v_function_record RECORD;
  v_task_record RECORD;
  v_deliverable_record RECORD;
  v_alias_record RECORD;
  v_criterion_record RECORD;
  v_new_task_id UUID;
  v_new_deliverable_id UUID;
BEGIN
  -- Verify IP exists
  IF NOT EXISTS (SELECT 1 FROM ips WHERE id = ip_id_param) THEN
    RAISE EXCEPTION 'IP with id % not found', ip_id_param;
  END IF;

  -- Step 1: Link functions to IP (if not already linked)
  -- Get all functions that should be linked based on IP's verticals
  INSERT INTO ip_functions (ip_id, function_code)
  SELECT DISTINCT ip_id_param, f.code
  FROM functions f
  INNER JOIN ip_verticals iv ON iv.ip_id = ip_id_param
  WHERE f.category = iv.vertical_name
    AND NOT EXISTS (
      SELECT 1 FROM ip_functions if2 
      WHERE if2.ip_id = ip_id_param AND if2.function_code = f.code
    );
  
  GET DIAGNOSTICS v_functions_count = ROW_COUNT;

  -- Step 2: Create IP-specific tasks (copy from generic tasks)
  -- For each function linked to this IP, copy its tasks
  FOR v_function_record IN 
    SELECT function_code FROM ip_functions WHERE ip_id = ip_id_param
  LOOP
    FOR v_task_record IN
      SELECT * FROM tasks WHERE function_code = v_function_record.function_code
    LOOP
      -- Check if IP-specific task already exists
      -- We need to find the task by matching function_code and task_id
      -- But tasks are linked to functions, not IPs directly
      -- So we'll create IP-specific deliverables instead
      -- (Tasks remain generic, deliverables become IP-specific)
      NULL; -- Tasks stay generic, we skip creating IP-specific tasks
    END LOOP;
  END LOOP;

  -- Step 3: Create IP-specific deliverables (copy from generic deliverables)
  -- For each task in functions linked to this IP, copy its deliverables
  FOR v_function_record IN 
    SELECT function_code FROM ip_functions WHERE ip_id = ip_id_param
  LOOP
    FOR v_task_record IN
      SELECT t.* FROM tasks t WHERE t.function_code = v_function_record.function_code
    LOOP
      FOR v_deliverable_record IN
        SELECT * FROM deliverables 
        WHERE task_id = v_task_record.id 
          AND ip_id IS NULL -- ONLY get generic templates, not IP-specific ones
      LOOP
        -- Check if IP-specific deliverable already exists
        -- Double-check to prevent any possibility of duplicates
        SELECT id INTO v_new_deliverable_id
        FROM deliverables
        WHERE task_id = v_task_record.id
          AND deliverable_id = v_deliverable_record.deliverable_id
          AND ip_id = ip_id_param
        LIMIT 1;
        
        -- Only insert if it doesn't exist
        IF v_new_deliverable_id IS NULL THEN
          -- Create IP-specific copy of deliverable
          INSERT INTO deliverables (
            task_id,
            deliverable_id,
            filename,
            filetype,
            path_hint,
            description,
            display_order,
            status,
            storage_path,
            ip_id
          )
          VALUES (
            v_task_record.id,
            v_deliverable_record.deliverable_id,
            v_deliverable_record.filename,
            v_deliverable_record.filetype,
            v_deliverable_record.path_hint,
            v_deliverable_record.description,
            v_deliverable_record.display_order,
            COALESCE(v_deliverable_record.status, 'Assigned'),
            NULL, -- storage_path starts as NULL
            ip_id_param
          )
          RETURNING id INTO v_new_deliverable_id;
          
          v_deliverables_count := v_deliverables_count + 1;

          -- Step 4: Copy deliverable aliases (only if we created a new deliverable)
          FOR v_alias_record IN
            SELECT * FROM deliverable_aliases 
            WHERE deliverable_id = v_deliverable_record.id
          LOOP
            INSERT INTO deliverable_aliases (deliverable_id, alias)
            VALUES (v_new_deliverable_id, v_alias_record.alias)
            ON CONFLICT (deliverable_id, alias) DO NOTHING;
            
            v_aliases_count := v_aliases_count + 1;
          END LOOP;

          -- Step 5: Copy acceptance criteria (only if we created a new deliverable)
          FOR v_criterion_record IN
            SELECT * FROM acceptance_criteria 
            WHERE deliverable_id = v_deliverable_record.id
          LOOP
            INSERT INTO acceptance_criteria (
              deliverable_id,
              criteria_id,
              criteria_text,
              display_order
            )
            VALUES (
              v_new_deliverable_id,
              v_criterion_record.criteria_id,
              v_criterion_record.criteria_text,
              v_criterion_record.display_order
            )
            ON CONFLICT (deliverable_id, criteria_id) DO NOTHING;
            
            v_criteria_count := v_criteria_count + 1;
          END LOOP;
        END IF;
      END LOOP;
    END LOOP;
  END LOOP;

  RETURN QUERY SELECT 
    v_functions_count,
    v_tasks_count,
    v_deliverables_count,
    v_aliases_count,
    v_criteria_count;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION initialize_ip_ontology(TEXT) TO public;
GRANT EXECUTE ON FUNCTION initialize_ip_ontology_by_id(UUID) TO public;

-- Example usage:
-- SELECT * FROM initialize_ip_ontology('doh-world');
-- SELECT * FROM initialize_ip_ontology_by_id('your-ip-uuid-here');

