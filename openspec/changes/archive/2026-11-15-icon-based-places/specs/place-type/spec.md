# Spec Delta

## REMOVED Requirements

### Requirement: Single required fixed place type
**Reason**: Replaced by the `place-icon` capability: icon-only storage with primaryType-only frozen inference. No required taxonomy remains.
**Migration**: Existing rows migrate `restaurant→fork`, `café→coffee`, `bakery→croissant`, `bar→cocktail` with no tag backfill; `GET /api/place-types` and the `place_types` table are removed.

### Requirement: Fixed type choice inline
**Reason**: The 4-option required `TypeCombobox` is replaced by the 12-grid icon picker (preselected, never blocking).
**Migration**: Capture and edit use the icon picker; legacy `?placeType=` URLs are ignored.

### Requirement: Predefined type look
**Reason**: Four fixed color+icon looks are replaced by one neutral pin fill with the icon glyph on top plus icon-alone cards.
**Migration**: Map and card rendering read `icon`, not `placeType`.
