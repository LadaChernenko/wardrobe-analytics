# Pet-project Wardrobe Analyzer

**Wardrobe Analytics** — сервис для учета и анализа гардероба. Пользователи добавляют вещи с фото и характеристиками, сервис автоматически сегментирует одежду. Логи ношения позволяют получать статистику по использованию, cost per use и распределению по категориям, сезонам и стилям. 

```
wardrobe_api/
├── data
│   ├── Cost_per_use_2025.csv
│   └── garments
│       ├── MP002XW09L2Z_15257329_1_v5.webp
│       ├── MP002XW0APXS_15958912_1_v2_2x.webp
│       ├── MP002XW0BOFD_16459206_1_v1_2x.webp
│       └── XD001XW00YDP_25041029_1_v1_2x.webp
├── docker
│   ├── dbdata
│   ├── docker-compose.yml
│   └── Dockerfile
├── src
│   ├── alembic
│   ├── api
│   ├── core
│   ├── scripts
│   ├── models
│   ├── schemas
│   ├── main.py
│   └── static
├── model_weights
│   └── segformer_b3_clothes.onnx
├── requirements_hard.txt
├── requirements.txt
└── README.md
```

## Как запустить: 


```bash
sudo docker compose -f ./docker/docker-compose.yml up --build --detach
```

web страница сервиса: `http://localhost:3000/static/index.html`

Как добавить в БД данные из готовой таблицы: 
```bash
sudo docker exec -it wardrobe_main_api_backend python src/scripts/load_items_from_csv.py
```

посмотреть логи: 
```bash
sudo docker logs -f wardrobe_main_api_backend
```

*Спросить у меня про веса модели*
## TODO:

- [ ] 