mods = [
    "nohold", "messy", "gravity", "volatile", "doublehole", "invisible", "allspin", "expert"
]
mod_names = [
    "No Hold", "Messier Garbage", "Gravity", "Volatile", "Double Hole", "Invisible", "All-Spin", "Expert"
]
tarot_names = [
    "Temperance", "Wheel of Fortune", "The Tower", "Strength", "The Devil", "The Hermit", "The Magician", "The Emperor"
]

mod_short_to_tarot = {}
mod_to_tarot = {}

for mod_name, mod, tarot in zip(mod_names, mods, tarot_names):
    mod_short_to_tarot[mod] = tarot
    mod_to_tarot[mod_name] = tarot
    mod_short_to_tarot[f"{mod}_reversed"] = tarot
    mod_to_tarot[f"Reversed {mod_name}"] = tarot

mod_combos: dict[str, list[str]] = {}
mod_combos["Standard"] = []

for mod in mods:
    mod_tarot = mod_short_to_tarot[mod]
    mod_combos[mod_tarot] = [mod]
    mod_combos[f"Reversed {mod_tarot}"] = [f"{mod}_reversed"]

mod_combos["Deadlock"] = ["nohold", "doublehole", "messy"]
mod_combos["The Starving Artist"] = ["nohold", "allspin"]
mod_combos["The Grandmaster"] = ["gravity", "invisible"]
mod_combos["The Con Artist"] = ["expert", "volatile", "allspin"]
mod_combos["Divine Mastery"] = ["expert","doublehole","volatile","messy"]
mod_combos["A Modern Classic"] = ["nohold","gravity"]
mod_combos["Emperor's Decadence"] = ["expert", "doublehole", "nohold"]
mod_combos["Swamp Water"] = ['nohold', 'doublehole', 'messy', 'allspin', 'gravity', 'invisible', 'expert', 'volatile']

def modset_allowed(modset: str, options) -> bool:
    if modset == "Swamp Water Lite":
        return modset_allowed("The Magician", options)

    is_reversed = "Reversed" in modset

    for mod in mod_combos[modset]:
        if is_reversed:
            reverse_mod = mod.replace("_reversed", "").strip()

            if not options.allow_reversed_mods:
                return False
            if not (mods.index(reverse_mod) + 2 <= options.highest_floor_discovered):
                return False
            if reverse_mod not in options.reversed_mods_unlocked:
                return False
        else:
            if not (mods.index(mod) + 2 <= options.highest_floor_discovered):
                return False
    

    if len(mod_combos[modset]) == 1 and not is_reversed:
        return options.single_mod_difficulties[mod_combos[modset][0]] > 0
    elif len(mod_combos[modset]) == 1 and is_reversed:
        reverse_mod = mod_combos[modset][0].replace("_reversed", "").strip()
        return options.reverse_mod_difficulties[reverse_mod] > 0
    elif len(mod_combos[modset]) > 1:
        return options.modset_difficulties[modset] > 0

    return True