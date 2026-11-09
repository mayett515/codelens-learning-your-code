# Dynamic Ontology Game Engine Notes

This document captures the full discussion about using the CodeLens ontology/profile/tag system as the foundation for a dynamic physics-heavy game engine, especially for a JJK-like culling-game simulation where players create expressive abilities and the engine resolves them through tags, subtags, physics states, and boundary rules.

## 2026-05-08 Kortex Core Update

This older game-engine note should now be read through the newer Kortex Core framing.

The strongest version is not "an AI improvises powers during combat." The stronger architecture is:

```text
deterministic game engine
  -> physics, collisions, resources, combat math, event log

Kortex game core / game profile
  -> material states, density states, energy types, ability operations
  -> is / is not boundaries, costs, requirements, targeting rules
  -> branchable character/world overlays
  -> correction and balance evidence
```

Player creativity enters through ontology negotiation:

```text
player describes ability
  -> model proposes ability ontology
  -> system asks boundary questions
  -> player/designer approves is / is not rules
  -> deterministic engine resolves approved ability rules
  -> ambiguous/broken interactions become correction or balance evidence
```

This keeps the game expressive without letting the LLM decide every runtime event. Kortex owns the
semantic ability contract; the engine owns deterministic resolution.

## Original Idea

The core idea is to take the existing ontology/profile system and use it as the semantic engine for a game simulation.

The game would have:

- tags
- subtags
- ontology categories
- material states
- density states
- physics states
- player abilities
- behavioral questions during character creation
- dynamic ability resolution during the simulation

The user described wanting a game engine with physics and a culling-game style structure, inspired by JJK-like ability systems. The important part is that abilities should not be hardcoded as simple scripts only. Instead, the abilities should be described through a structured ontology of tags/subtags/categories, and those tags should dynamically affect how the game simulation behaves.

The user also raised the idea that players could express their character at the start of the simulation, answer questions about behavior and ability boundaries, and then the system would adjust the player's ability tags and subtags in real time so that the whole simulation can run dynamically.

## How The Existing Ontology System Maps To A Game Engine

The ontology system is not just a tag list. It is a rule language for meaning.

In the CodeLens architecture, there is a reusable engine and then a domain profile that owns the meaning system.

For a game engine, this maps cleanly:

```text
Game engine
  entities
  physics simulation
  combat resolver
  abilities
  effects
  events
  graph/state storage

Game ontology profile
  material categories
  density categories
  energy categories
  body/soul/status categories
  ability categories
  relationship/effect types
  boundary rules
  metadata fields
```

So instead of hardcoding every ability manually, the world is defined through ontology nodes.

Example ontology categories:

```text
Material State
  solid
  liquid
  gas
  plasma
  biological
  cursed/energy-infused
  constructed
  void/space

Density State
  vacuum
  low_density
  normal_density
  high_density
  compressed
  collapsed

Ability Operation
  create
  destroy
  transform
  compress
  expand
  bind
  repel
  attract
  cut
  seal
  invert
  copy
  amplify
```

Then an ability is not only code. It is structured metadata plus rules.

Example:

```text
Ability: Pressure Lance
Operation: compress + accelerate
Targets: gas, low_density, normal_density
Produces: high_density projectile
Requires: surrounding air
Scaling: density_delta * energy_input
Fails when: vacuum, sealed_space, anti-compression field
```

The important point is that tags and subtags become selectors and constraints.

A player ability can define:

```text
Can affect:
  materialState: gas | liquid
  densityState: low_density | normal_density

Can transform into:
  densityState: compressed

Cannot affect:
  materialState: solid
  protectedBy: spatial_lock
```

Then the engine resolves interactions dynamically:

```text
Entity has:
  materialState = gas
  densityState = low_density
  temperature = 20
  pressure = 1

Ability applies:
  operation = compress
  energyInput = 50

Engine computes:
  density increases
  pressure increases
  projectile possible
  damage / recoil / area effect derived from physics rules
```

## The JJK-Like Culling Game Interpretation

For a JJK-like culling-game structure, this becomes a rules-heavy battle sandbox where every fighter's technique is described through ontology categories instead of one-off scripts.

The interesting part is that two abilities can interact because their tags share meaning.

Example:

```text
Player A: Gravity Well
Operation: attract
Affects: mass, density, trajectory

Player B: Hollow Body
Material State: biological
Density State: low_density
Special Rule: mass decoupled from visible body
```

The resolver can reason:

```text
Gravity Well targets mass.
Hollow Body reduces effective mass.
So attraction is weakened unless Gravity Well has soul_targeting or space_targeting.
```

That is the key architecture: separate numeric physics from semantic ontology.

Physics should still be real code and math:

```text
mass
velocity
acceleration
density
pressure
temperature
force
collision
impulse
energy
```

Ontology decides which rules apply.
Physics computes how strong the result is.

## Core Engine Shape

A strong implementation would separate stable engine types from profile-owned ontology.

Stable engine types:

```text
GameEntity
PhysicsBody
Ability
Effect
Rule
OntologyNode
CombatEvent
ResolverContext
```

