from BaseClasses import Tutorial
from worlds.AutoWorld import WebWorld

from .options import option_groups

class TetrAPWebWorld(WebWorld):
    game = "TETR.IO"

    theme = "ice"

    setup_en = Tutorial(
        "Multiworld Setup Guide",
        "A guide to setting up TETR.IO for MultiWorld.",
        "English",
        "setup_en.md",
        "setup/en",
        ["MonkeysWithPie"]
    )

    tutorials = [setup_en]

    option_groups = option_groups