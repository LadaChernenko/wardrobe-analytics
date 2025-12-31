import os
import csv
from tqdm import tqdm

from core.services.wardrop_segmentation import clothes_segmentator

def segment_clothes_from_csv(
    csv_path: str,
    images_dir: str,
    output_path: str,
):
    """
    csv_path: путь до data/Cost_per_use_2025.csv
    images_dir: папка, где лежат все изображения
    output_path: корневая папка для сегментированных изображений
    """

    with open(csv_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)

        for row in tqdm(reader):
            category = row.get("category")
            style = row.get("style")
            image_name = row.get("image_path")

            if not category or not image_name:
                continue

            image_path = os.path.join(images_dir, image_name)
            if not os.path.exists(image_path):
                continue

            try:
                clothes_segmentator.save_segmented_clothing(
                    image_path=image_path,
                    category=category,
                    output_path=output_path,
                )
            except ValueError as e:
                print(
                    f"Skip {image_name}: {e}"
                )
            except Exception as e:
                print(
                    f"Failed to segment {image_name} "
                    f"(category={category}, style={style}): {e}"
                )


if __name__ == "__main__":
    segment_clothes_from_csv(
        csv_path="/mnt/localssd/projects/wardrobe_analyzer/data/Cost_per_use_2025.csv",
        images_dir="/mnt/localssd/projects/wardrobe_analyzer/data/garments",
        output_path="/mnt/localssd/projects/wardrobe_analyzer/data/segmented",
    )
