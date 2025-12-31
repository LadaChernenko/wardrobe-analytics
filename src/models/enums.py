# src/models/enums.py
from enum import Enum

class CategoryEnum(str, Enum):
    skirt = "Skirt"
    upper_clothes = "Upper-clothes"
    pants = "Pants"
    dress = "Dress"
    bag = "Bag"
    hat = "Hat"
    shoes = "Shoes"
    sunglasses = "Sunglasses"
    belt = "Belt"
    scarf = "Scarf"



class SeasonEnum(str, Enum):
    winter = "winter"
    summer = "summer"
    off_season = "off-season"

