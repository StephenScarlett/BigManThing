# BigManThing working references

Latest art direction: [docs/FARM_ART_STANDARD.md](docs/FARM_ART_STANDARD.md) governs every asset. Batch 01 is integrated at two art pixels/world unit (64×64 terrain, 64×128 rig) with modular starter choices and rough walking. The earlier low-detail F0 exports are superseded; logical geometry stays unchanged. Retain sources/prompts and manifest/exporter compatibility before expanding clothing or species.

Before making project changes, read:
- [docs/PROJECT_CONTEXT.md](docs/PROJECT_CONTEXT.md) for current intent, observed state, constraints and open definitions.
- [docs/PROJECT_ROADMAP.md](docs/PROJECT_ROADMAP.md) for issue IDs, dependencies and acceptance gates.

README.md and BIGMANTHING_PLAN.md include historical rules. Verify current code and deployed state before relying on them.

After completing authorized work, update the roadmap's status, validation evidence, decision log and next action. Keep vocabulary changes explicit: legacy entity values must already exist in attribute_options for the correct attribute; people-v1 values must exist in the versioned guess_people_vocabulary. Never change an applied rules version in place. Use sourced facts and licensed images; do not invent tags to eliminate feedback collisions.

Treat pending roadmap recommendations as proposals, not fixed user decisions. Preserve the user's latest direction. Keep secrets and personal account data out of these references.


For the implemented people game, also read [docs/GUESS_NAH_IMPLEMENTATION.md](docs/GUESS_NAH_IMPLEMENTATION.md). The owner authorized implementation before playtests in a personal development environment. Keep nominations as drafts until claim/clue review is complete. Existing accounts/history must not be reset as part of content iteration.

The roster/fifth-column direction is in [docs/GUESS_NAH_EXPANSION.md](docs/GUESS_NAH_EXPANSION.md). People-v2 now implements 64 drafts and Letters with new vocabulary/caps; frozen people-v1 editions remain intact. Further changes require additive migrations/rules versions.

The latest owner progression direction is [docs/FARM_AND_HOME_DESIGN.md](docs/FARM_AND_HOME_DESIGN.md): a Stardew-adjacent top-down farm, enterable house, mystery crops/fishing, useful goods, gacha furniture/outfits and bounded house/main-streak coin bonuses. [F0](docs/FARM_PROTOTYPE.md) keeps an isolated `/farm/demo` renderer without account/economic writes. [F1](docs/FARM_PERSISTENCE.md) implements `/farm`: saved character, server-versioned world/house, cosmetic position checkpoints, once-only starter kit and owner/retry/revision guards. Its additive migration is applied to development; never rewrite that migration or frozen v1 layout/choices. Geometry is shared in `packages/shared/src/farm.ts`; frozen DB JSON must match. Run database conservation/isolation, geometry and Playwright checks for changes. [F2](docs/FARM_CROPS.md) adds the two-crop pilot: concealed outcomes, 24-hour server growth, bag/chest goods, confirmed sales and two recovery seeds/Trinidad day. Its development migration is applied; preserve v1 rules and permanent economic receipts. Next is F3 pond fishing; placement, orders, bonuses and the broader proposed species/rates remain future work. Main ranked scores remain independent of collection power. Production art follows [docs/FARM_ASSET_GUIDE.md](docs/FARM_ASSET_GUIDE.md); the older isometric frame/view contract is superseded for future farm art. Preserve the locked economy/history from the implemented [room pilot](docs/REWARDS_AND_ROOMS.md); add versions/migrations rather than rewriting applied semantics. Do not treat client-only scores or device clocks as authoritative reward/growth evidence. Keep hidden seed outcomes out of pre-maturity API responses, and preserve inventory/receipts when adding the farm.
