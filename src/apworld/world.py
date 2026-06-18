import math

from worlds.AutoWorld import World

from . import web_world, regions, locations, rules, options, items
from . import options as tetr_ap_options

class TetrAPWorld(World):
    """
    TETR.IO is an online multiplayer Tetris-like game.
    TETR.AP randomizes achievements and tarot unlocks.
    """

    game = "TETR.AP"

    web = web_world.TetrAPWebWorld()

    options_dataclass = tetr_ap_options.TetrAPOptions
    options: tetr_ap_options.TetrAPOptions # type: ignore


    def fill_slot_data(self):
        return {
            "goal_count": math.ceil(options.get_achievement_count(self.options) * self.options.achievement_goal_percentage * 0.01),
            "reverse_height": self.options.reverse_mod_height_requirement.value,
            "check_style": self.options.check_style.value,
        }
    
    location_name_to_id = locations.LOCATION_NAME_TO_ID
    item_name_to_id = items.ITEM_NAME_TO_ID

    def create_regions(self):
        regions.create_and_connect_regions(self)
        locations.create_locations(self)
    
    def set_rules(self):
        rules.set_all_rules(self)
    
    def create_items(self):
        items.create_all_items(self)
    
    def create_item(self, name: str) -> items.TetrAPItem:
        return items.create_item(self, name)
    
    def get_filler_item_name(self) -> str:
        return items.create_filler(self)