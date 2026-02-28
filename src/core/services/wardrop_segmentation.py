import os
import numpy as np
import onnxruntime as ort
import cv2
from PIL import Image

from core.services.segmentation_labels import SEGFORMER_LABELS
from core.logger import logger
from core.settings import settings


class ClothesSegmentator():
    def __init__(self, 
                 model_path: str = settings.seg_weights,
                 use_gpu: bool = True,
                 ):

        self.background = "transparent"  # "transparent" | "white"
        if use_gpu:
            providers = ["CUDAExecutionProvider", "CPUExecutionProvider"]
        else:
            providers = ["CPUExecutionProvider"]

        self.ort_session = ort.InferenceSession(
            model_path,
            providers=providers
        )

        self.onnx_input_name = self.ort_session.get_inputs()[0].name
        logger.info(f"available ONNX providers: {ort.get_available_providers()}")


    def preprocess(
            self, 
            image_path: str,
            height = 512,
            width = 512,
            rescale_factor = 0.00392156862745098,  # 1/255
            mean = np.array([0.485, 0.456, 0.406], dtype=np.float32),
            std = np.array([0.229, 0.224, 0.225], dtype=np.float32),
            ):
        '''
        segformer_b3_clothes / preprocessor_config.json
        '''
        image = Image.open(image_path).convert("RGB")
        image = image.resize(
            (width, height),
            resample=Image.Resampling.BILINEAR
        )

        image = np.array(image).astype(np.float32)
        image = image * rescale_factor
        image = (image - mean) / std

        image = np.transpose(image, (2, 0, 1))
        image = np.expand_dims(image, axis=0)

        return image

    def postprocess(
            self,
            logits,
            original_np: np.array,
            class_ids: list,
            pad: int = 20,
        ):

        orig_h, orig_w = original_np.shape[:2]

        logits = logits[0]  # (C, H, W)
        logits = np.transpose(logits, (1, 2, 0))

        logits_resized = cv2.resize(
            logits,
            (orig_w, orig_h),
            interpolation=cv2.INTER_LINEAR
        )

        logits_resized = np.transpose(logits_resized, (2, 0, 1))
        pred = np.argmax(logits_resized, axis=0)

        mask = np.zeros_like(pred, dtype=np.uint8)
        for cls_id in class_ids:
            mask |= (pred == cls_id)

        if mask.sum() == 0:
            return

        ys, xs = np.where(mask == 1)
        y0, y1 = ys.min(), ys.max()
        x0, x1 = xs.min(), xs.max()

        y0 = max(0, y0 - pad)
        x0 = max(0, x0 - pad)
        y1 = min(orig_h, y1 + pad)
        x1 = min(orig_w, x1 + pad)

        image_crop = original_np[y0:y1, x0:x1]
        mask_crop = mask[y0:y1, x0:x1]

        if self.background == "transparent":
            alpha = (mask_crop * 255).astype(np.uint8)
            rgba = np.dstack([image_crop, alpha])
            result = Image.fromarray(rgba, mode="RGBA")

        elif self.background == "white":
            white_bg = np.ones_like(image_crop, dtype=np.uint8) * 255
            white_bg[mask_crop == 1] = image_crop[mask_crop == 1]
            result = Image.fromarray(white_bg, mode="RGB")

        else:
            raise ValueError("background must be 'transparent' or 'white'")
    
        return result

    def save_segmented_clothing(
            self,
            category: str,
            image_path: str,
            output_path: str,
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

        original_image = Image.open(image_path).convert("RGB")
        original_np = np.array(original_image)
        

        model_input = self.preprocess(image_path)

        # --- Inference ---
        logits = self.ort_session.run(
            None,
            {self.onnx_input_name: model_input}
        )[0]  # (1, C, H, W)

        result = self.postprocess(
            logits,
            original_np,
            class_ids,
            pad,
            )
        
        if result is None:
            logger.warning("No pixels found for selected class")
            return
        
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