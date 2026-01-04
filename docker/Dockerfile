FROM pytorch/pytorch:2.2.0-cuda12.1-cudnn8-runtime

WORKDIR /app

RUN apt-get update && apt-get install -y \
    ffmpeg libsm6 libxext6 poppler-utils \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
COPY requirements_hard.txt .
RUN pip install -r requirements.txt
RUN pip install -r requirements_hard.txt

COPY ./src ./src

ENV PYTHONPATH="/app/src:${PYTHONPATH}"

WORKDIR /app/src

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "6000"]

##--no-cache-dir alembic -c alembic/alembic.ini upgrade head && \