Profile-owned ontology:

```text
material states
density states
energy states
targeting types
ability operations
status effects
relationship types
boundary rules
```

The same principle from the CodeLens docs applies: dynamic does not mean chaos. A model or designer may suggest new tags/subtags, but the durable game ontology should be approved and validated. That matters heavily for balance.

So the strongest version of the idea is:

```text
A deterministic physics/combat engine
plus
A profile-owned ontology describing the world's categories
plus
Abilities expressed as transformations over those categories
plus
An ontology checker that finds missing rules, broken categories, and balance edge cases
```

That could become a flexible ability engine where players can invent techniques, but the system still has structure, validation, and consistent physics.

## The Important "Is / Is Not" Mechanism

The user asked about the "what it is not" thing.

In the CodeLens ontology docs, this is represented by `doNotUseWhen` and boundary rules.

For a game engine, this becomes negative capability definition.

Example:

```text
Ability: Blood Thread
Is:
  material manipulation
  biological-fluid control
  binding / slicing

Is not:
  metal manipulation
  pure telekinesis
  soul damage
  spatial cutting
```

That "is not" part is not flavor. It prevents the engine from over-applying an ability.

Example:

```text
Player says:
"My character controls blood threads and can slice things."

Engine might classify:
  operation: manipulate
  material: biological_fluid
  form: thread
  effects: bind, cut

Boundary rules:
  do not treat this as controlling all liquids
  do not treat this as controlling metal wires
  do not treat this as spatial cutting
  do not bypass armor unless a piercing/pressure rule exists
```

So yes, during character creation, the player can express the character naturally, then the system asks targeted questions to sharpen the ontology.

Example flow:

```text
Player: I control shadows and make blades from them.

System:
1. Are the shadows physical matter, cursed energy, or spatial absence?
2. Can the blades cut normal objects, souls, energy barriers, or only living targets?
3. Do they need existing light/shadow conditions?
4. What can they definitely not affect?
5. What is the cost: stamina, energy, cooldown, sacrifice, condition?
```

Each answer adjusts tags/subtags in real time:

```text
materialState: non_material_shadow
energyType: cursed_energy
operation: construct + cut
targeting: physical_body
requires: ambient_shadow
cannotAffect: soul, sealed_domain, pure_light_construct
costModel: energy_drain
```

Then the simulation can run dynamically because every event uses those tags.

When an ability hits something, the resolver asks:

```text
Can this ability target this entity?
Is the target excluded by a doNotUseWhen rule?
Do any boundary rules override the normal effect?
What physics/state transformation happens?
What secondary effects emerge?
```

Tiny example:

```text
Ability:
  Shadow Blade
  is: cursed_energy_construct, cutting, shadow_dependent
  is not: soul_cutting, spatial_cutting, metal

Target:
  armored fighter
  material: steel_armor + biological_body
  status: standing_in_bright_light

Result:
  shadow condition is weak
  blade can cut physical matter
  armor applies resistance
  no soul damage
  reduced effect
```

So the system should have both:

```text
useWhen = when this tag/rule applies
doNotUseWhen = when it must not apply
```

That makes player-created powers controllable, balanceable, and explainable.

## Character Creation As Real-Time Ontology Construction

The user asked whether this could happen at the start of the simulation when a player expresses their character and answers behavior questions, so tags/subtags of player abilities are adjusted in real time.

Yes. That is exactly where this system becomes powerful.

The creation flow could be:

```text
Player expresses character
→ model proposes ability ontology
→ system asks boundary questions
→ player confirms "is / is not"
→ engine stores approved tags, subtags, exclusions, costs, conditions
→ simulation resolves combat dynamically from those rules
→ unclear interactions become review questions or rule suggestions
```

In other words, character creation is not just a form. It is ontology negotiation.

The player gives expressive natural language:

```text
My character bends heat into invisible pressure blades.
He is fast but fragile.
He fights by redirecting enemy movement instead of blocking.
His technique becomes unstable in rain.
```

The system extracts candidate ontology:

```text
Ability Family:
  thermal manipulation
  pressure manipulation
  vector redirection

Primary Operations:
  convert_heat_to_pressure
  cut
  redirect
  accelerate

Material/Energy Basis:
  heat_energy
  air_pressure
  kinetic_vector

Strengths:
  invisible attacks
  high-speed dueling
  enemy momentum punishment

Weaknesses:
  rain instability
  fragile body
  poor sustained defense

Boundary Rules:
  not fire generation unless explicitly unlocked
  not true telekinesis
  not spatial cutting
  not durable shield creation
```

Then the system asks clarifying questions:

```text
1. Are the pressure blades physical compressed air, heat distortion, or cursed energy shaped like pressure?
2. Can the technique cut through armor, barriers, or only exposed matter?
3. Does rain weaken the heat source, distort targeting, or cancel the technique completely?
4. Can the character redirect all movement, or only movement that enters a radius?
5. What is the cost of overuse?
```

Player answers adjust the profile in real time:

