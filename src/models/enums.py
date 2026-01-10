# src/models/enums.py
from enum import Enum

class CategoryEnum(str, Enum):
    skirt = "skirt"
    upper_clothes = "upper_clothes"
    tops = "tops"
    pants = "pants"
    dress = "dress"
    bag = "bag"
    hat = "hat"
    shoes = "shoes"
    sunglasses = "sunglasses"
    belt = "belt"
    scarf = "scarf"



class SeasonEnum(str, Enum):
    winter = "winter"
    summer = "summer"
    off_season = "off_season"

