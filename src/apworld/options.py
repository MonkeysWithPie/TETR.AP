from dataclasses import dataclass
import math
from typing import List

from Options import Choice, OptionCounter, OptionGroup, OptionSet, PerGameCommonOptions, Range, Toggle
from .common import mods, mod_combos, modset_allowed, tarot_names, mod_short_to_tarot

class HighestFloorDiscovered(Range):
    """
    The highest floor you've reached (without rando) in TETR.IO.
    Used to determine which tarot cards to use (if any). This does not affect difficulty.
    """

    display_name = "Highest Floor Discovered"
    range_start = 1
    range_end = 10
    default = 10

class ReversedModsUnlocked(OptionSet):
    """
    Which reversed mods you have unlocked (without rando) in TETR.IO.
    Used to determine which reversed mods to randomize (if any).
    """

    display_name = "Reversed Mods Unlocked"
    valid_keys = mods
    default = mods

class AchievementGoalPercentage(Range):
    """
    The percentage of findable achievement checks that must be obtained to win the game.
    """

    display_name = "Achievement Goal Percentage"
    range_start = 1
    range_end = 100
    default = 70

class CheckStyle(Choice):
    """
    How many checks are earned for each mod and modset.
    Vanilla: Unmodded runs behave as "All". Modded runs behave as "Ranks".
    Ranks: Each mod/modset has 5 checks, based on Achievement rank floors (3,5,7,9,10).
    All: Each mod/modset gives 1 check per floor.
    """

    display_name = "Check Style"
    option_vanilla = 0
    option_ranks = 1
    option_all = 2
    default = 0

class AllowReversedMods(Toggle):
    """
    Allow reversed mods to be randomized.
    """

    display_name = "Reversed Mods"

class ReverseModHeightRequirement(Range):
    """
    The total height required to unlock reversed mods.
    Turning this setting on will require both the reversed mod check and the height requirement to play reverse mods.
    """

    display_name = "Reverse Mod Height Requirement"
    range_start = 0
    range_end = 50000
    default = 0


class UnmoddedDifficulty(Range):
    """
    Highest floor to randomize for unmodded runs.
    """

    display_name = "Unmodded Difficulty"
    range_start = 1
    range_end = 10
    default = 10

class SingleModDifficulties(OptionCounter):
    """
    Highest floor to randomize for each standard mod. Set to 0 to disable the mod.
    """

    display_name = "Single Mod Difficulties"
    valid_keys = mods
    default = {mod: 7 for mod in mods}

class ReverseModDifficulties(OptionCounter):
    """
    Highest floor to randomize for each reversed mod.
    """

    display_name = "Reverse Mod Difficulties"
    valid_keys = mods
    default = {mod: 3 for mod in mods}

NON_SINGLE_MODSETS = [modset for modset in mod_combos if len(mod_combos[modset]) > 1]
NON_SINGLE_MODSETS.append("Swamp Water Lite")

class ModsetDifficulties(OptionCounter):
    """
    Highest floor to randomize for each modset. Set to 0 to disable the modset.
    """

    display_name = "Modset Difficulties"
    valid_keys = NON_SINGLE_MODSETS
    min = 0
    max = 10
    default = {
        "Deadlock": 7,
        "The Starving Artist": 7,
        "The Grandmaster": 7,
        "The Con Artist": 5,
        "Divine Mastery": 5,
        "A Modern Classic": 7,
        "Emperor's Decadence": 5,
        "Swamp Water": 3,
        "Swamp Water Lite": 5
    }

class FillerItemRate(Range):
    """
    The percentage chance of filler items replacing non-essential Achievement checks.
    """

    display_name = "Filler Item Rate"
    range_start = 0
    range_end = 100
    default = 80

class FillerItemBoostRate(Range):
    """
    The percentage chance that a filler item will give you reversed mod height progress.
    Only enabled when reversed mods are allowed.
    """

    display_name = "Filler Item Boost Rate"
    range_start = 0
    range_end = 100
    default = 50

# TODO maybe filler item boost amount?


@dataclass
class TetrAPOptions(PerGameCommonOptions):
    highest_floor_discovered: HighestFloorDiscovered
    allow_reversed_mods: AllowReversedMods
    achievement_goal_percentage: AchievementGoalPercentage
    check_style: CheckStyle
    reversed_mods_unlocked: ReversedModsUnlocked
    reverse_mod_height_requirement: ReverseModHeightRequirement

    unmodded_difficulty: UnmoddedDifficulty
    single_mod_difficulties: SingleModDifficulties
    reverse_mod_difficulties: ReverseModDifficulties
    modset_difficulties: ModsetDifficulties

    filler_item_rate: FillerItemRate
    filler_item_boost_rate: FillerItemBoostRate

option_groups = [
    OptionGroup(
        "Core",
        [
            HighestFloorDiscovered,
            ReversedModsUnlocked,
            AchievementGoalPercentage,
            CheckStyle,
            AllowReversedMods,
            ReverseModHeightRequirement
        ]
    ),
    OptionGroup(
        "Difficulty",
        [
            UnmoddedDifficulty,
            SingleModDifficulties,
            ReverseModDifficulties,
            ModsetDifficulties
        ]
    ),
    OptionGroup(
        "Filler Items",
        [
            FillerItemRate,
            FillerItemBoostRate
        ]
    )
]

def get_check_count(options: TetrAPOptions) -> int:
    def clamp(num, min_num: int, max_num: int):
        return max(min(num, max_num), min_num)

    def count_ranks(num):
        ranks = [3,5,7,9,10]
        count = 0
        for rank in ranks:
            if num >= rank:
                count += 1
        return count
    def count_all(num):
        return clamp(num, 2, 10) - 1
        

    checks = 0
    
    if options.check_style == CheckStyle.option_ranks:
        checks += count_ranks(options.unmodded_difficulty)
    else:
        checks += count_all(options.unmodded_difficulty)
    
    for mod in mods:
        if not modset_allowed(mod_short_to_tarot[mod], options):
            continue

        if options.check_style == CheckStyle.option_all:
            checks += count_all(options.single_mod_difficulties[mod])
        else:
            checks += count_ranks(options.single_mod_difficulties[mod])
    
    for mod in options.reversed_mods_unlocked:
        if not modset_allowed(f"Reversed {mod_short_to_tarot[mod]}", options):
            continue

        if options.check_style == CheckStyle.option_all:
            checks += count_all(options.reverse_mod_difficulties[mod])
        else:
            checks += count_ranks(options.reverse_mod_difficulties[mod])

    for modset in mod_combos:
        if len(mod_combos[modset]) <= 1 or not modset_allowed(modset, options):
            continue
        
        if options.check_style == CheckStyle.option_all:
            checks += count_all(options.modset_difficulties[modset])
        else:
            checks += count_ranks(options.modset_difficulties[modset])

    if modset_allowed("Swamp Water Lite", options):
        if options.check_style == CheckStyle.option_all:
            checks += count_all(options.modset_difficulties["Swamp Water Lite"])
        else:
            checks += count_ranks(options.modset_difficulties["Swamp Water Lite"])

    return checks

def get_achievement_count(options: TetrAPOptions) -> int:
    aches = get_check_count(options)

    # include tarot card unlocks
    for mod in mods:
        if not modset_allowed(mod_short_to_tarot[mod], options):
            continue
        
        aches -= 1
        if modset_allowed(f"Reversed {mod_short_to_tarot[mod]}", options):
            aches -= 1

    return aches