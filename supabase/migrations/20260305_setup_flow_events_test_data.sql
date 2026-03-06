-- Test data for Setup Analytics Dashboard (S4-015)
-- Run this AFTER creating the setup_flow_events table
-- This simulates 50 families going through the setup flow with realistic drop-off

-- ONLY RUN THIS IN DEVELOPMENT/STAGING - NOT PRODUCTION!

DO $$
DECLARE
  i INT;
  m_id UUID;
  device TEXT;
  step_delay INTERVAL;
BEGIN
  -- Create 50 families going through setup
  FOR i IN 1..50 LOOP
    m_id := gen_random_uuid();
    
    -- Random device type
    device := CASE 
      WHEN i % 3 = 0 THEN 'desktop'
      WHEN i % 10 = 0 THEN 'tablet'
      ELSE 'mobile'
    END;
    
    -- STEP 1: BASICS (all 50 start)
    INSERT INTO setup_flow_events (memorial_id, event_type, step_name, metadata, created_at)
    VALUES (m_id, 'step_view', 'basics', jsonb_build_object('device_type', device), NOW() - INTERVAL '30 days' + (i || ' hours')::INTERVAL);
    
    -- 95% complete basics (2 drop off)
    IF i > 2 THEN
      step_delay := INTERVAL '1 minute' * (1 + random() * 3); -- 1-4 minutes
      INSERT INTO setup_flow_events (memorial_id, event_type, step_name, metadata, created_at)
      VALUES (m_id, 'step_complete', 'basics', jsonb_build_object('device_type', device), NOW() - INTERVAL '30 days' + (i || ' hours')::INTERVAL + step_delay);
      
      -- STEP 2: FIRST MEMORY (48 start, only completers from step 1)
      INSERT INTO setup_flow_events (memorial_id, event_type, step_name, metadata, created_at)
      VALUES (m_id, 'step_view', 'first-memory', jsonb_build_object('device_type', device), NOW() - INTERVAL '30 days' + (i || ' hours')::INTERVAL + step_delay);
      
      -- 80% complete first memory (8 drop off) - BIGGEST DROP-OFF POINT
      IF i > 10 THEN
        step_delay := step_delay + INTERVAL '1 minute' * (2 + random() * 5); -- 2-7 minutes (slowest step)
        INSERT INTO setup_flow_events (memorial_id, event_type, step_name, metadata, created_at)
        VALUES (m_id, 'step_complete', 'first-memory', jsonb_build_object('device_type', device), NOW() - INTERVAL '30 days' + (i || ' hours')::INTERVAL + step_delay);
        
        -- STEP 3: PREVIEW (40 start)
        INSERT INTO setup_flow_events (memorial_id, event_type, step_name, metadata, created_at)
        VALUES (m_id, 'step_view', 'preview', jsonb_build_object('device_type', device), NOW() - INTERVAL '30 days' + (i || ' hours')::INTERVAL + step_delay);
        
        -- 95% view preview (2 drop off)
        IF i > 12 THEN
          step_delay := step_delay + INTERVAL '30 seconds'; -- Fast step
          INSERT INTO setup_flow_events (memorial_id, event_type, step_name, metadata, created_at)
          VALUES (m_id, 'step_complete', 'preview', jsonb_build_object('device_type', device), NOW() - INTERVAL '30 days' + (i || ' hours')::INTERVAL + step_delay);
          
          -- STEP 4: INVITE FAMILY (38 start)
          INSERT INTO setup_flow_events (memorial_id, event_type, step_name, metadata, created_at)
          VALUES (m_id, 'step_view', 'invite-family', jsonb_build_object('device_type', device), NOW() - INTERVAL '30 days' + (i || ' hours')::INTERVAL + step_delay);
          
          -- 90% say yes to invite family (4 say no)
          step_delay := step_delay + INTERVAL '50 seconds';
          IF i % 10 != 0 THEN
            INSERT INTO setup_flow_events (memorial_id, event_type, decision, metadata, created_at)
            VALUES (m_id, 'decision', 'invite_yes', jsonb_build_object('device_type', device), NOW() - INTERVAL '30 days' + (i || ' hours')::INTERVAL + step_delay);
          ELSE
            INSERT INTO setup_flow_events (memorial_id, event_type, decision, metadata, created_at)
            VALUES (m_id, 'decision', 'invite_no', jsonb_build_object('device_type', device), NOW() - INTERVAL '30 days' + (i || ' hours')::INTERVAL + step_delay);
          END IF;
          
          INSERT INTO setup_flow_events (memorial_id, event_type, step_name, metadata, created_at)
          VALUES (m_id, 'step_complete', 'invite-family', jsonb_build_object('device_type', device), NOW() - INTERVAL '30 days' + (i || ' hours')::INTERVAL + step_delay);
          
          -- STEP 5: FLOWERS (34 start - those who said yes to invite)
          IF i % 10 != 0 THEN
            INSERT INTO setup_flow_events (memorial_id, event_type, step_name, metadata, created_at)
            VALUES (m_id, 'step_view', 'flowers', jsonb_build_object('device_type', device), NOW() - INTERVAL '30 days' + (i || ' hours')::INTERVAL + step_delay);
            
            -- 25% say yes to flowers (LOW CONVERSION)
            step_delay := step_delay + INTERVAL '1 minute';
            IF i % 4 = 0 THEN
              INSERT INTO setup_flow_events (memorial_id, event_type, decision, metadata, created_at)
              VALUES (m_id, 'decision', 'flowers_yes', jsonb_build_object('device_type', device), NOW() - INTERVAL '30 days' + (i || ' hours')::INTERVAL + step_delay);
            ELSE
              INSERT INTO setup_flow_events (memorial_id, event_type, decision, metadata, created_at)
              VALUES (m_id, 'decision', 'flowers_no', jsonb_build_object('device_type', device), NOW() - INTERVAL '30 days' + (i || ' hours')::INTERVAL + step_delay);
            END IF;
            
            INSERT INTO setup_flow_events (memorial_id, event_type, step_name, metadata, created_at)
            VALUES (m_id, 'step_complete', 'flowers', jsonb_build_object('device_type', device), NOW() - INTERVAL '30 days' + (i || ' hours')::INTERVAL + step_delay);
            
            -- STEP 6: CLEANING (34 start)
            INSERT INTO setup_flow_events (memorial_id, event_type, step_name, metadata, created_at)
            VALUES (m_id, 'step_view', 'cleaning', jsonb_build_object('device_type', device), NOW() - INTERVAL '30 days' + (i || ' hours')::INTERVAL + step_delay);
            
            -- 15% say yes to cleaning (VERY LOW CONVERSION)
            step_delay := step_delay + INTERVAL '1 minute';
            IF i % 7 = 0 THEN
              INSERT INTO setup_flow_events (memorial_id, event_type, decision, metadata, created_at)
              VALUES (m_id, 'decision', 'cleaning_yes', jsonb_build_object('device_type', device), NOW() - INTERVAL '30 days' + (i || ' hours')::INTERVAL + step_delay);
            ELSE
              INSERT INTO setup_flow_events (memorial_id, event_type, decision, metadata, created_at)
              VALUES (m_id, 'decision', 'cleaning_no', jsonb_build_object('device_type', device), NOW() - INTERVAL '30 days' + (i || ' hours')::INTERVAL + step_delay);
            END IF;
            
            INSERT INTO setup_flow_events (memorial_id, event_type, step_name, metadata, created_at)
            VALUES (m_id, 'step_complete', 'cleaning', jsonb_build_object('device_type', device), NOW() - INTERVAL '30 days' + (i || ' hours')::INTERVAL + step_delay);
            
            -- COMPLETION (all who reached cleaning complete)
            INSERT INTO setup_flow_events (memorial_id, event_type, metadata, created_at)
            VALUES (m_id, 'completion', jsonb_build_object('device_type', device), NOW() - INTERVAL '30 days' + (i || ' hours')::INTERVAL + step_delay);
          END IF;
        END IF;
      END IF;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Test data created: 50 families, ~68%% completion rate, 25%% flower conversion, 15%% cleaning conversion';
END $$;

-- Verify data
SELECT 
  event_type,
  step_name,
  COUNT(*) as count,
  COUNT(DISTINCT memorial_id) as unique_memorials
FROM setup_flow_events
GROUP BY event_type, step_name
ORDER BY event_type, step_name;

-- Expected results:
-- step_view basics: 50 unique memorials
-- step_complete basics: 48 unique memorials (95% conversion)
-- step_view first-memory: 48 unique memorials
-- step_complete first-memory: 40 unique memorials (83% conversion) ⚠️ DROP-OFF
-- step_view preview: 40 unique memorials
-- step_complete preview: 38 unique memorials (95% conversion)
-- step_view invite-family: 38 unique memorials
-- decision invite_yes: ~34 (90%)
-- decision invite_no: ~4 (10%)
-- step_view flowers: ~34 unique memorials
-- decision flowers_yes: ~8 (25%) ⚠️ LOW CONVERSION
-- decision flowers_no: ~26 (75%)
-- step_view cleaning: ~34 unique memorials
-- decision cleaning_yes: ~5 (15%) ⚠️ VERY LOW CONVERSION
-- decision cleaning_no: ~29 (85%)
-- completion: ~34 unique memorials (68% overall completion)
