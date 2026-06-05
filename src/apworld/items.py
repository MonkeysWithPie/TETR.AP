from __future__ import annotations
import math

from BaseClasses import Item, ItemClassification

from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from .world import TetrAPWorld

from .common import modset_allowed, tarot_names, mod_short_to_tarot
from .options import get_achievement_count

ITEM_NAME_TO_ID = {}
ITEM_CLASSES = {
    a: ItemClassification.progression for a in tarot_names
}
for tarot in tarot_names:
    ITEM_NAME_TO_ID[tarot] = len(ITEM_NAME_TO_ID) + 1

for name in tarot_names:
    ITEM_NAME_TO_ID[f"+1km Reversed {name} Progress"] = len(ITEM_NAME_TO_ID) + 1
    ITEM_CLASSES[f"+1km Reversed {name} Progress"] = ItemClassification.filler

    ITEM_NAME_TO_ID[f"Reversed {name}"] = len(ITEM_NAME_TO_ID) + 1
    ITEM_CLASSES[f"Reversed {name}"] = ItemClassification.progression

ITEM_NAME_TO_ID["Achievement"] = len(ITEM_NAME_TO_ID) + 1
ITEM_CLASSES["Achievement"] = ItemClassification.progression

# DISCLAIMER: these are just filler fake items! 
# They do not actually do anything (since that would break the TETR.IO rules)!
filler_items = ["Zen Level", "Mid-Game Clear", "A Garbo High-Five", "ICLY online",
                "\"Did someone say MKO?\"", "Board Size +0", "First On Leaderboard",
                "I4 Piece", "80% of a Pentomino", "Garbage", "360 Degree Rotate"]

for filler_name in filler_items:
    ITEM_NAME_TO_ID[filler_name] = len(ITEM_NAME_TO_ID) + 1
    ITEM_CLASSES[filler_name] = ItemClassification.filler

class TetrAPItem(Item):
    game = "TETR.AP"

def create_filler(world: TetrAPWorld) -> str:
    if (world.random.randint(1, 100) <= world.options.filler_item_boost_rate) and world.options.allow_reversed_mods:
        return f"+1km Reversed {world.random.choice(tarot_names)} Progress"

    return world.random.choice(filler_items)
        
def create_item(world: TetrAPWorld, item_name: str) -> TetrAPItem:
    classification = ITEM_CLASSES[item_name]

    return TetrAPItem(item_name, classification, ITEM_NAME_TO_ID[item_name], world.player)

def create_all_items(world: TetrAPWorld):
    itempool = []

    for tarot in tarot_names:
        if not modset_allowed(tarot, world.options):
            break
        itempool.append(world.create_item(tarot))

        if modset_allowed(f"Reversed {tarot}", world.options):
            itempool.append(world.create_item(f"Reversed {tarot}"))
    
    aches = math.ceil(get_achievement_count(world.options) * world.options.achievement_goal_percentage * 0.01)
    itempool += [world.create_item("Achievement") for _ in range(aches)]

    item_count = len(itempool)
    unfilled_count = len(world.multiworld.get_unfilled_locations(world.player))
    extra_items_needed = unfilled_count - item_count
    filler_needed = math.ceil(extra_items_needed * world.options.filler_item_rate * 0.01)

    itempool += [world.create_item("Achievement") for _ in range(extra_items_needed - filler_needed)]
    itempool += [world.create_item(create_filler(world)) for _ in range(filler_needed)]
    
    world.multiworld.itempool += itempool