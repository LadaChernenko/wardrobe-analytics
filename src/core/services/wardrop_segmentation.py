import os
import numpy as np
import torch
import torch.nn.functional as F
from PIL import Image
from transformers import AutoFeatureExtractor, SegformerForSemanticSegmentation

from core.services.segmentation_labels import SEGFORMER_LABELS
from core.logger import logger


class ClothesSegmentator():
    def __init__(self, 
                 model_name: str = "mattmdjaga/segformer_b2_clothes"
                 ):
        self.extractor = AutoFeatureExtractor.from_pretrained(
            model_name
            )
        self.model = SegformerForSemanticSegmentation.from_pretrained(
            model_name
        )
        self.model.eval()


    def save_segmented_clothing(
            self,
            category: str,
            image_path: str,
            output_path: str,
            background: str = "transparent",  # "transparent" | "white"
            pad: int = 20,
        ):
        """
        category: визуальная категория (Upper-clothes, Pants, Skirt, Dress)
        background: тип фона ("transparent" или "white")
        """

        if category not in SEGFORMER_LABELS:
            raise ValueError(f"Unknown segmentation category: {category}")

        class_ids = SEGFORMER_LABELS[category]
        if not class_ids:
            return

        # ──────────────────────────────
        # load image
        # ──────────────────────────────
        image = Image.open(image_path).convert("RGB")
        image_np = np.array(image)

        # ──────────────────────────────
        # segmentation
        # ──────────────────────────────
        inputs = self.extractor(images=image, return_tensors="pt")
        with torch.no_grad():
            outputs = self.model(**inputs)

        logits = outputs.logits
        logits = F.interpolate(
            logits,
            size=image.size[::-1],
            mode="bilinear",
            align_corners=False,
        )

        pred = logits.argmax(dim=1)[0].cpu().numpy()

        # ──────────────────────────────
        # build mask
        # ──────────────────────────────
        mask = np.zeros_like(pred, dtype=np.uint8)
        for cls_id in class_ids:
            mask |= (pred == cls_id)

        if mask.sum() == 0:
            return

        # ──────────────────────────────
        # bbox + padding
        # ──────────────────────────────
        ys, xs = np.where(mask == 1)
        y0, y1 = ys.min(), ys.max()
        x0, x1 = xs.min(), xs.max()

        y0 = max(0, y0 - pad)
        x0 = max(0, x0 - pad)
        y1 = min(image_np.shape[0], y1 + pad)
        x1 = min(image_np.shape[1], x1 + pad)

        image_crop = image_np[y0:y1, x0:x1]
        mask_crop = mask[y0:y1, x0:x1]

        # ──────────────────────────────
        # apply mask + background
        # ──────────────────────────────
        if background == "transparent":
            alpha = (mask_crop * 255).astype(np.uint8)
            rgba = np.dstack([image_crop, alpha])
            result = Image.fromarray(rgba, mode="RGBA")

        elif background == "white":
            white_bg = np.ones_like(image_crop, dtype=np.uint8) * 255
            white_bg[mask_crop == 1] = image_crop[mask_crop == 1]
            result = Image.fromarray(white_bg, mode="RGB")

        else:
            raise ValueError("background must be 'transparent' or 'white'")

        image_name = os.path.splitext(os.path.basename(image_path))[0]
        save_dir = os.path.join(output_path, category)
        os.makedirs(save_dir, exist_ok=True)

        save_path = os.path.join(
            save_dir,
            f"{image_name}_{category}.png"
        )
        try:
            result.save(save_path)
            logger.info(f'segment image saved to: {save_path}')
        except Exception as e:
            logger.error(f'Fail to save segment image: - {e}')


clothes_segmentator = ClothesSegmentator()