from BaseClasses import Tutorial
from worlds.AutoWorld import WebWorld

from .options import option_groups

class TetrAPWebWorld(WebWorld):
    game = "TETR.AP"

    theme = "ice"

    setup_en = Tutorial(
        "Multiworld Setup Guide",
        "A guide to setting up TETR.AP for MultiWorld.",
        "English",
        "setup_en.md",
        "setup/en",
        ["MonkeysWithPie"]
    )

    install_en = Tutorial(
        "TETR.AP Installation Guide",
        "A guide to installing TETR.AP.",
        "English",
        "install_en.md",
        "install/en",
        ["MonkeysWithPie"]
    )

    tutorials = [setup_en, install_en]

    option_groups = option_groups