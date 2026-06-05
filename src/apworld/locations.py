from __future__ import annotations

from BaseClasses import ItemClassification, Location

from . import items
from .common import mod_combos, modset_allowed, mod_short_to_tarot
from .options import CheckStyle 

from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from .world import TetrAPWorld

LOCATION_NAME_TO_ID = {}

idx = 0
for modset in mod_combos:
    for floor in range (2, 11):
        LOCATION_NAME_TO_ID[f"Floor {floor} Reached ({modset})"] = floor + idx*100
    idx += 1

for floor in range (2, 11):
    LOCATION_NAME_TO_ID[f"Floor {floor} Reached (Swamp Water Lite)"] = floor + idx*100

class TetrAPLocation(Location):
    game = "TETR.AP"

def get_location_names_with_ids(location_names: list[str]) -> dict[str, int | None]:
    return {location_name: LOCATION_NAME_TO_ID[location_name] for location_name in location_names}

def create_locations(world: TetrAPWorld):
    if (world.options.check_style == CheckStyle.option_all):
        floor_goals = list(range(2, 11))
        std_goals = floor_goals
    elif (world.options.check_style == CheckStyle.option_ranks): 
        floor_goals = [3,5,7,9,10]
        std_goals = floor_goals
    else:
        floor_goals = [3,5,7,9,10]
        std_goals = list(range(2, 11))
    
    def add_loc(modset, diffs, goals = floor_goals, set_diff = None):
        if not modset_allowed(modset, world.options):
            return

        locations = []
        for floor in goals:
            if floor > diffs[set_diff or modset]:
                break
            locations.append(f"Floor {floor} Reached ({modset})")

        world.get_region(modset).add_locations(get_location_names_with_ids(locations), TetrAPLocation)

    add_loc("Standard", { "Standard": world.options.unmodded_difficulty }, std_goals)

    for modset in mod_combos:
        if modset == "Standard":
            continue

        if len(mod_combos[modset]) == 1 and "reversed" in mod_combos[modset][0]:
            reverse_mod = mod_combos[modset][0].replace("_reversed", "").strip()

            add_loc(modset, world.options.reverse_mod_difficulties, set_diff=reverse_mod)
        
        elif len(mod_combos[modset]) == 1:
            add_loc(modset, world.options.single_mod_difficulties, set_diff=mod_combos[modset][0])
        
        else:
            add_loc(modset, world.options.modset_difficulties)
    
    add_loc("Swamp Water Lite", world.options.modset_difficulties)