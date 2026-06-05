from __future__ import annotations

from rule_builder.options import OptionFilter
from rule_builder.rules import Has, HasAll, Rule, Or

from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from .world import TetrAPWorld

import math
from .common import mod_combos, mod_short_to_tarot, tarot_names
from .options import get_achievement_count

def set_all_rules(world: TetrAPWorld):
    for modset in mod_combos:
        entrance = world.get_entrance(f"{modset} Unlock")

        required_mods = mod_combos[modset]
        if len(required_mods) == 1 and "Reversed" in modset:
            required_mods.append(required_mods[0].replace("_reversed", "").strip())
        
        required_checks = []
        for mod in required_mods:
            if "reversed" in mod:
                required_checks.append(f"Reversed {mod_short_to_tarot[mod.replace('_reversed', '').strip()]}")
            else:
                required_checks.append(mod_short_to_tarot[mod])
            
        world.set_rule(entrance, HasAll(*required_checks))
    
    rules = []
    for tarot in tarot_names:
        required = tarot_names[:] 
        required.remove(tarot)
        rules.append(HasAll(*required))
    world.set_rule(world.get_entrance("Swamp Water Lite Unlock"), Or(*rules))
    
    world.set_completion_rule(Has("Achievement", math.ceil(get_achievement_count(world.options) * world.options.achievement_goal_percentage * 0.01)))