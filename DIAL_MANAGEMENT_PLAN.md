# Dial Management Feature - Requirements & Planning

## Current State Analysis

### What Exists
1. **Types** - `DialSettings` interface defined in `lib/dial/types.ts` with all dial parameters:
   - `preset`: laser, scholar, builder, strategist, socratic, brainstorm, pm, analyst
   - Numeric dials: depth (0-5), breadth (0-5), verbosity (0-5), creativity (0-5), risk_tolerance (0-5), evidence_strictness (0-5), browse_aggressiveness (0-5), clarifying_threshold (0-1), self_consistency_n (1-7), token_budget (integer)
   - Enums: reasoning_exposure (none/brief/outline), output_format (markdown/json/hybrid)

2. **Kernel** - `lib/dial/kernel.ts` contains comprehensive documentation of dial semantics (Section C) and all presets

3. **API Route** - `app/api/dial/route.ts` accepts `userGoal` and `state` but does NOT:
   - Accept dial parameters in request body
   - Pass dials to kernel prompt
   - Return selected dial values to client

4. **UI Components** - `components/dial/left-panel.tsx` has:
   - Model selector dropdown
   - Prompt textarea
   - No dial/preset selector

### What's Missing (Frontend)
1. No dial/preset UI component
2. No state management for dials in DialInterface
3. No passing of dials to API
4. No visualization of dial settings
5. No persistence of dial preferences

### What's Missing (Backend)
1. No dial parameter extraction from request body
2. No passing dials to kernel prompt
3. No dial values in response
4. No defaults applied on server-side

## Key Architecture Points

- The kernel prompt already knows how to interpret dials (documented in lines 155-247 of kernel.ts)
- Dials should be passed in the request body and included in the user prompt to the kernel
- The kernel naturally outputs the effective dials in the response schema
- Presets are just shorthand for specific dial combinations (laser, scholar, builder, strategist, etc.)

## Clarification Questions Needed

Before implementation, the user should clarify:

1. **UI Placement & Pattern**
   - Should dials appear in left panel (with model selector)?
   - Or in a modal/settings dialog?
   - Or in a collapsible section within left panel?
   - Or as a separate settings panel?

2. **Preset vs Individual Dials**
   - Primary interaction: preset dropdown → quickly set multiple dials?
   - Or show individual sliders prominently?
   - Or both (preset dropdown with "show advanced" to reveal individual sliders)?

3. **Progressive Disclosure**
   - Show all dials to all users from start?
   - Hide advanced dials initially, reveal after first use?
   - Show preset dropdown first, expand to individual sliders on click?

4. **Persistence**
   - Per-session only (localStorage)?
   - Saved to user profile (database)?
   - Saveable as custom named presets?
   - Remember last-used settings?

5. **Defaults**
   - Always start with "scholar" preset?
   - Remember user's last settings?
   - User-defined defaults per account?

6. **Scope**
   - Phase 1: Just UI + basic client/server integration?
   - Include Deep Dial interaction (different dials for deep vs standard)?
   - Include history persistence of dials used?

7. **Visual Design**
   - Simple preset dropdown only?
   - Sliders for individual dials?
   - Visual representation of dial values (e.g., gauge)?
   - Tooltip explanations for each dial?

## Implementation Strategy (Conditional on Answers)

Once clarifications are received, implementation will follow this sequence:

### Backend Phase (Steps 1-2)
1. Update `app/api/dial/route.ts`:
   - Extract `dials` parameter from request body
   - Pass dials to kernel in the user prompt
   - Return effective dials in response

2. Optional database changes (if persistence needed):
   - Add dial settings to user profile or separate table

### Frontend Phase (Steps 3-4)
3. Create dial selector component(s):
   - Preset dropdown (base requirement)
   - Optional: Individual slider controls
   - Optional: Collapsible advanced section

4. Update `DialInterface`:
   - Add dials state
   - Pass dials to API request
   - Display returned dials (optional)
   - Implement persistence pattern (if needed)

### Testing & Refinement (Step 5)
5. Verify end-to-end:
   - Dials transmitted correctly
   - Kernel receives and applies dials
   - Prompt synthesis respects dial values
   - UI is intuitive and accessible
