from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # access_token: str

    data_root_path: str = "app/data"
    df_path: str = "app/data/Cost_per_use_2025.csv"

    model_config = SettingsConfigDict(env_file='.env', extra='allow')


settings = Settings()