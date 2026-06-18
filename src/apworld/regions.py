from __future__ import annotations

from BaseClasses import Entrance, Region
from .common import mod_combos

from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from .world import TetrAPWorld

def create_and_connect_regions(world: TetrAPWorld):
    create_regions(world)
    connect_regions(world)

def create_regions(world: TetrAPWorld):
    regions = []

    regions.append(Region("Menu", world.player, world.multiworld))

    for modset in mod_combos:
        regions.append(Region(f"{modset}", world.player, world.multiworld))

    regions.append(Region("Swamp Water Lite", world.player, world.multiworld))

    world.multiworld.regions += regions

def connect_regions(world: TetrAPWorld):
    menu = world.get_region("Menu")

    for modset in mod_combos:
        menu.connect(world.get_region(modset), f"{modset} Unlock")
    
    menu.connect(world.get_region("Swamp Water Lite"), "Swamp Water Lite Unlock")