```text
pressureBlade.materialState = compressed_air
pressureBlade.energySource = thermal_gradient
pressureBlade.targeting = physical_matter
pressureBlade.doNotUseWhen = vacuum, heavy_rain, sealed_pressure_field
redirect.requires = incoming_kinetic_vector
redirect.cannotAffect = stationary_targets, soul_motion, spatial_displacement
cost.overuse = body_temperature_drop
```

The result is a playable ability sheet that is also machine-readable.

## Ability Definition Shape

A possible ability schema:

```ts
interface AbilityDefinition {
  id: string;
  name: string;
  description: string;

  tags: OntologyNodeId[];
  subTags: OntologyNodeId[];

  operations: AbilityOperation[];
  targetFilters: TargetFilter[];
  transformations: StateTransformation[];
  costs: AbilityCost[];
  requirements: AbilityRequirement[];
  limitations: BoundaryRule[];

  scaling: ScalingRule[];
  conflicts: ConflictRule[];
  createdFromPlayerAnswers: string[];
}
```

A boundary rule could look like:

```ts
interface BoundaryRule {
  id: string;
  text: string;
  doNotApplyWhen: Condition[];
  preferRuleId?: string;
  evidenceIds: string[];
}
```

Example ability instance:

```json
{
  "id": "ability_shadow_blade",
  "name": "Shadow Blade",
  "tags": ["cursed_energy_construct", "cutting", "shadow_dependent"],
  "subTags": ["physical_cut", "ambient_shadow_required"],
  "operations": ["construct", "cut"],
  "targetFilters": [
    { "materialState": ["solid", "biological"] }
  ],
  "requirements": [
    { "condition": "ambient_shadow_present" }
  ],
  "limitations": [
    {
      "text": "Do not treat Shadow Blade as soul cutting unless the player explicitly unlocks soul targeting.",
      "doNotApplyWhen": ["target_is_soul_only"]
    },
    {
      "text": "Do not treat Shadow Blade as spatial cutting; armor and physical barriers still apply resistance.",
      "doNotApplyWhen": ["requires_spatial_bypass"]
    }
  ],
  "scaling": [
    { "stat": "cursed_energy_output", "affects": "cutting_force" },
    { "stat": "shadow_density", "affects": "construct_stability" }
  ]
}
```

## Runtime Combat Resolution

At runtime, the engine should not ask the LLM to decide everything. The LLM is useful for setup, explanation, and suggesting ontology changes. But the actual simulation should be deterministic and inspectable.

The combat resolver can work like this:

```text
1. Receive action: player uses ability on target.
2. Load ability ontology tags/subtags.
3. Load target physical state and semantic state.
4. Check requirements.
5. Check doNotUseWhen / boundary rules.
6. Resolve conflicts with target defenses.
7. Apply physics formulas.
8. Apply state transformations.
9. Emit combat events.
10. If interaction is ambiguous, create a review question or rule suggestion.
```

Example:

```text
Action:
  Shadow Blade hits armored fighter.

Ability tags:
  cursed_energy_construct
  cutting
  shadow_dependent
  physical_cut

Ability boundaries:
  not soul_cutting
  not spatial_cutting
  armor applies

Target states:
  biological_body
  steel_armor
  standing_in_bright_light

Resolver:
  ambient shadow is weak
  cutting force reduced
  steel armor resistance applies
  no soul damage
  physical scratch or blocked hit depending on force vs resistance
```

## Why "Is Not" Is Essential

The most important design idea from this whole discussion is:

Every power needs positive meaning and negative boundaries.

Without "what it is not," a dynamic ability system becomes broken immediately.

If a player says:

```text
I control blood.
```

The engine must not accidentally allow:

```text
control all liquids
control water in the ocean
control metal with iron content
instantly kill anyone from inside
bypass every defense
```

Unless those capabilities were explicitly defined, paid for, balanced, and approved.

So the system needs:

```text
is:
  what the ability really does

is not:
  what the ability must not be treated as

requires:
  what must be true for it to work

cannot affect:
  targets or states it cannot touch

costs:
  what the player pays

scaling:
  which stats increase effect strength

failure modes:
  what happens when conditions are bad
```

This gives the game designer and simulation engine control without killing player creativity.

## Final Architecture Summary

The game should be built as:

```text
Deterministic engine
  physics
  state updates
  conflict resolution
  damage/effect math

Ontology profile
  material states
  density states
  energy types
  ability operations
  targeting rules
  status effects
  boundary rules

Player creation layer
  natural-language character expression
  model-assisted tag/subtag proposal
  clarification questions
  is/is-not boundaries
  approved ability sheet

Runtime simulation
  entities have physical + semantic state
  abilities transform state through rules
  boundary rules prevent overreach
  unclear cases become review prompts
```

The core idea is not simply "AI makes powers." The core idea is:

```text
AI helps translate expressive player intent into a validated ontology.
The game engine uses that ontology to run a consistent simulation.
```

That is the difference between a chaotic improvisation system and a real dynamic game engine.
